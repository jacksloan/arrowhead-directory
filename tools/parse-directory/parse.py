# Setup: python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
# Run:   python parse.py
"""
parse.py — Parse laundromat-bulletin-board.docx into a list of business dicts.

Document structure (discovered by inspection):
- All paragraphs use 'Standard' or 'Normal' Word styles — no Heading styles.
- Major categories: bold, ALL CAPS, short single-line paragraphs
    (e.g. "PERSON TO PERSON", "MISCELLANEOUS SERVICES", "BUILDING AND CONSTRUCTION")
    OR embedded at the end of a mixed paragraph as bold ALL CAPS runs.
- Subcategories: bold, mixed-case, short paragraphs — sometimes standalone,
    sometimes the subcategory is the first bold run in a paragraph that also
    contains non-bold business entries.
- Business entries: non-bold paragraphs with multi-line content (name, address,
    phone, email, website, description), separated by newlines.
- Consecutive non-bold, non-empty paragraphs with no blank-line separator
    belong to the same business (the author sometimes broke a single business
    across multiple paragraphs).
- Empty paragraphs act as business separators.
"""

import json
import re
import sys
from pathlib import Path
from docx import Document


# ── helpers ──────────────────────────────────────────────────────────────────

def normalize_phone(raw: str | None) -> str | None:
    if not raw:
        return None
    digits = re.sub(r"\D", "", raw)
    if len(digits) == 10:
        return f"{digits[:3]}-{digits[3:6]}-{digits[6:]}"
    if len(digits) == 11 and digits[0] == "1":
        d = digits[1:]
        return f"{d[:3]}-{d[3:6]}-{d[6:]}"
    return raw.strip() or None


