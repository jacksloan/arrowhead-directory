import type { Business } from '$lib/types';

export async function downloadDirectoryPdf(businesses: Business[], title = 'Arrowhead Business Directory') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();

  const PAGE_H = doc.internal.pageSize.getHeight();
  const PAGE_W = doc.internal.pageSize.getWidth();
  const MARGIN = 14;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  function checkBreak(needed: number) {
    if (y + needed > PAGE_H - MARGIN) {
      doc.addPage();
      y = MARGIN;
    }
  }

  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(title, MARGIN, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120);
  doc.text(
    `Generated ${new Date().toLocaleDateString()}  ·  ${businesses.length} listings`,
    MARGIN,
    y
  );
  doc.setTextColor(0);
  y += 12;

  const grouped = new Map<string, Business[]>();
  for (const b of businesses) {
    const key = b.categories[0]?.name ?? 'Uncategorized';
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(b);
  }

  for (const [category, items] of grouped) {
    checkBreak(16);

    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(category.toUpperCase(), MARGIN, y);
    y += 2;
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, MARGIN + CONTENT_W, y);
    y += 6;

    for (const b of items) {
      checkBreak(22);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text(b.name, MARGIN + 4, y);
      y += 5;

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');

      // Subcategories + services
      const tags = b.services.map((s) => s.name);
      if (tags.length > 0) {
        doc.setTextColor(100);
        const tagLine = tags.join(' · ');
        const wrapped = doc.splitTextToSize(tagLine, CONTENT_W - 8);
        for (const line of wrapped) {
          checkBreak(5);
          doc.text(line, MARGIN + 8, y);
          y += 4;
        }
      }

      // Description
      if (b.description) {
        doc.setTextColor(60);
        const wrapped = doc.splitTextToSize(b.description, CONTENT_W - 8);
        for (const line of wrapped) {
          checkBreak(5);
          doc.text(line, MARGIN + 8, y);
          y += 4;
        }
        y += 1;
      }

      // Contact details
      doc.setTextColor(80);
      const contacts: string[] = [];
      if (b.phones.length > 0) contacts.push(b.phones[0].number);
      if (b.email) contacts.push(b.email);
      if (b.website) {
        try {
          contacts.push(new URL(b.website).hostname.replace(/^www\./, ''));
        } catch {
          contacts.push(b.website);
        }
      }
      if (b.address) contacts.push(b.address);

      for (const line of contacts) {
        checkBreak(5);
        doc.text(line, MARGIN + 8, y);
        y += 4;
      }

      doc.setTextColor(0);
      y += 4;
    }

    y += 5;
  }

  doc.save('arrowhead-directory.pdf');
}
