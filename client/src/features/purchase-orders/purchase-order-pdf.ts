import type { PurchaseOrderPdfDocument } from './purchase-order-pdf-adapter';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 42;
const FONT_SIZE = 9;
const LINE_HEIGHT = 12;
const CHAR_WIDTH_FACTOR = 0.52;
const PRINT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2);
const DEFAULT_PADDING = 8;
const COMPANY_INFO = [
  'JAKHIRA ERP',
  'Procurement Management System',
  'Email: procurement@jakhira.example',
  'Phone: +91 98765 43210',
];

type PdfPage = string[];
type FontName = 'F1' | 'F2';
type Align = 'left' | 'center' | 'right';

type TableColumn = {
  key: 'index' | 'material' | 'description' | 'quantity' | 'unit' | 'rate' | 'tax' | 'amount';
  label: string;
  width: number;
  align?: Align;
};

type CellBlock = {
  title: string;
  lines: string[];
};

const escapePdfText = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')
  .replace(/\r?\n/g, ' ');
const toPdfString = (value: string) => {
  if (/[^\x00-\x7F]/.test(value)) {
    const utf16 = new Uint16Array(value.length + 1);
    utf16[0] = 0xfeff;
    for (let index = 0; index < value.length; index += 1) utf16[index + 1] = value.charCodeAt(index);
    const hex = Array.from(utf16).map((code) => code.toString(16).padStart(4, '0')).join('');
    return `<${hex}>`;
  }
  return `(${escapePdfText(value)})`;
};
const blobFromBytes = (bytes: Uint8Array) => new Blob([bytes], { type: 'application/pdf' });
const textWidth = (text: string, size = FONT_SIZE) => text.length * size * CHAR_WIDTH_FACTOR;
const sanitizeText = (value: string) => value.replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');
const formatCurrency = (value: string) => sanitizeText(value).replace(/₹|â‚¹/g, '₹');