def normalize_url(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    if not raw:
        return None
    if not raw.startswith("http"):
        return f"https://{raw}"
    return raw


# Regex patterns — note: use [ .\-] (space/dot/dash) NOT \s to avoid matching across newlines
PHONE_RE = re.compile(r"(\(?\d{3}\)?[ .\-]\d{3}[ .\-]\d{4})")
EMAIL_RE = re.compile(r"[\w.\-+]+@[\w.\-]+\.\w+")
URL_RE = re.compile(
    r"\bhttps?://\S+|"  # explicit http/https URLs first (greedy)
    r"\bwww\.[\w\-]+\.[\w.]+(?:/\S*)?|"  # www. prefix
    r"\b(?:[\w\-]+\.)+(?:com|net|org|us|info|biz|co|io|site|me|app|gov|edu|mn)(?:/\S*)?\b"  # bare domains (multi-part ok)
)


def parse_business_text(text: str) -> dict:
    """
    Parse a single business entry block (may be multi-line) into a structured dict.
    Lines are separated by newlines; extracts phones, email, website via regex.
    """
    phone_matches = list(PHONE_RE.finditer(text))
    email_match = EMAIL_RE.search(text)

    # Find URL but exclude URLs that are part of email addresses
    url_match = None
    for m in URL_RE.finditer(text):
        # Skip if this looks like the domain part of an email (preceded by @)
        start = m.start()
        if start > 0 and text[start - 1] == "@":
            continue
        if "@" in m.group():
            continue
        url_match = m
        break

    # Remove matched fields to isolate name/description
    remainder = text
    for m in filter(None, phone_matches + [email_match, url_match]):
        remainder = remainder.replace(m.group(), "")

    # Clean separators and split name from description
    parts = re.split(r"[|\n;–—]+", remainder)
    parts = [p.strip() for p in parts if p.strip()]
    name = parts[0] if parts else text.strip()
    description = " ".join(parts[1:]) if len(parts) > 1 else None

    phones = [p for p in (normalize_phone(m.group()) for m in phone_matches) if p]

    return {
        "name": name,
        "email": email_match.group() if email_match else None,
        "phones": phones,
        "address": None,
        "website": normalize_url(url_match.group() if url_match else None),
        "description": description,
        "services": [],
    }


# ── paragraph analysis ────────────────────────────────────────────────────────

def _is_all_caps(text: str) -> bool:
    """
    True if text is predominantly uppercase (handles cases like "PERSON to PERSON"
    where connector words are lowercase but the meaningful words are all caps).
    Uses a threshold: >= 50% of letters are uppercase.
    """
    letters = re.sub(r"[^A-Za-z]", "", text)
    if not letters:
        return False
    upper_count = sum(1 for c in letters if c.isupper())
    return (upper_count / len(letters)) >= 0.5


def _para_runs(para) -> list:
    """Return (text, bold) pairs for all non-empty runs."""
    return [(r.text, r.bold) for r in para.runs if r.text]


def _first_content_bold(para) -> bool | None:
    """Return the bold flag of the first non-whitespace run."""
    for r in para.runs:
        if r.text.strip():
            return r.bold
    return None


def _all_runs_bold(para) -> bool:
    """True if every non-whitespace run is bold."""
    runs = [(t, b) for (t, b) in _para_runs(para) if t.strip()]
    return bool(runs) and all(b for (_, b) in runs)


# ── mixed paragraph splitter ──────────────────────────────────────────────────

def _split_mixed_para(para) -> list[tuple[str, str]]:
    """
    Handle paragraphs that start with a bold heading then transition to
    non-bold business content. Returns a list of (kind, text) tuples where
    kind is 'major', 'header', or 'entry'.

    Also handles paragraphs where a new bold ALL-CAPS section header appears
    mid-paragraph (e.g., "Transportation Services\\n...businesses...\\nHOUSEHOLD MAINTENANCE...")
    """
    runs = _para_runs(para)
    if not runs:
        return []

    # Collect segments: each segment is (bold, accumulated_text)
    segments = []
    cur_bold = runs[0][1]
    cur_text = ""

    for (t, b) in runs:
        # When bold state changes and the new content has actual letters, save segment
        if b != cur_bold and t.strip():
            if cur_text.strip():
                segments.append((cur_bold, cur_text))
            cur_bold = b
            cur_text = t
        else:
            cur_text += t

    if cur_text.strip():
        segments.append((cur_bold, cur_text))

    result = []
    for (bold, text) in segments:
        clean = text.strip()
        if not clean:
            continue
        if bold and _is_all_caps(clean.replace("\n", " ").strip()):
            result.append(("major", clean))
        elif bold:
            # Could be subcategory or embedded major — treat as header
            result.append(("header", clean))
        else:
            # Non-bold: this is business content, split by double-newline
            for block in re.split(r"\n\n+", clean):
                block = block.strip()
                if block:
                    result.append(("entry", block))

    return result


# ── main parser ───────────────────────────────────────────────────────────────

def _make_business(text: str, category: str, subcategory: str | None) -> dict:
    b = parse_business_text(text)
    b["category"] = category
    b["subcategories"] = [subcategory] if subcategory else []
    b["image"] = None
    return b


def _looks_like_new_business(text: str) -> bool:
    """
    Heuristic: True if text looks like the start of a new business entry
    rather than a continuation of the previous one.

    Indicators of a NEW business:
    - First line has a recognizable business name (multiple title-case words,
      or contains business suffixes like LLC, Inc, Co, Services, etc.)
    - First line is a named person + a place (e.g. "John Smith - Grand Marais")
    - Multi-line paragraph where the first line looks like a business name

    Indicators of a CONTINUATION:
    - First line is just a phone number, email, URL
    - First line starts with a street address number (e.g. "110 2nd Ave East")
    - First line is a description/service continuation
    """
    stripped = text.strip()
    if not stripped:
        return False

    first_line = stripped.split("\n")[0].strip()

    # Pure contact info → continuation
    is_phone_only = bool(re.match(r"^\(?\d{3}\)?[\s.\-]\d{3}[\s.\-]\d{4}", first_line))
    is_email_only = bool(EMAIL_RE.fullmatch(first_line))
    is_url_only = bool(re.match(r"(?:https?://|www\.)", first_line))
    if is_phone_only or is_email_only or is_url_only:
        return False

    # Starts with a street number (address continuation) like "9 1st Ave", "110 2nd Ave"
    if re.match(r"^\d+\s+\w", first_line) and not re.match(r"^\d{3}[\s.\-]\d{3}", first_line):
        return False

    # Contains known business entity suffixes → new business
    business_suffixes = re.compile(
        r"\b(LLC|Inc|Corp|Co\.|Company|Services|Service|Construction|Electric|Plumbing|"
        r"Heating|Cleaning|Painting|Landscaping|Excavating|Contracting|Enterprises|"
        r"Solutions|Associates|Group|Studio|Studios|Salon|Spa|Clinic|Center|Shop|Store)\b",
        re.IGNORECASE,
    )
    if business_suffixes.search(first_line):
        return True

    # Has multiple words AND title-case pattern (likely a business/person name)
    words = re.findall(r"[A-Za-z]+", first_line)
    title_case_words = sum(1 for w in words if w[0].isupper() and len(w) > 1)
    if len(words) >= 2 and title_case_words >= 2:
        return True

    return False


def parse_docx(docx_path: str) -> list[dict]:
    doc = Document(docx_path)

    # ── Step 1: Convert paragraphs into a flat token stream ──────────────────
    # Each token is one of:
    #   ("major", text)   — bold ALL-CAPS category header
    #   ("sub", text)     — bold mixed-case subcategory header
    #   ("entry", text)   — business entry text (may be multi-line)
    #   ("sep", "")       — empty paragraph (business separator)

    tokens: list[tuple[str, str]] = []

    for para in doc.paragraphs:
        raw = para.text

        # Empty paragraph → separator
        if not raw.strip():
            tokens.append(("sep", ""))
            continue

        first_bold = _first_content_bold(para)
        all_bold = _all_runs_bold(para)
        text = raw.strip()

        if all_bold:
            # Entire paragraph is bold
            if _is_all_caps(text.replace("\n", " ").strip()):
                tokens.append(("major", text))
            else:
                tokens.append(("sub", text))
        elif first_bold and not all_bold:
            # Mixed paragraph: starts bold, then goes non-bold
            for (kind, t) in _split_mixed_para(para):
                if kind == "major":
                    tokens.append(("major", t))
                elif kind == "header":
                    tokens.append(("sub", t))
                elif kind == "entry":
                    tokens.append(("entry", t))
        else:
            # Paragraph starts non-bold; check if it contains embedded bold
            # headers mid-way (e.g. Chris Skildum's para which starts non-bold
            # then has "House Lighting" as a bold subcategory mid-paragraph).
            runs = _para_runs(para)
            has_bold_mid = any(b for (t, b) in runs if t.strip() and b)
            if has_bold_mid:
                # Split using the mixed-para logic but treating non-bold first
                segments = _split_mixed_para(para)
                for (kind, t) in segments:
                    if kind == "major":
                        tokens.append(("major", t))
                    elif kind == "header":
                        tokens.append(("sub", t))
                    elif kind == "entry":
                        tokens.append(("entry", t))
            else:
                # Entirely non-bold → business entry
                tokens.append(("entry", text))

    # ── Step 2: Group consecutive entry tokens separated by "sep" tokens ─────
    # Consecutive entries without a sep between them are the same business.
    # After grouping, parse each group into a business dict.

    businesses: list[dict] = []
    current_category = ""
    current_subcategory = ""
    pending_entry_lines: list[str] = []  # accumulates lines for current business

    def flush_pending():
        if pending_entry_lines and current_category:
            combined = "\n".join(pending_entry_lines)
            businesses.append(_make_business(combined, current_category, current_subcategory))
        pending_entry_lines.clear()

    def _pending_has_contact() -> bool:
        """True if any accumulated line contains phone, email, or URL."""
        combined = "\n".join(pending_entry_lines)
        return bool(
            PHONE_RE.search(combined)
            or EMAIL_RE.search(combined)
            or URL_RE.search(combined)
        )

    prev_kind = None
    for (kind, text) in tokens:
        if kind == "major":
            flush_pending()
            current_category = text.strip()
            current_subcategory = ""
            prev_kind = kind

        elif kind == "sub":
            flush_pending()
            current_subcategory = text.strip()
            prev_kind = kind

        elif kind == "sep":
            # Empty paragraph → flush current business
            flush_pending()
            prev_kind = kind

        elif kind == "entry":
            if prev_kind == "entry":
                # Decide: merge into current business, or start a new one?
                new_biz = _looks_like_new_business(text)
                # Override: if the pending business has NO contact info yet
                # (name-only so far), force-merge unless the next text is also
                # clearly a full business (has both a name AND contact info).
                if new_biz and not _pending_has_contact():
                    # Pending has no contact — likely the next para is still
                    # part of the same entity (e.g. company name then contact)
                    new_biz = False
                if new_biz:
                    flush_pending()
                pending_entry_lines.append(text)
            else:
                # New business: after a sep/header
                flush_pending()
                pending_entry_lines.append(text)
            prev_kind = kind

    flush_pending()

    # Merge same-business rows: group by (name, category), union subcategories and phones
    from collections import defaultdict

    merged: dict[tuple, dict] = {}
    for b in businesses:
        key = (b["name"], b["category"])
        if key not in merged:
            merged[key] = b.copy()
            merged[key]["subcategories"] = list(b["subcategories"])
        else:
            for sub in b["subcategories"]:
                if sub and sub not in merged[key]["subcategories"]:
                    merged[key]["subcategories"].append(sub)
            # Also merge phones
            for ph in b["phones"]:
                if ph and ph not in merged[key]["phones"]:
                    merged[key]["phones"].append(ph)

    return list(merged.values())


# ── CLI entry point ───────────────────────────────────────────────────────────

def main():
    docx_path = Path(__file__).parent.parent.parent / "laundromat-bulletin-board.docx"
    businesses = parse_docx(str(docx_path))

    print(f"\n=== Parse Summary ===")
    print(f"Total businesses: {len(businesses)}")

    categories: dict = {}
    for b in businesses:
        cat = b["category"]
        categories.setdefault(cat, {})
        subs = b["subcategories"] or ["(none)"]
        for sub in subs:
            categories[cat].setdefault(sub or "(none)", 0)
            categories[cat][sub or "(none)"] += 1

    print(f"\nCategories ({len(categories)}):")
    for cat, subs in sorted(categories.items()):
        total = len([b for b in businesses if b["category"] == cat])
        print(f"  {cat}: {total}")
        for sub, count in sorted(subs.items()):
            print(f"    {sub}: {count}")

    missing_phone = [b for b in businesses if not b["phones"]]
    missing_email = [b for b in businesses if not b["email"]]
    print(f"\nMissing phone: {len(missing_phone)}")
    print(f"Missing email: {len(missing_email)}")

    if missing_phone:
        print("  Samples:", [b["name"] for b in missing_phone[:8]])

    out_path = Path(__file__).parent.parent.parent / "src" / "data" / "directory.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(businesses, indent=2, ensure_ascii=False))
    print(f"\nWrote {len(businesses)} businesses to {out_path}")


if __name__ == "__main__":
    main()
