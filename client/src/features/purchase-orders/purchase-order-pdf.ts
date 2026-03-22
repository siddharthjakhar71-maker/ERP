import type { PurchaseOrderPdfDocument } from './purchase-order-pdf-adapter';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const EMPTY_VALUE = 'Not provided';
const CHAR_WIDTH_FACTOR = 0.52;
const DEFAULT_PADDING = 8;
const BOX_TITLE_HEIGHT = 20;

type PdfPage = string[];
type FontName = 'F1' | 'F2';
type Align = 'left' | 'center' | 'right';
type TableColumnKey = 'index' | 'description' | 'unit' | 'quantity' | 'rate' | 'amount';

type TableColumn = {
  key: TableColumnKey;
  label: string;
  width: number;
  align?: Align;
};

type LabeledValue = { label: string; value: string };

type BoxOptions = { title?: string; shadedTitle?: boolean };

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r?\n/g, ' ');
const sanitizeText = (value: string) => value.replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
const toPdfString = (value: string) => `(${escapePdfText(sanitizeText(value))})`;
const blobFromBytes = (bytes: Uint8Array) => new Blob([bytes], { type: 'application/pdf' });
const textWidth = (text: string, size: number) => sanitizeText(text).length * size * CHAR_WIDTH_FACTOR;

const wrapText = (text: string, maxWidth: number, size: number) => {
  const normalized = sanitizeText(text);
  if (!normalized) return [''];
  const words = normalized.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (textWidth(next, size) <= maxWidth) {
      current = next;
      continue;
    }
    if (current) lines.push(current);
    current = word;
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
};

