import json
import pytest
from parse import parse_business_text, normalize_phone, normalize_url

def test_parse_business_text_full():
    text = "Ace Plumbing | 218-555-0101 | ace@example.com | aceplumbing.com | Drain cleaning and water heaters"
    result = parse_business_text(text)
    assert result["name"] == "Ace Plumbing"
    assert result["phone"] == "218-555-0101"
    assert result["email"] == "ace@example.com"
    assert result["website"] == "https://aceplumbing.com"

def test_parse_business_text_name_only():
    result = parse_business_text("Betty's Childcare")
    assert result["name"] == "Betty's Childcare"
    assert result["phone"] is None
    assert result["email"] is None

def test_normalize_phone():
    assert normalize_phone("(218) 555-0101") == "218-555-0101"
    assert normalize_phone("218.555.0101") == "218-555-0101"
    assert normalize_phone(None) is None

def test_normalize_url():
    assert normalize_url("aceplumbing.com") == "https://aceplumbing.com"
    assert normalize_url("https://aceplumbing.com") == "https://aceplumbing.com"
    assert normalize_url(None) is None
