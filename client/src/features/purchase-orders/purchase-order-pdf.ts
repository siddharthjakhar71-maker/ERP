import type { PurchaseOrderPdfDocument } from './purchase-order-pdf-adapter';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 40;
const MARGIN_TOP = 44;
const MARGIN_BOTTOM = 42;
const FONT_SIZE = 9;
const SMALL_FONT_SIZE = 8;
const LINE_HEIGHT = 12;
const CHAR_WIDTH_FACTOR = 0.52;
const PRINT_WIDTH = PAGE_WIDTH - (MARGIN_X * 2);
const DEFAULT_PADDING = 8;
const SECTION_GAP = 12;
const BOX_TITLE_HEIGHT = 20;
const LIGHT_FILL = 0.95;
const BORDER_GRAY = 0.55;
const TEXT_GRAY = 0;
const COMPANY_INFO = [
  'JAKHIRA ERP',
  'Procurement Management System',
  'Email: procurement@jakhira.example',
  'Phone: +91 98765 43210',
];

const EMPTY_VALUE = 'Not provided';

type PdfPage = string[];
type FontName = 'F1' | 'F2';
type Align = 'left' | 'center' | 'right';

type TableColumn = {
  key: 'index' | 'description' | 'unit' | 'quantity' | 'rate' | 'amount';
  label: string;
  width: number;
  align?: Align;
};

type LabeledValue = {
  label: string;
  value: string;
};

type BoxOptions = {
  title?: string;
  shadedTitle?: boolean;
};

const escapePdfText = (value: string) => value
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)')
  .replace(/\r?\n/g, ' ');