const createPdf = (pages: PdfPage[]) => {
  const objects: string[] = [];
  const addObject = (content: string) => { objects.push(content); return objects.length; };
  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
  const pageIds: number[] = [];
  const contentIds: number[] = [];

  for (const page of pages) {
    const stream = page.join('\n');
    contentIds.push(addObject(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`));
    pageIds.push(addObject(''));
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
  for (let index = 1; index < offsets.length; index += 1) pdf += `${offsets[index].toString().padStart(10, '0')} 00000 n \n`;
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

const extractFieldValue = (lines: string[], prefixes: string[]) => {
  const match = lines.find((line) => prefixes.some((prefix) => line.toLowerCase().startsWith(prefix.toLowerCase())));
  if (!match) return '';
  const separatorIndex = match.indexOf(':');
  return separatorIndex >= 0 ? match.slice(separatorIndex + 1).trim() : match.trim();
};

const splitVendorDetails = (lines: string[]) => {
  const [vendorName = EMPTY_VALUE, ...rest] = lines;
  const addressLines = rest.filter((line) => !/^(Code|Phone|Email):/i.test(line));
  return { vendorName, address: addressLines.length ? addressLines.join(', ') : EMPTY_VALUE, phone: extractFieldValue(lines, ['Phone:']) || EMPTY_VALUE, email: extractFieldValue(lines, ['Email:']) || EMPTY_VALUE };
};
const splitProjectDetails = (lines: string[]) => {
  const [projectName = EMPTY_VALUE, ...rest] = lines;
  const addressLines = rest.filter((line) => !/^(Code|Location):/i.test(line));
  return { projectName, projectAddress: addressLines.length ? addressLines.join(', ') : EMPTY_VALUE };
};
const parseAmountNumber = (value: string) => {
  const numeric = Number.parseFloat(value.replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : 0;
};
const numberToWordsBelowThousand = (value: number) => {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const remainder = value % 100;
  if (hundreds) parts.push(`${ones[hundreds]} Hundred`);
  if (remainder >= 20) parts.push(`${tens[Math.floor(remainder / 10)]}${remainder % 10 ? ` ${ones[remainder % 10]}` : ''}`.trim());
  else if (remainder >= 10) parts.push(teens[remainder - 10]);
  else if (remainder > 0) parts.push(ones[remainder]);
  return parts.join(' ').trim();
};
const numberToIndianWords = (value: number) => {
  if (value === 0) return 'Zero';
  const segments: Array<[number, string]> = [[10000000, 'Crore'], [100000, 'Lakh'], [1000, 'Thousand']];
  let remainder = value;
  const parts: string[] = [];
  segments.forEach(([divisor, label]) => {
    if (remainder >= divisor) {
      const segmentValue = Math.floor(remainder / divisor);
      parts.push(`${numberToWordsBelowThousand(segmentValue)} ${label}`.trim());
      remainder %= divisor;
    }
  });
  if (remainder > 0) parts.push(numberToWordsBelowThousand(remainder));
  return parts.join(' ').trim();
};
const amountToWords = (amount: string, currencyLabel: string) => {
  const numeric = parseAmountNumber(amount);
  const whole = Math.floor(numeric);
  const fraction = Math.round((numeric - whole) * 100);
  const wholeWords = numberToIndianWords(whole);
  if (fraction > 0) return `Amount in Words: ${currencyLabel} ${wholeWords} and ${numberToIndianWords(fraction)} Paise Only`;
  return `Amount in Words: ${currencyLabel} ${wholeWords} Only`;
};

const hexToRgb = (hex: string) => [1, 3, 5].map((index) => Number.parseInt(hex.slice(index, index + 2), 16) / 255) as [number, number, number];

export const downloadPurchaseOrderPdf = (doc: PurchaseOrderPdfDocument) => {
  const { theme, template, layout } = doc.settings;
  const marginX = layout.pageMarginX;
  const marginTop = layout.pageMarginTop;
  const marginBottom = layout.pageMarginBottom;
  const printWidth = PAGE_WIDTH - (marginX * 2);
  const baseFontSize = theme.baseFontSize;
  const smallFontSize = Math.max(theme.baseFontSize - 1, 7);
  const tableFontSize = theme.tableFontSize;
  const lineHeight = layout.layoutDensity === 'compact' ? 10 : 12;
  const sectionGap = layout.sectionSpacing;
  const [r, g, b] = hexToRgb(theme.primaryColor);
  const borderGray = layout.layoutDensity === 'compact' ? 0.45 : 0.55;

  const pages: PdfPage[] = [[]];
  let currentPage = pages[0];
  let y = PAGE_HEIGHT - marginTop;
  const projectDetails = splitProjectDetails(doc.siteDetails);
  const vendorDetails = splitVendorDetails(doc.vendorDetails);
  const visibleFields = new Set(template.visiblePoDetailFields);
  const visibleColumns = template.visibleLineItemColumns;

  const push = (command: string) => currentPage.push(command);
  const line = (x1: number, y1: number, x2: number, y2: number) => push(`${x1} ${y1} m ${x2} ${y2} l S`);
  const rect = (x: number, top: number, width: number, height: number, fill = false) => push(`${x} ${top - height} ${width} ${height} re ${fill ? 'B' : 'S'}`);
  const setFillColor = (colorR: number, colorG: number, colorB: number) => push(`${colorR.toFixed(3)} ${colorG.toFixed(3)} ${colorB.toFixed(3)} rg`);
  const setStrokeGray = (value: number) => push(`${value} G`);
  const setLineWidth = (value: number) => push(`${value} w`);
  const setBorderStyle = () => {
    if (theme.borderStyle === 'dashed') push('[3 2] 0 d');
    else if (theme.borderStyle === 'double') setLineWidth(1.1);
    else push('[] 0 d');
  };

  const drawText = (text: string, x: number, baselineY: number, options?: { font?: FontName; size?: number; align?: Align }) => {
    const font = options?.font ?? 'F1';
    const size = options?.size ?? baseFontSize;
    const align = options?.align ?? 'left';
    const content = sanitizeText(text || EMPTY_VALUE);
    const renderedWidth = textWidth(content, size);
    const drawX = align === 'right' ? x - renderedWidth : align === 'center' ? x - (renderedWidth / 2) : x;
    push(`BT /${font} ${size} Tf 1 0 0 1 ${drawX} ${baselineY} Tm ${toPdfString(content)} Tj ET`);
  };

  const drawWrappedText = (text: string, x: number, top: number, width: number, options?: { font?: FontName; size?: number; align?: Align; rowGap?: number }) => {
    const size = options?.size ?? baseFontSize;
    const rowGap = options?.rowGap ?? lineHeight;
    const lines = wrapText(text, width, size);
    lines.forEach((lineText, index) => {
      const baselineY = top - size - (index * rowGap);
      const anchorX = options?.align === 'right' ? x + width : options?.align === 'center' ? x + (width / 2) : x;
      drawText(lineText, anchorX, baselineY, { ...options, size });
    });
    return lines.length * rowGap;
  };

  const newPage = () => { currentPage = []; pages.push(currentPage); y = PAGE_HEIGHT - marginTop; };
  const ensureSpace = (needed: number) => { if (y - needed < marginBottom) newPage(); };

  const drawBox = (top: number, height: number, x = marginX, width = printWidth, options?: BoxOptions) => {
    setStrokeGray(borderGray);
    setLineWidth(0.6);
    setBorderStyle();
    rect(x, top, width, height, false);
    push('[] 0 d');
    if (options?.title) {
      if (options.shadedTitle !== false) {
        setFillColor(r, g, b);
        rect(x, top, width, BOX_TITLE_HEIGHT, true);
      }
      setFillColor(0, 0, 0);
      drawText(options.title, x + DEFAULT_PADDING, top - 14, { font: 'F2', size: baseFontSize + 1 });
    }
  };

  const measureLabeledValue = (field: LabeledValue, width: number) => {
    const labelWidth = Math.min(width * 0.34, 110);
    const valueWidth = width - labelWidth - 6;
    return Math.max(lineHeight, wrapText(field.value || EMPTY_VALUE, valueWidth, baseFontSize).length * lineHeight);
  };
  const drawLabeledValue = (field: LabeledValue, x: number, top: number, width: number) => {
    const labelWidth = Math.min(width * 0.34, 110);
    drawText(field.label, x, top - baseFontSize, { font: 'F2', size: baseFontSize });
    const usedHeight = drawWrappedText(field.value || EMPTY_VALUE, x + labelWidth + 6, top, width - labelWidth - 6, { size: baseFontSize, rowGap: lineHeight });
    return Math.max(lineHeight, usedHeight);
  };

  const drawHeader = () => {
    const leftWidth = printWidth * (layout.headerLeftWidthPercent / 100);
    const metaRows: LabeledValue[] = [{ label: 'PO Number', value: doc.poNumber }, { label: 'Date', value: doc.orderDate }, { label: 'Status', value: doc.status }];
    const companyLines = [theme.companyName, doc.settings.theme.logoUrl ? `Logo: ${doc.settings.theme.logoUrl}` : '', 'Procurement Management System', `Currency: ${theme.currencyCode}`].filter(Boolean);
    const companyHeight = companyLines.reduce((sum, lineText, index) => sum + (index === 0 ? 20 : wrapText(lineText, leftWidth - 4, smallFontSize).length * 10), 0) + 10;
    const metaHeight = 24 + (metaRows.length * 16);
    const headerHeight = Math.max(companyHeight, metaHeight);
    ensureSpace(headerHeight + 18);

    const top = y;
    let leftCursor = top;
    drawText(companyLines[0] || theme.companyName, marginX, leftCursor - 16, { font: 'F2', size: theme.headingFontSize });
    leftCursor -= 24;
    companyLines.slice(1).forEach((infoLine) => { leftCursor -= drawWrappedText(infoLine, marginX, leftCursor, leftWidth - 6, { size: smallFontSize, rowGap: 10 }) + 2; });
    drawText('PURCHASE ORDER', PAGE_WIDTH - marginX, top - 18, { font: 'F2', size: theme.headingFontSize + 1, align: 'right' });
    let metaCursor = top - 40;
    metaRows.forEach((row) => { drawText(`${row.label}:`, marginX + leftWidth + 28, metaCursor, { font: 'F2', size: baseFontSize }); drawText(row.value, PAGE_WIDTH - marginX, metaCursor, { size: baseFontSize, align: 'right' }); metaCursor -= 16; });
    y = top - headerHeight;
    line(marginX, y, PAGE_WIDTH - marginX, y);
    y -= sectionGap;
  };

  const drawPurchaseOrderDetails = () => {
    const details = doc.detailFields.filter((field) => visibleFields.has(field.key));
    if (!details.length) return;
    const columnCount = layout.sectionColumns === '3' ? 3 : 2;
    const gap = 16;
    const columnWidth = (printWidth - ((columnCount - 1) * gap) - (DEFAULT_PADDING * 2)) / columnCount;
    const columns = Array.from({ length: columnCount }, () => [] as LabeledValue[]);
    details.forEach((field, index) => columns[index % columnCount].push({ label: field.label, value: field.value }));
    const columnHeights = columns.map((col) => col.reduce((sum, field) => sum + measureLabeledValue(field, columnWidth) + 6, 0));
    const height = BOX_TITLE_HEIGHT + DEFAULT_PADDING + Math.max(56, ...columnHeights) + DEFAULT_PADDING;
    ensureSpace(height + sectionGap);
    const top = y;
    drawBox(top, height, marginX, printWidth, { title: 'Purchase Order Details' });
    columns.forEach((column, columnIndex) => {
      const baseX = marginX + DEFAULT_PADDING + (columnIndex * (columnWidth + gap));
      if (columnIndex > 0) line(baseX - (gap / 2), top - BOX_TITLE_HEIGHT, baseX - (gap / 2), top - height + DEFAULT_PADDING);
      let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
      column.forEach((field) => { cursor -= drawLabeledValue(field, baseX, cursor, columnWidth) + 6; });
    });
    y -= height + sectionGap;
  };

  const drawVendorDetails = () => {
    if (!template.showVendorDetails) return;
    const fields: LabeledValue[] = [
      { label: 'Vendor Name', value: vendorDetails.vendorName },
      { label: 'Address', value: vendorDetails.address },
      { label: 'Phone', value: vendorDetails.phone },
      { label: 'Email', value: vendorDetails.email },
    ];
    const contentHeight = fields.reduce((sum, field) => sum + measureLabeledValue(field, printWidth - (DEFAULT_PADDING * 2)) + 6, 0);
    const height = BOX_TITLE_HEIGHT + DEFAULT_PADDING + contentHeight + DEFAULT_PADDING;
    ensureSpace(height + sectionGap);
    const top = y;
    drawBox(top, height, marginX, printWidth, { title: 'Vendor Details' });
    let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
    fields.forEach((field) => { cursor -= drawLabeledValue(field, marginX + DEFAULT_PADDING, cursor, printWidth - (DEFAULT_PADDING * 2)) + 6; });
    y -= height + sectionGap;
  };

  const measureAddressBox = (lines: string[], width: number) => BOX_TITLE_HEIGHT + DEFAULT_PADDING + (lines.length ? lines : [EMPTY_VALUE]).reduce((sum, lineText) => sum + wrapText(lineText, width - (DEFAULT_PADDING * 2), baseFontSize).length * lineHeight, 0) + DEFAULT_PADDING;
  const drawAddressBox = (title: string, lines: string[], x: number, top: number, width: number, height: number) => {
    drawBox(top, height, x, width, { title });
    let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
    (lines.length ? lines : [EMPTY_VALUE]).forEach((lineText) => { cursor -= drawWrappedText(lineText, x + DEFAULT_PADDING, cursor, width - (DEFAULT_PADDING * 2), { size: baseFontSize, rowGap: lineHeight }); });
  };
  const drawBillShipSection = () => {
    const sections = [template.showBillTo ? { title: 'Bill To', lines: doc.billingAddress } : null, template.showShipTo ? { title: 'Ship To', lines: doc.shippingAddress } : null].filter(Boolean) as Array<{ title: string; lines: string[] }>;
    if (!sections.length) return;
    const gap = 16;
    const boxWidth = sections.length === 1 ? printWidth : (printWidth - gap) / 2;
    const height = Math.max(...sections.map((section) => measureAddressBox(section.lines, boxWidth)), 86);
    ensureSpace(height + sectionGap);
    const top = y;
    sections.forEach((section, index) => drawAddressBox(section.title, section.lines, marginX + (index * (boxWidth + gap)), top, boxWidth, height));
    y -= height + sectionGap;
  };

  const allColumns: Record<TableColumnKey, TableColumn> = {
    index: { key: 'index', label: 'Sr. No.', width: layout.lineItemColumnWidths.index, align: 'center' },
    description: { key: 'description', label: 'Description', width: layout.lineItemColumnWidths.description, align: 'left' },
    unit: { key: 'unit', label: 'Unit', width: layout.lineItemColumnWidths.unit, align: 'center' },
    quantity: { key: 'quantity', label: 'Qty', width: layout.lineItemColumnWidths.quantity, align: 'right' },
    rate: { key: 'rate', label: 'Unit Price', width: layout.lineItemColumnWidths.rate, align: 'right' },
    amount: { key: 'amount', label: 'Amount', width: layout.lineItemColumnWidths.amount, align: 'right' },
  };
  const tableColumns = visibleColumns.map((key) => allColumns[key]).filter(Boolean);
  const totalConfiguredWidth = tableColumns.reduce((sum, column) => sum + column.width, 0) || printWidth;
  const scaledColumns = tableColumns.map((column) => ({ ...column, width: (column.width / totalConfiguredWidth) * printWidth }));

  const drawTableHeader = () => {
    setFillColor(r, g, b); rect(marginX, y, printWidth, 22, true); setFillColor(0, 0, 0);
    let x = marginX;
    scaledColumns.forEach((column) => {
      line(x, y, x, y - 22);
      const anchorX = column.align === 'right' ? x + column.width - 6 : column.align === 'center' ? x + (column.width / 2) : x + 6;
      drawText(column.label, anchorX, y - 14, { font: 'F2', size: tableFontSize, align: column.align ?? 'left' });
      x += column.width;
    });
    line(marginX + printWidth, y, marginX + printWidth, y - 22);
    y -= 22;
  };

  const drawLineItems = () => {
    ensureSpace(40);
    drawText('Line Items', marginX, y - 2, { font: 'F2', size: baseFontSize + 2 });
    y -= 16;
    drawTableHeader();
    doc.lineItems.forEach((item, index) => {
      const rowValues: Record<TableColumnKey, string> = {
        index: String(index + 1),
        description: `${item.materialLabel}${item.description ? ` - ${item.description}` : ''}`,
        unit: item.unit,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.amount,
      };
      const rowHeight = Math.max(22, ...scaledColumns.map((column) => (wrapText(rowValues[column.key], column.width - 12, tableFontSize).length * 10) + 8));
      if (y - rowHeight < marginBottom + 180) { newPage(); drawHeader(); drawText('Line Items', marginX, y - 2, { font: 'F2', size: baseFontSize + 2 }); y -= 16; drawTableHeader(); }
      rect(marginX, y, printWidth, rowHeight, false);
      let x = marginX;
      scaledColumns.forEach((column) => {
        line(x, y, x, y - rowHeight);
        wrapText(rowValues[column.key], column.width - 12, tableFontSize).forEach((lineText, lineIndex) => {
          const anchorX = column.align === 'right' ? x + column.width - 6 : column.align === 'center' ? x + (column.width / 2) : x + 6;
          drawText(lineText, anchorX, y - 14 - (lineIndex * 10), { size: tableFontSize, align: column.align ?? 'left' });
        });
        x += column.width;
      });
      line(marginX + printWidth, y, marginX + printWidth, y - rowHeight);
      y -= rowHeight;
    });
    y -= sectionGap;
  };

  const drawTotalsSection = () => {
    const blockWidth = Math.min(layout.totalsBlockWidth, printWidth);
    const leftWidth = printWidth - blockWidth - 12;
    ensureSpace(96);
    const top = y;
    drawBox(top, 78, marginX + leftWidth + 12, blockWidth, { shadedTitle: false });
    let cursor = top - 18;
    [{ label: 'Subtotal', value: doc.subtotal }, { label: 'Discount', value: doc.discount }, { label: 'GST / Tax', value: doc.tax }].forEach((row) => { drawText(row.label, marginX + leftWidth + 24, cursor, { size: baseFontSize }); drawText(row.value, PAGE_WIDTH - marginX - 10, cursor, { size: baseFontSize, align: 'right' }); cursor -= 16; });
    line(marginX + leftWidth + 20, cursor + 6, PAGE_WIDTH - marginX - 10, cursor + 6);
    drawText('Grand Total', marginX + leftWidth + 24, cursor - 10, { font: 'F2', size: baseFontSize + 1 });
    drawText(doc.grandTotal, PAGE_WIDTH - marginX - 10, cursor - 10, { font: 'F2', size: baseFontSize + 3, align: 'right' });
    y -= 78 + sectionGap;
  };

  const drawAmountInWords = () => {
    if (!template.showAmountInWords) return;
    const text = amountToWords(doc.grandTotal, theme.currencyLabel);
    const height = BOX_TITLE_HEIGHT + DEFAULT_PADDING + wrapText(text, printWidth - (DEFAULT_PADDING * 2), baseFontSize).length * lineHeight + DEFAULT_PADDING;
    ensureSpace(height + sectionGap);
    const top = y;
    drawBox(top, height, marginX, printWidth, { title: 'Amount in Words' });
    drawWrappedText(text, marginX + DEFAULT_PADDING, top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4, printWidth - (DEFAULT_PADDING * 2), { size: baseFontSize, rowGap: lineHeight });
    y -= height + sectionGap;
  };

  const drawTerms = () => {
    if (!template.showTermsAndConditions) return;
    const remarks = doc.remarks.length ? doc.remarks.join(' ') : 'No remarks';
    const height = BOX_TITLE_HEIGHT + DEFAULT_PADDING + wrapText(remarks, printWidth - (DEFAULT_PADDING * 2), baseFontSize).length * lineHeight + DEFAULT_PADDING;
    ensureSpace(height + sectionGap + 56);
    const top = y;
    drawBox(top, height, marginX, printWidth, { title: 'Terms & Conditions' });
    drawWrappedText(remarks, marginX + DEFAULT_PADDING, top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4, printWidth - (DEFAULT_PADDING * 2), { size: baseFontSize, rowGap: lineHeight });
    y -= height + sectionGap;
  };

  const drawFooter = () => {
    if (!template.showPreparedBy && !template.showSignatory) return;
    const height = theme.footerStyle === 'minimal' ? 36 : 48;
    ensureSpace(height);
    const top = y;
    const gap = 40;
    const halfWidth = (printWidth - gap) / 2;
    if (template.showPreparedBy) {
      line(marginX, top - 14, marginX + halfWidth, top - 14);
      drawText(doc.preparedBy, marginX, top - 28, { font: 'F2', size: baseFontSize + 1 });
    }
    if (template.showSignatory) {
      line(marginX + halfWidth + gap, top - 14, PAGE_WIDTH - marginX, top - 14);
      drawText(doc.signatoryLabel, PAGE_WIDTH - marginX, top - 28, { font: 'F2', size: baseFontSize + 1, align: 'right' });
    }
    if (theme.footerStyle === 'detailed') drawText(`Generated for ${theme.companyName}`, marginX, top - height + 8, { size: smallFontSize });
    y -= height;
  };

  drawHeader();
  drawPurchaseOrderDetails();
  drawVendorDetails();
  drawBillShipSection();
  drawLineItems();
  drawTotalsSection();
  drawAmountInWords();
  drawTerms();
  drawFooter();

  downloadBlob(createPdf(pages), `${sanitizeText(doc.poNumber) || 'purchase-order'}.pdf`);
};