const wrapText = (text: string, maxWidth: number, size = FONT_SIZE) => {
  const normalized = sanitizeText(text).replace(/\s+/g, ' ').trim();
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
    if (textWidth(word, size) <= maxWidth) {
      current = word;
      continue;
    }

    let segment = '';
    for (const char of word) {
      const joined = `${segment}${char}`;
      if (textWidth(joined, size) > maxWidth && segment) {
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

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
  const boldFontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
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
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const push = (command: string) => currentPage.push(command);
  const line = (x1: number, y1: number, x2: number, y2: number) => push(`${x1} ${y1} m ${x2} ${y2} l S`);
  const rect = (x: number, top: number, width: number, height: number, fill = false) => {
    const bottom = top - height;
    push(`${x} ${bottom} ${width} ${height} re ${fill ? 'B' : 'S'}`);
  };
  const setFillGray = (value: number) => push(`${value} g`);
  const setStrokeGray = (value: number) => push(`${value} G`);
  const setLineWidth = (value: number) => push(`${value} w`);

  const drawText = (text: string, x: number, baselineY: number, options?: { font?: FontName; size?: number; align?: Align }) => {
    const font = options?.font ?? 'F1';
    const size = options?.size ?? FONT_SIZE;
    const align = options?.align ?? 'left';
    const content = sanitizeText(text);
    const renderedWidth = textWidth(content, size);
    const drawX = align === 'right' ? x - renderedWidth : align === 'center' ? x - (renderedWidth / 2) : x;
    push(`BT /${font} ${size} Tf 1 0 0 1 ${drawX} ${baselineY} Tm ${toPdfString(content)} Tj ET`);
  };

  const newPage = () => {
    currentPage = [];
    pages.push(currentPage);
    y = PAGE_HEIGHT - MARGIN_TOP;
  };

  const ensureSpace = (needed: number, reserveFooter = 0) => {
    if (y - needed >= MARGIN_BOTTOM + reserveFooter) return;
    newPage();
  };

  const drawWrappedText = (text: string, x: number, top: number, width: number, options?: { font?: FontName; size?: number; align?: Align; lineHeight?: number }) => {
    const font = options?.font ?? 'F1';
    const size = options?.size ?? FONT_SIZE;
    const align = options?.align ?? 'left';
    const localLineHeight = options?.lineHeight ?? LINE_HEIGHT;
    const lines = wrapText(text, width, size);
    lines.forEach((lineText, index) => {
      const baselineY = top - size - (index * localLineHeight);
      const anchorX = align === 'right' ? x + width : align === 'center' ? x + (width / 2) : x;
      drawText(lineText, anchorX, baselineY, { font, size, align });
    });
    return lines.length * localLineHeight;
  };

  const getBlockHeight = (title: string, lines: string[], width: number) => {
    const titleHeight = LINE_HEIGHT + 4;
    const contentHeight = lines.reduce((total, lineText) => total + (wrapText(lineText, width - (DEFAULT_PADDING * 2)).length * LINE_HEIGHT), 0);
    return Math.max(56, DEFAULT_PADDING + titleHeight + contentHeight + DEFAULT_PADDING);
  };

  const drawTwoColumnSection = (left: CellBlock, right: CellBlock) => {
    const gap = 18;
    const columnWidth = (PRINT_WIDTH - gap) / 2;
    const leftHeight = getBlockHeight(left.title, left.lines, columnWidth);
    const rightHeight = getBlockHeight(right.title, right.lines, columnWidth);
    const sectionHeight = Math.max(leftHeight, rightHeight);
    ensureSpace(sectionHeight + 12);

    const top = y;
    setLineWidth(0.6);
    setStrokeGray(0.35);
    rect(MARGIN_X, top, columnWidth, sectionHeight);
    rect(MARGIN_X + columnWidth + gap, top, columnWidth, sectionHeight);

    const drawCell = (cell: CellBlock, x: number) => {
      setFillGray(0.96);
      rect(x, top, columnWidth, 24, true);
      setFillGray(0);
      drawText(cell.title, x + DEFAULT_PADDING, top - 16, { font: 'F2', size: 10 });
      let cursorTop = top - 32;
      for (const lineText of cell.lines) {
        cursorTop -= drawWrappedText(lineText, x + DEFAULT_PADDING, cursorTop, columnWidth - (DEFAULT_PADDING * 2), { size: FONT_SIZE, lineHeight: LINE_HEIGHT }) - LINE_HEIGHT;
        cursorTop -= 2;
      }
    };

    drawCell(left, MARGIN_X);
    drawCell(right, MARGIN_X + columnWidth + gap);
    y -= sectionHeight + 14;
  };

  const drawHeader = () => {
    const headerTop = y;
    const leftWidth = PRINT_WIDTH * 0.54;
    const rightWidth = PRINT_WIDTH - leftWidth;
    const companyLines = COMPANY_INFO;
    const metaLines = [
      ['PO Number', doc.poNumber],
      ['Order Date', doc.orderDate],
      ['Status', doc.status],
      ['Expected Date', doc.expectedDate],
    ] as const;
    const companyHeight = 22 + companyLines.reduce((sum, lineText) => sum + (wrapText(lineText, leftWidth - 4, lineText === COMPANY_INFO[0] ? 15 : FONT_SIZE).length * (lineText === COMPANY_INFO[0] ? 16 : LINE_HEIGHT)), 0);
    const metaHeight = 34 + (metaLines.length * 18);
    const headerHeight = Math.max(companyHeight, metaHeight) + 12;
    ensureSpace(headerHeight + 18);

    let leftCursor = headerTop;
    drawText(COMPANY_INFO[0], MARGIN_X, leftCursor - 16, { font: 'F2', size: 15 });
    leftCursor -= 26;
    for (const infoLine of COMPANY_INFO.slice(1)) {
      leftCursor -= drawWrappedText(infoLine, MARGIN_X, leftCursor, leftWidth - 8, { size: FONT_SIZE }) - LINE_HEIGHT;
      leftCursor -= 2;
    }

    const rightX = MARGIN_X + leftWidth;
    drawText('PURCHASE ORDER', PAGE_WIDTH - MARGIN_X, headerTop - 18, { font: 'F2', size: 16, align: 'right' });
    let metaY = headerTop - 42;
    metaLines.forEach(([label, value]) => {
      drawText(`${label}:`, rightX, metaY, { font: 'F2', size: 9 });
      drawWrappedText(value, rightX + 78, metaY + 9, rightWidth - 78, { size: 9 });
      metaY -= 18;
    });

    y -= headerHeight;
    setLineWidth(0.9);
    setStrokeGray(0.5);
    line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
    y -= 16;
  };

  const tableColumns: TableColumn[] = [
    { key: 'index', label: '#', width: 26, align: 'center' },
    { key: 'material', label: 'Material Code / Material', width: 108 },
    { key: 'description', label: 'Description', width: 141 },
    { key: 'quantity', label: 'Qty', width: 42, align: 'right' },
    { key: 'unit', label: 'Unit', width: 42, align: 'center' },
    { key: 'rate', label: 'Rate', width: 56, align: 'right' },
    { key: 'tax', label: 'Tax', width: 40, align: 'right' },
    { key: 'amount', label: 'Amount', width: 60, align: 'right' },
  ];

  const drawTableHeader = () => {
    ensureSpace(30);
    setLineWidth(0.5);
    setStrokeGray(0.35);
    setFillGray(0.93);
    rect(MARGIN_X, y, PRINT_WIDTH, 24, true);
    setFillGray(0);

    let cursorX = MARGIN_X;
    tableColumns.forEach((column) => {
      line(cursorX, y, cursorX, y - 24);
      drawText(column.label, column.align === 'right' ? cursorX + column.width - 6 : column.align === 'center' ? cursorX + (column.width / 2) : cursorX + 6, y - 15, { font: 'F2', size: 8, align: column.align === 'right' ? 'right' : column.align === 'center' ? 'center' : 'left' });
      cursorX += column.width;
    });
    line(MARGIN_X + PRINT_WIDTH, y, MARGIN_X + PRINT_WIDTH, y - 24);
    line(MARGIN_X, y, MARGIN_X + PRINT_WIDTH, y);
    line(MARGIN_X, y - 24, MARGIN_X + PRINT_WIDTH, y - 24);
    y -= 24;
  };

  const drawLineItems = () => {
    drawText('LINE ITEMS', MARGIN_X, y - 2, { font: 'F2', size: 11 });
    y -= 16;
    drawTableHeader();

    doc.lineItems.forEach((item, index) => {
      const valueMap = {
        index: String(index + 1),
        material: item.materialLabel,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        rate: formatCurrency(item.rate),
        tax: item.tax,
        amount: formatCurrency(item.amount),
      };

      const rowLineCounts = tableColumns.map((column) => wrapText(valueMap[column.key], column.width - 12, 8).length);
      const rowHeight = Math.max(22, Math.max(...rowLineCounts) * 10 + 10);
      if (y - rowHeight < MARGIN_BOTTOM + 160) {
        newPage();
        drawHeader();
        drawText('LINE ITEMS (CONTINUED)', MARGIN_X, y - 2, { font: 'F2', size: 11 });
        y -= 16;
        drawTableHeader();
      }

      let cursorX = MARGIN_X;
      setLineWidth(0.4);
      setStrokeGray(0.55);
      rect(MARGIN_X, y, PRINT_WIDTH, rowHeight);
      tableColumns.forEach((column) => {
        line(cursorX, y, cursorX, y - rowHeight);
        const lines = wrapText(valueMap[column.key], column.width - 12, 8);
        const contentTop = y - 8;
        lines.forEach((lineText, lineIndex) => {
          const baselineY = contentTop - 8 - (lineIndex * 10);
          const anchorX = column.align === 'right'
            ? cursorX + column.width - 6
            : column.align === 'center'
              ? cursorX + (column.width / 2)
              : cursorX + 6;
          drawText(lineText, anchorX, baselineY, { size: 8, align: column.align ?? 'left' });
        });
        cursorX += column.width;
      });
      line(MARGIN_X + PRINT_WIDTH, y, MARGIN_X + PRINT_WIDTH, y - rowHeight);
      y -= rowHeight;
    });
  };

  const drawBottomSummary = () => {
    const leftWidth = PRINT_WIDTH * 0.65;
    const rightWidth = PRINT_WIDTH - leftWidth;
    const leftLines = doc.remarks.length ? doc.remarks : ['No remarks'];
    const summaryRows = [
      ['Subtotal', formatCurrency(doc.subtotal)],
      ['Discount', formatCurrency(doc.discount)],
      ['Tax', formatCurrency(doc.tax)],
    ];
    const remarksHeight = Math.max(64, 28 + leftLines.reduce((sum, lineText) => sum + (wrapText(lineText, leftWidth - (DEFAULT_PADDING * 2)).length * LINE_HEIGHT), 0));
    const summaryHeight = 28 + (summaryRows.length * 18) + 28;
    const sectionHeight = Math.max(remarksHeight, summaryHeight);
    ensureSpace(sectionHeight + 14, 84);

    const top = y - 14;
    setLineWidth(0.6);
    setStrokeGray(0.35);
    rect(MARGIN_X, top, PRINT_WIDTH, sectionHeight);
    line(MARGIN_X + leftWidth, top, MARGIN_X + leftWidth, top - sectionHeight);

    setFillGray(0.96);
    rect(MARGIN_X, top, leftWidth, 24, true);
    rect(MARGIN_X + leftWidth, top, rightWidth, 24, true);
    setFillGray(0);
    drawText('Terms & Conditions / Notes', MARGIN_X + DEFAULT_PADDING, top - 16, { font: 'F2', size: 10 });
    drawText('Order Summary', MARGIN_X + leftWidth + DEFAULT_PADDING, top - 16, { font: 'F2', size: 10 });

    let leftCursor = top - 32;
    leftLines.forEach((lineText) => {
      leftCursor -= drawWrappedText(lineText, MARGIN_X + DEFAULT_PADDING, leftCursor, leftWidth - (DEFAULT_PADDING * 2), { size: FONT_SIZE }) - LINE_HEIGHT;
      leftCursor -= 2;
    });

    let summaryY = top - 40;
    summaryRows.forEach(([label, value]) => {
      drawText(label, MARGIN_X + leftWidth + DEFAULT_PADDING, summaryY, { size: 9 });
      drawText(value, MARGIN_X + PRINT_WIDTH - DEFAULT_PADDING, summaryY, { size: 9, font: 'F2', align: 'right' });
      summaryY -= 18;
    });
    line(MARGIN_X + leftWidth + DEFAULT_PADDING, summaryY + 6, MARGIN_X + PRINT_WIDTH - DEFAULT_PADDING, summaryY + 6);
    drawText('Grand Total', MARGIN_X + leftWidth + DEFAULT_PADDING, summaryY - 10, { font: 'F2', size: 10 });
    drawText(formatCurrency(doc.grandTotal), MARGIN_X + PRINT_WIDTH - DEFAULT_PADDING, summaryY - 10, { font: 'F2', size: 12, align: 'right' });

    y = top - sectionHeight - 18;
  };

  const drawFooter = () => {
    const footerHeight = 56;
    ensureSpace(footerHeight);
    const top = y;
    const halfWidth = (PRINT_WIDTH - 24) / 2;
    setLineWidth(0.5);
    setStrokeGray(0.45);
    line(MARGIN_X, top - 14, MARGIN_X + halfWidth, top - 14);
    line(MARGIN_X + halfWidth + 24, top - 14, PAGE_WIDTH - MARGIN_X, top - 14);
    drawText('Prepared By', MARGIN_X, top - 28, { font: 'F2', size: 10 });
    drawText('Approved By / Authorized Signatory', PAGE_WIDTH - MARGIN_X, top - 28, { font: 'F2', size: 10, align: 'right' });
    drawText('JAKHIRA ERP Procurement Team', MARGIN_X, top - 44, { size: 9 });
    drawText('For JAKHIRA ERP', PAGE_WIDTH - MARGIN_X, top - 44, { size: 9, align: 'right' });
    y -= footerHeight;
  };

  drawHeader();
  drawTwoColumnSection(
    { title: 'Vendor Details', lines: doc.vendorDetails },
    { title: 'Site Details', lines: doc.siteDetails },
  );
  drawTwoColumnSection(
    { title: 'Billing Address', lines: doc.billingAddress },
    { title: 'Shipping Address', lines: doc.shippingAddress },
  );
  drawLineItems();
  y -= 12;
  drawBottomSummary();
  drawFooter();

  downloadBlob(createPdf(pages), `${doc.poNumber}.pdf`);
};
