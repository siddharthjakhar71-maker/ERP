import type { PurchaseOrderPdfDocument } from './purchase-order-pdf-adapter';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const TOP = 800;
const BOTTOM = 42;
const FONT_SIZE = 10;
const LINE_HEIGHT = 14;
const CHAR_WIDTH_FACTOR = 0.52;

type PdfPage = string[];

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r?\n/g, ' ');
const toPdfString = (value: string) => `(${escapePdfText(value)})`;
const blobFromBytes = (bytes: Uint8Array) => new Blob([bytes], { type: 'application/pdf' });
const textWidth = (text: string, size = FONT_SIZE) => text.length * size * CHAR_WIDTH_FACTOR;

const wrapText = (text: string, maxWidth: number) => {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    if (textWidth(word) <= maxWidth) {
      current = word;
      continue;
    }
    let segment = '';
    for (const char of word) {
      const joined = `${segment}${char}`;
      if (textWidth(joined) > maxWidth && segment) {
        lines.push(segment);
        segment = char;
      } else {
        segment = joined;
      }
    }
    current = segment;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const createPdf = (pages: PdfPage[]) => {
  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds: number[] = [];
  const contentIds: number[] = [];

  for (const page of pages) {
    const stream = page.join('\n');
    const contentId = addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    contentIds.push(contentId);
    const pageId = addObject('');
    pageIds.push(pageId);
  }

  const pagesId = addObject(`<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] >>`);
  pageIds.forEach((pageId, index) => {
    objects[pageId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentIds[index]} 0 R >>`;
  });
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  for (let index = 0; index < objects.length; index += 1) {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${objects[index]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return blobFromBytes(new TextEncoder().encode(pdf));
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export const downloadPurchaseOrderPdf = (doc: PurchaseOrderPdfDocument) => {
  const pages: PdfPage[] = [[]];
  let currentPage = pages[0];
  let y = TOP;

  const ensureSpace = (needed = LINE_HEIGHT) => {
    if (y - needed >= BOTTOM) return;
    currentPage = [];
    pages.push(currentPage);
    y = TOP;
  };

  const push = (command: string) => currentPage.push(command);
  const drawText = (text: string, x: number, font = 'F1', size = FONT_SIZE) => {
    ensureSpace(size + 4);
    push(`BT /${font} ${size} Tf 1 0 0 1 ${x} ${y} Tm ${toPdfString(text)} Tj ET`);
    y -= LINE_HEIGHT;
  };
  const drawParagraph = (text: string, x: number, width: number, font = 'F1', size = FONT_SIZE) => {
    for (const line of wrapText(text, width)) drawText(line, x, font, size);
  };
  const drawRule = () => {
    ensureSpace(12);
    push(`${MARGIN_X} ${y} m ${PAGE_WIDTH - MARGIN_X} ${y} l S`);
    y -= 12;
  };
  const drawLabelValue = (label: string, value: string, x: number, width: number) => {
    drawText(label, x, 'F2');
    drawParagraph(value, x, width);
  };

  drawText('JAKHIRA ERP', MARGIN_X, 'F2', 18);
  drawText('Purchase Order', MARGIN_X, 'F2', 14);
  drawText(`PO Number: ${doc.poNumber}`, MARGIN_X);
  drawText(`Status: ${doc.status}`, 330);
  drawText(`Order Date: ${doc.orderDate}`, MARGIN_X);
  drawText(`Expected Date: ${doc.expectedDate}`, 330);
  drawRule();

  const sectionColumns = [MARGIN_X, 300];
  const drawSection = (title: string, lines: string[], x: number) => {
    const originalY = y;
    drawText(title, x, 'F2');
    for (const line of lines) drawParagraph(line, x, 220);
    return originalY;
  };

  const beforeColumns = y;
  const leftStart = drawSection('Vendor Details', doc.vendorDetails, sectionColumns[0]);
  const afterLeft = y;
  y = beforeColumns;
  drawSection('Site Details', doc.siteDetails, sectionColumns[1]);
  const afterRight = y;
  y = Math.min(afterLeft, afterRight) - 4;
  drawRule();

  const beforeAddresses = y;
  drawSection('Billing Address', doc.billingAddress, sectionColumns[0]);
  const afterBilling = y;
  y = beforeAddresses;
  drawSection('Shipping Address', doc.shippingAddress, sectionColumns[1]);
  const afterShipping = y;
  y = Math.min(afterBilling, afterShipping) - 4;
  drawRule();

  drawText('Line Items', MARGIN_X, 'F2');
  const headers = [
    ['Material', 40], ['Description', 170], ['Qty', 330], ['Unit', 380], ['Rate', 430], ['Tax', 490], ['Amount', 535],
  ] as const;
  push('0.2 w');
  for (const [label, x] of headers) {
    push(`BT /F2 9 Tf 1 0 0 1 ${x} ${y} Tm ${toPdfString(label)} Tj ET`);
  }
  y -= 12;
  push(`${MARGIN_X} ${y + 4} m ${PAGE_WIDTH - MARGIN_X} ${y + 4} l S`);
  y -= 4;

  for (const item of doc.lineItems) {
    const materialLines = wrapText(item.materialLabel, 120);
    const descriptionLines = wrapText(item.description, 150);
    const rowHeight = Math.max(materialLines.length, descriptionLines.length, 1) * LINE_HEIGHT;
    ensureSpace(rowHeight + 8);
    let rowY = y;
    materialLines.forEach((line, idx) => push(`BT /F1 9 Tf 1 0 0 1 40 ${rowY - (idx * LINE_HEIGHT)} Tm ${toPdfString(line)} Tj ET`));
    descriptionLines.forEach((line, idx) => push(`BT /F1 9 Tf 1 0 0 1 170 ${rowY - (idx * LINE_HEIGHT)} Tm ${toPdfString(line)} Tj ET`));
    push(`BT /F1 9 Tf 1 0 0 1 330 ${rowY} Tm ${toPdfString(item.quantity)} Tj ET`);
    push(`BT /F1 9 Tf 1 0 0 1 380 ${rowY} Tm ${toPdfString(item.unit)} Tj ET`);
    push(`BT /F1 9 Tf 1 0 0 1 430 ${rowY} Tm ${toPdfString(item.rate)} Tj ET`);
    push(`BT /F1 9 Tf 1 0 0 1 490 ${rowY} Tm ${toPdfString(item.tax)} Tj ET`);
    push(`BT /F1 9 Tf 1 0 0 1 535 ${rowY} Tm ${toPdfString(item.amount)} Tj ET`);
    y -= rowHeight + 6;
    push(`${MARGIN_X} ${y + 2} m ${PAGE_WIDTH - MARGIN_X} ${y + 2} l S`);
    y -= 2;
  }

  drawRule();
  drawLabelValue('Remarks / Notes', doc.remarks.join(' '), MARGIN_X, 320);
  y += LINE_HEIGHT;
  drawLabelValue('Subtotal', doc.subtotal, 360, 180);
  drawLabelValue('Discount', doc.discount, 360, 180);
  drawLabelValue('Tax', doc.tax, 360, 180);
  drawText(`Grand Total: ${doc.grandTotal}`, 360, 'F2', 12);

  downloadBlob(createPdf(pages), `${doc.poNumber}.pdf`);
};