const sanitizeText = (value: string) => value
  .replace(/[\u2013\u2014]/g, '-')
  .replace(/[\u2018\u2019]/g, "'")
  .replace(/[\u201C\u201D]/g, '"')
  .replace(/₹|â‚¹/g, 'Rs.')
  .replace(/[^\x20-\x7E]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const toPdfString = (value: string) => `(${escapePdfText(sanitizeText(value))})`;
const blobFromBytes = (bytes: Uint8Array) => new Blob([bytes], { type: 'application/pdf' });
const textWidth = (text: string, size = FONT_SIZE) => sanitizeText(text).length * size * CHAR_WIDTH_FACTOR;
const formatCurrency = (value: string) => sanitizeText(value).replace(/Rs\.\s*/g, 'Rs. ');

const wrapText = (text: string, maxWidth: number, size = FONT_SIZE) => {
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

const extractFieldValue = (lines: string[], prefixes: string[]) => {
  const match = lines.find((line) => prefixes.some((prefix) => line.toLowerCase().startsWith(prefix.toLowerCase())));
  if (!match) return '';
  const separatorIndex = match.indexOf(':');
  return separatorIndex >= 0 ? match.slice(separatorIndex + 1).trim() : match.trim();
};

const splitVendorDetails = (lines: string[]) => {
  const [vendorName = EMPTY_VALUE, ...rest] = lines;
  const addressLines = rest.filter((line) => !/^(Code|Phone|Email):/i.test(line));
  return {
    vendorName,
    address: addressLines.length ? addressLines.join(', ') : EMPTY_VALUE,
    contactPerson: EMPTY_VALUE,
    phone: extractFieldValue(lines, ['Phone:']) || EMPTY_VALUE,
    email: extractFieldValue(lines, ['Email:']) || EMPTY_VALUE,
  };
};

const splitProjectDetails = (lines: string[]) => {
  const [projectName = EMPTY_VALUE, ...rest] = lines;
  const addressLines = rest.filter((line) => !/^(Code|Location):/i.test(line));
  return {
    projectName,
    projectAddress: addressLines.length ? addressLines.join(', ') : EMPTY_VALUE,
  };
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
  if (remainder >= 20) {
    parts.push(`${tens[Math.floor(remainder / 10)]}${remainder % 10 ? ` ${ones[remainder % 10]}` : ''}`.trim());
  } else if (remainder >= 10) {
    parts.push(teens[remainder - 10]);
  } else if (remainder > 0) {
    parts.push(ones[remainder]);
  }

  return parts.join(' ').trim();
};

const numberToIndianWords = (value: number) => {
  if (value === 0) return 'Zero';

  const segments: Array<[number, string]> = [
    [10000000, 'Crore'],
    [100000, 'Lakh'],
    [1000, 'Thousand'],
  ];

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

const amountToWords = (amount: string) => {
  const numeric = parseAmountNumber(amount);
  const rupees = Math.floor(numeric);
  const paise = Math.round((numeric - rupees) * 100);
  const rupeeWords = numberToIndianWords(rupees);
  if (paise > 0) return `Amount in Words: Rupees ${rupeeWords} and ${numberToIndianWords(paise)} Paise Only`;
  return `Amount in Words: Rupees ${rupeeWords} Only`;
};

export const downloadPurchaseOrderPdf = (doc: PurchaseOrderPdfDocument) => {
  const pages: PdfPage[] = [[]];
  let currentPage = pages[0];
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const projectDetails = splitProjectDetails(doc.siteDetails);
  const vendorDetails = splitVendorDetails(doc.vendorDetails);

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

  const ensureSpace = (needed: number) => {
    if (y - needed >= MARGIN_BOTTOM) return;
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

  const measureLabeledValue = (field: LabeledValue, width: number) => {
    const labelWidth = Math.min(width * 0.36, 110);
    const valueWidth = width - labelWidth - 6;
    const valueLines = wrapText(field.value || EMPTY_VALUE, valueWidth, FONT_SIZE);
    return Math.max(LINE_HEIGHT, valueLines.length * LINE_HEIGHT);
  };

  const drawLabeledValue = (field: LabeledValue, x: number, top: number, width: number) => {
    const labelWidth = Math.min(width * 0.36, 110);
    const valueX = x + labelWidth + 6;
    const valueWidth = width - labelWidth - 6;
    drawText(field.label, x, top - FONT_SIZE, { font: 'F2', size: FONT_SIZE });
    const usedHeight = drawWrappedText(field.value || EMPTY_VALUE, valueX, top, valueWidth, { size: FONT_SIZE, lineHeight: LINE_HEIGHT });
    return Math.max(LINE_HEIGHT, usedHeight);
  };

  const drawBox = (top: number, height: number, x = MARGIN_X, width = PRINT_WIDTH, options?: BoxOptions) => {
    setLineWidth(0.6);
    setStrokeGray(BORDER_GRAY);
    rect(x, top, width, height, false);
    if (options?.title) {
      if (options.shadedTitle !== false) {
        setFillGray(LIGHT_FILL);
        rect(x, top, width, BOX_TITLE_HEIGHT, true);
        setFillGray(TEXT_GRAY);
      }
      drawText(options.title, x + DEFAULT_PADDING, top - 14, { font: 'F2', size: 10 });
    }
  };

  function drawHeader() {
    const leftWidth = PRINT_WIDTH * 0.55;
    const metaRows: LabeledValue[] = [
      { label: 'PO Number', value: doc.poNumber },
      { label: 'Date', value: doc.orderDate },
      { label: 'Status', value: doc.status },
    ];

    const companyHeights = [18, ...COMPANY_INFO.slice(1).map((lineText) => wrapText(lineText, leftWidth - 4, SMALL_FONT_SIZE).length * 10)];
    const companyHeight = companyHeights.reduce((sum, height) => sum + height, 0) + 10;
    const metaHeight = 24 + (metaRows.length * 16);
    const headerHeight = Math.max(companyHeight, metaHeight);
    ensureSpace(headerHeight + 18);

    const top = y;
    let leftCursor = top;
    drawText(COMPANY_INFO[0], MARGIN_X, leftCursor - 16, { font: 'F2', size: 16 });
    leftCursor -= 24;
    COMPANY_INFO.slice(1).forEach((infoLine) => {
      const usedHeight = drawWrappedText(infoLine, MARGIN_X, leftCursor, leftWidth - 6, { size: SMALL_FONT_SIZE, lineHeight: 10 });
      leftCursor -= usedHeight + 2;
    });

    drawText('PURCHASE ORDER', PAGE_WIDTH - MARGIN_X, top - 18, { font: 'F2', size: 17, align: 'right' });
    let metaCursor = top - 40;
    metaRows.forEach((row) => {
      drawText(`${row.label}:`, MARGIN_X + leftWidth + 28, metaCursor, { font: 'F2', size: 9 });
      drawText(row.value || EMPTY_VALUE, PAGE_WIDTH - MARGIN_X, metaCursor, { size: 9, align: 'right' });
      metaCursor -= 16;
    });

    y = top - headerHeight;
    setLineWidth(0.8);
    setStrokeGray(BORDER_GRAY);
    line(MARGIN_X, y, PAGE_WIDTH - MARGIN_X, y);
    y -= SECTION_GAP;
  }

  const drawPurchaseOrderDetails = () => {
    const gap = 16;
    const columnWidth = (PRINT_WIDTH - gap - (DEFAULT_PADDING * 2)) / 2;
    const leftFields: LabeledValue[] = [
      { label: 'Project Name', value: projectDetails.projectName },
      { label: 'Project Address', value: projectDetails.projectAddress },
      { label: 'PO Number', value: doc.poNumber },
    ];
    const rightFields: LabeledValue[] = [
      { label: 'PO Date', value: doc.orderDate },
      { label: 'Billing Name', value: doc.billingAddress[0] || EMPTY_VALUE },
      { label: 'Billing Address', value: doc.billingAddress.join(', ') || EMPTY_VALUE },
    ];

    const leftContentHeight = leftFields.reduce((sum, field) => sum + measureLabeledValue(field, columnWidth) + 6, 0);
    const rightContentHeight = rightFields.reduce((sum, field) => sum + measureLabeledValue(field, columnWidth) + 6, 0);
    const height = Math.max(84, BOX_TITLE_HEIGHT + DEFAULT_PADDING + Math.max(leftContentHeight, rightContentHeight) + DEFAULT_PADDING);
    ensureSpace(height + SECTION_GAP);

    const top = y;
    drawBox(top, height, MARGIN_X, PRINT_WIDTH, { title: 'Purchase Order Details' });
    const innerX = MARGIN_X + DEFAULT_PADDING;
    const innerTop = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
    const dividerX = innerX + columnWidth + (gap / 2);
    line(dividerX, top - BOX_TITLE_HEIGHT, dividerX, top - height + DEFAULT_PADDING);

    let leftCursor = innerTop;
    leftFields.forEach((field) => {
      leftCursor -= drawLabeledValue(field, innerX, leftCursor, columnWidth) + 6;
    });

    let rightCursor = innerTop;
    rightFields.forEach((field) => {
      rightCursor -= drawLabeledValue(field, dividerX + (gap / 2), rightCursor, columnWidth) + 6;
    });

    y -= height + SECTION_GAP;
  };

  const drawVendorDetails = () => {
    const fields: LabeledValue[] = [
      { label: 'Vendor Name', value: vendorDetails.vendorName },
      { label: 'Address', value: vendorDetails.address },
      { label: 'Contact Person', value: vendorDetails.contactPerson },
      { label: 'Phone / Email', value: [vendorDetails.phone, vendorDetails.email].filter(Boolean).join(' / ') || EMPTY_VALUE },
    ];
    const contentHeight = fields.reduce((sum, field) => sum + measureLabeledValue(field, PRINT_WIDTH - (DEFAULT_PADDING * 2)) + 6, 0);
    const height = BOX_TITLE_HEIGHT + DEFAULT_PADDING + contentHeight + DEFAULT_PADDING;
    ensureSpace(height + SECTION_GAP);

    const top = y;
    drawBox(top, height, MARGIN_X, PRINT_WIDTH, { title: 'Vendor Details' });
    let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
    fields.forEach((field) => {
      cursor -= drawLabeledValue(field, MARGIN_X + DEFAULT_PADDING, cursor, PRINT_WIDTH - (DEFAULT_PADDING * 2)) + 6;
    });

    y -= height + SECTION_GAP;
  };

  const measureAddressBox = (lines: string[], width: number) => {
    const contentHeight = (lines.length ? lines : [EMPTY_VALUE]).reduce((sum, lineText) => sum + wrapText(lineText, width - (DEFAULT_PADDING * 2), FONT_SIZE).length * LINE_HEIGHT, 0);
    return BOX_TITLE_HEIGHT + DEFAULT_PADDING + contentHeight + DEFAULT_PADDING;
  };

  const drawAddressBox = (title: string, lines: string[], x: number, top: number, width: number, height: number) => {
    drawBox(top, height, x, width, { title });
    let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
    (lines.length ? lines : [EMPTY_VALUE]).forEach((lineText) => {
      const usedHeight = drawWrappedText(lineText, x + DEFAULT_PADDING, cursor, width - (DEFAULT_PADDING * 2), { size: FONT_SIZE, lineHeight: LINE_HEIGHT });
      cursor -= usedHeight;
    });
  };

  const drawBillShipSection = () => {
    const gap = 16;
    const boxWidth = (PRINT_WIDTH - gap) / 2;
    const leftHeight = measureAddressBox(doc.billingAddress, boxWidth);
    const rightHeight = measureAddressBox(doc.shippingAddress, boxWidth);
    const height = Math.max(leftHeight, rightHeight, 86);
    ensureSpace(height + SECTION_GAP);

    const top = y;
    drawAddressBox('Bill To', doc.billingAddress, MARGIN_X, top, boxWidth, height);
    drawAddressBox('Ship To', doc.shippingAddress, MARGIN_X + boxWidth + gap, top, boxWidth, height);
    y -= height + SECTION_GAP;
  };

  const tableColumns: TableColumn[] = [
    { key: 'index', label: 'Sr. No.', width: 42, align: 'center' },
    { key: 'description', label: 'Description', width: 239, align: 'left' },
    { key: 'unit', label: 'Unit', width: 46, align: 'center' },
    { key: 'quantity', label: 'Qty', width: 52, align: 'right' },
    { key: 'rate', label: 'Unit Price', width: 68, align: 'right' },
    { key: 'amount', label: 'Amount', width: 68, align: 'right' },
  ];

  const drawTableHeader = () => {
    setLineWidth(0.5);
    setStrokeGray(BORDER_GRAY);
    setFillGray(LIGHT_FILL);
    rect(MARGIN_X, y, PRINT_WIDTH, 22, true);
    setFillGray(TEXT_GRAY);
    line(MARGIN_X, y, MARGIN_X + PRINT_WIDTH, y);
    line(MARGIN_X, y - 22, MARGIN_X + PRINT_WIDTH, y - 22);

    let x = MARGIN_X;
    tableColumns.forEach((column) => {
      line(x, y, x, y - 22);
      const anchorX = column.align === 'right'
        ? x + column.width - 6
        : column.align === 'center'
          ? x + (column.width / 2)
          : x + 6;
      drawText(column.label, anchorX, y - 14, { font: 'F2', size: 8, align: column.align ?? 'left' });
      x += column.width;
    });
    line(MARGIN_X + PRINT_WIDTH, y, MARGIN_X + PRINT_WIDTH, y - 22);
    y -= 22;
  };

  const drawLineItems = () => {
    const titleHeight = 16;
    ensureSpace(titleHeight + 26);
    drawText('Line Items', MARGIN_X, y - 2, { font: 'F2', size: 11 });
    y -= titleHeight;
    drawTableHeader();

    doc.lineItems.forEach((item, index) => {
      const rowValues: Record<TableColumn['key'], string> = {
        index: String(index + 1),
        description: `${item.materialLabel}${item.description ? ` - ${item.description}` : ''}`,
        unit: item.unit,
        quantity: item.quantity,
        rate: formatCurrency(item.rate),
        amount: formatCurrency(item.amount),
      };

      const rowHeight = Math.max(
        22,
        ...tableColumns.map((column) => {
          const innerWidth = column.width - 12;
          const lineCount = wrapText(rowValues[column.key] || EMPTY_VALUE, innerWidth, 8).length;
          return (lineCount * 10) + 8;
        }),
      );

      if (y - rowHeight < MARGIN_BOTTOM + 180) {
        newPage();
        drawHeader();
        drawText('Line Items', MARGIN_X, y - 2, { font: 'F2', size: 11 });
        y -= titleHeight;
        drawTableHeader();
      }

      setLineWidth(0.45);
      setStrokeGray(BORDER_GRAY);
      rect(MARGIN_X, y, PRINT_WIDTH, rowHeight);
      let x = MARGIN_X;
      tableColumns.forEach((column) => {
        line(x, y, x, y - rowHeight);
        const innerWidth = column.width - 12;
        const lines = wrapText(rowValues[column.key] || EMPTY_VALUE, innerWidth, 8);
        const textTop = y - 6;
        lines.forEach((lineText, lineIndex) => {
          const anchorX = column.align === 'right'
            ? x + column.width - 6
            : column.align === 'center'
              ? x + (column.width / 2)
              : x + 6;
          drawText(lineText, anchorX, textTop - 8 - (lineIndex * 10), { size: 8, align: column.align ?? 'left' });
        });
        x += column.width;
      });
      line(MARGIN_X + PRINT_WIDTH, y, MARGIN_X + PRINT_WIDTH, y - rowHeight);
      y -= rowHeight;
    });

    y -= SECTION_GAP;
  };

  const drawTotalsSection = () => {
    const blockWidth = 190;
    const leftWidth = PRINT_WIDTH - blockWidth - 12;
    const rows: LabeledValue[] = [
      { label: 'Subtotal', value: formatCurrency(doc.subtotal) },
      { label: 'Discount', value: formatCurrency(doc.discount) },
      { label: 'GST / Tax', value: formatCurrency(doc.tax) },
    ];
    const height = 78;
    ensureSpace(height + SECTION_GAP + 80);

    const top = y;
    drawBox(top, height, MARGIN_X + leftWidth + 12, blockWidth, { shadedTitle: false });

    let cursor = top - 18;
    rows.forEach((row) => {
      drawText(row.label, MARGIN_X + leftWidth + 24, cursor, { size: 9 });
      drawText(row.value, PAGE_WIDTH - MARGIN_X - 10, cursor, { size: 9, align: 'right' });
      cursor -= 16;
    });
    line(MARGIN_X + leftWidth + 20, cursor + 6, PAGE_WIDTH - MARGIN_X - 10, cursor + 6);
    drawText('Grand Total', MARGIN_X + leftWidth + 24, cursor - 10, { font: 'F2', size: 10 });
    drawText(formatCurrency(doc.grandTotal), PAGE_WIDTH - MARGIN_X - 10, cursor - 10, { font: 'F2', size: 12, align: 'right' });
    y -= height + SECTION_GAP;
  };

  const drawAmountInWords = () => {
    const text = amountToWords(doc.grandTotal);
    const height = Math.max(36, BOX_TITLE_HEIGHT + DEFAULT_PADDING + wrapText(text, PRINT_WIDTH - (DEFAULT_PADDING * 2), FONT_SIZE).length * LINE_HEIGHT + DEFAULT_PADDING);
    ensureSpace(height + SECTION_GAP);

    const top = y;
    drawBox(top, height, MARGIN_X, PRINT_WIDTH, { title: 'Amount in Words' });
    drawWrappedText(text, MARGIN_X + DEFAULT_PADDING, top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4, PRINT_WIDTH - (DEFAULT_PADDING * 2), { size: FONT_SIZE, lineHeight: LINE_HEIGHT });
    y -= height + SECTION_GAP;
  };

  const drawTerms = () => {
    const remarks = doc.remarks.length ? doc.remarks.join(' ') : 'No remarks';
    const wrappedLines = wrapText(remarks, PRINT_WIDTH - (DEFAULT_PADDING * 2), FONT_SIZE);
    const height = BOX_TITLE_HEIGHT + DEFAULT_PADDING + (wrappedLines.length * LINE_HEIGHT) + DEFAULT_PADDING;
    ensureSpace(height + SECTION_GAP + 56);

    const top = y;
    drawBox(top, height, MARGIN_X, PRINT_WIDTH, { title: 'Terms & Conditions' });
    drawWrappedText(remarks, MARGIN_X + DEFAULT_PADDING, top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4, PRINT_WIDTH - (DEFAULT_PADDING * 2), { size: FONT_SIZE, lineHeight: LINE_HEIGHT });
    y -= height + SECTION_GAP;
  };

  const drawFooter = () => {
    const height = 48;
    ensureSpace(height);
    const top = y;
    const gap = 40;
    const halfWidth = (PRINT_WIDTH - gap) / 2;
    setLineWidth(0.5);
    setStrokeGray(BORDER_GRAY);
    line(MARGIN_X, top - 14, MARGIN_X + halfWidth, top - 14);
    line(MARGIN_X + halfWidth + gap, top - 14, PAGE_WIDTH - MARGIN_X, top - 14);
    drawText('Prepared By', MARGIN_X, top - 28, { font: 'F2', size: 10 });
    drawText('Authorized Signatory', PAGE_WIDTH - MARGIN_X, top - 28, { font: 'F2', size: 10, align: 'right' });
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
