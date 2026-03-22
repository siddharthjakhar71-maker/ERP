import type {
  PoLayoutSettings,
  PoPdfBlockKey,
  PoPdfLayoutRow,
  PurchaseOrderPdfBlockConfig,
} from '@/types';
import type { PurchaseOrderPdfDocument } from './purchase-order-pdf-adapter';

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const EMPTY_VALUE = 'Not provided';
const CHAR_WIDTH_FACTOR = 0.52;
const DEFAULT_PADDING = 8;
const BOX_TITLE_HEIGHT = 20;
const ROW_GAP = 16;

export const PO_PDF_BLOCK_KEYS: PoPdfBlockKey[] = ['header', 'poDetails', 'vendorDetails', 'billTo', 'shipTo', 'lineItems', 'totals', 'amountInWords', 'terms', 'footer'];

const DEFAULT_BLOCK_ROWS: Array<{ columns: 1 | 2 | 3; blocks: Array<{ key: PoPdfBlockKey; span?: number; visible?: boolean }> }> = [
  { columns: 1, blocks: [{ key: 'header' }] },
  { columns: 1, blocks: [{ key: 'poDetails' }] },
  { columns: 2, blocks: [{ key: 'vendorDetails', span: 2 }, { key: 'billTo' }, { key: 'shipTo' }] },
  { columns: 1, blocks: [{ key: 'lineItems' }] },
  { columns: 1, blocks: [{ key: 'totals' }] },
  { columns: 1, blocks: [{ key: 'amountInWords' }] },
  { columns: 1, blocks: [{ key: 'terms' }] },
  { columns: 1, blocks: [{ key: 'footer' }] },
];

export const createDefaultPoPdfLayoutRows = (): PoPdfLayoutRow[] => DEFAULT_BLOCK_ROWS.map((row, rowIndex) => ({
  id: `row-${rowIndex + 1}`,
  columns: row.columns,
  blocks: row.blocks.map((block, blockIndex) => ({
    id: `${block.key}-${rowIndex + 1}-${blockIndex + 1}`,
    key: block.key,
    span: Math.min(block.span ?? 1, row.columns),
    visible: block.visible ?? true,
  })),
}));

const escapePdfText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)').replace(/\r?\n/g, ' ');
const sanitizeText = (value: string) => value.replace(/[\u2013\u2014]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"').replace(/[^\x20-\x7E]/g, ' ').replace(/\s+/g, ' ').trim();
const toPdfString = (value: string) => `(${escapePdfText(sanitizeText(value))})`;
const blobFromBytes = (bytes: Uint8Array) => new Blob([bytes], { type: 'application/pdf' });
const textWidth = (text: string, size: number) => sanitizeText(text).length * size * CHAR_WIDTH_FACTOR;

type PdfPage = string[];
type FontName = 'F1' | 'F2';
type Align = 'left' | 'center' | 'right';
type TableColumnKey = 'index' | 'description' | 'unit' | 'quantity' | 'rate' | 'amount';

type TableColumn = { key: TableColumnKey; label: string; width: number; align?: Align };
type LabeledValue = { label: string; value: string };
type BoxOptions = { title?: string; shadedTitle?: boolean };
type BlockRect = { x: number; y: number; width: number };
type BlockMeasure = { height: number; pageBreakBefore?: boolean };

type TableRowState = { index: string; description: string; unit: string; quantity: string; rate: string; amount: string };

type PdfRenderContext = {
  doc: PurchaseOrderPdfDocument;
  layout: PoLayoutSettings;
  normalizedRows: PoPdfLayoutRow[];
  printWidth: number;
  marginX: number;
  marginTop: number;
  marginBottom: number;
  baseFontSize: number;
  smallFontSize: number;
  tableFontSize: number;
  lineHeight: number;
  sectionGap: number;
  borderGray: number;
  accentColor: [number, number, number];
  vendorDetails: ReturnType<typeof splitVendorDetails>;
  visibleFields: Set<string>;
  visibleColumns: TableColumnKey[];
  currentPage: PdfPage;
  pages: PdfPage[];
  cursorY: number;
  getAvailableHeight: () => number;
  setCursorY: (value: number) => void;
  push: (command: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  rect: (x: number, top: number, width: number, height: number, fill?: boolean) => void;
  setFillColor: (r: number, g: number, b: number) => void;
  setStrokeGray: (value: number) => void;
  setLineWidth: (value: number) => void;
  setBorderStyle: () => void;
  drawText: (text: string, x: number, baselineY: number, options?: { font?: FontName; size?: number; align?: Align }) => void;
  drawWrappedText: (text: string, x: number, top: number, width: number, options?: { font?: FontName; size?: number; align?: Align; rowGap?: number }) => number;
  drawBox: (top: number, height: number, x: number, width: number, options?: BoxOptions) => void;
  ensureSpace: (needed: number) => void;
  newPage: () => void;
};

type BlockRenderer = {
  measure: (ctx: PdfRenderContext, rect: BlockRect) => BlockMeasure;
  draw: (ctx: PdfRenderContext, rect: BlockRect, top: number, height: number) => void;
};

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

const measureLabeledValue = (ctx: PdfRenderContext, field: LabeledValue, width: number) => {
  const labelWidth = Math.min(width * 0.34, 110);
  const valueWidth = width - labelWidth - 6;
  return Math.max(ctx.lineHeight, wrapText(field.value || EMPTY_VALUE, valueWidth, ctx.baseFontSize).length * ctx.lineHeight);
};
const drawLabeledValue = (ctx: PdfRenderContext, field: LabeledValue, x: number, top: number, width: number) => {
  const labelWidth = Math.min(width * 0.34, 110);
  ctx.drawText(field.label, x, top - ctx.baseFontSize, { font: 'F2', size: ctx.baseFontSize });
  const usedHeight = ctx.drawWrappedText(field.value || EMPTY_VALUE, x + labelWidth + 6, top, width - labelWidth - 6, { size: ctx.baseFontSize, rowGap: ctx.lineHeight });
  return Math.max(ctx.lineHeight, usedHeight);
};
const measureAddressBox = (ctx: PdfRenderContext, lines: string[], width: number) => BOX_TITLE_HEIGHT + DEFAULT_PADDING + (lines.length ? lines : [EMPTY_VALUE]).reduce((sum, lineText) => sum + wrapText(lineText, width - (DEFAULT_PADDING * 2), ctx.baseFontSize).length * ctx.lineHeight, 0) + DEFAULT_PADDING;
const drawAddressBox = (ctx: PdfRenderContext, title: string, lines: string[], x: number, top: number, width: number, height: number) => {
  ctx.drawBox(top, height, x, width, { title });
  let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
  (lines.length ? lines : [EMPTY_VALUE]).forEach((lineText) => {
    cursor -= ctx.drawWrappedText(lineText, x + DEFAULT_PADDING, cursor, width - (DEFAULT_PADDING * 2), { size: ctx.baseFontSize, rowGap: ctx.lineHeight });
  });
};

const buildLineItemRows = (doc: PurchaseOrderPdfDocument) => doc.lineItems.map<TableRowState>((item, index) => ({
  index: String(index + 1),
  description: `${item.materialLabel}${item.description ? ` - ${item.description}` : ''}`,
  unit: item.unit,
  quantity: item.quantity,
  rate: item.rate,
  amount: item.amount,
}));

const buildTableColumns = (ctx: PdfRenderContext, width: number): TableColumn[] => {
  const allColumns: Record<TableColumnKey, TableColumn> = {
    index: { key: 'index', label: 'Sr. No.', width: ctx.layout.lineItemColumnWidths.index, align: 'center' },
    description: { key: 'description', label: 'Description', width: ctx.layout.lineItemColumnWidths.description, align: 'left' },
    unit: { key: 'unit', label: 'Unit', width: ctx.layout.lineItemColumnWidths.unit, align: 'center' },
    quantity: { key: 'quantity', label: 'Qty', width: ctx.layout.lineItemColumnWidths.quantity, align: 'right' },
    rate: { key: 'rate', label: 'Unit Price', width: ctx.layout.lineItemColumnWidths.rate, align: 'right' },
    amount: { key: 'amount', label: 'Amount', width: ctx.layout.lineItemColumnWidths.amount, align: 'right' },
  };
  const selectedColumns = ctx.visibleColumns.map((key) => allColumns[key]).filter(Boolean);
  const totalConfiguredWidth = selectedColumns.reduce((sum, column) => sum + column.width, 0) || width;
  return selectedColumns.map((column) => ({ ...column, width: (column.width / totalConfiguredWidth) * width }));
};

const drawTableHeader = (ctx: PdfRenderContext, rect: BlockRect, top: number, columns: TableColumn[]) => {
  ctx.setFillColor(...ctx.accentColor);
  ctx.rect(rect.x, top, rect.width, 22, true);
  ctx.setFillColor(0, 0, 0);
  let cursorX = rect.x;
  columns.forEach((column) => {
    ctx.line(cursorX, top, cursorX, top - 22);
    const anchorX = column.align === 'right' ? cursorX + column.width - 6 : column.align === 'center' ? cursorX + (column.width / 2) : cursorX + 6;
    ctx.drawText(column.label, anchorX, top - 14, { font: 'F2', size: ctx.tableFontSize, align: column.align ?? 'left' });
    cursorX += column.width;
  });
  ctx.line(rect.x + rect.width, top, rect.x + rect.width, top - 22);
};

const rendererMap: Record<PoPdfBlockKey, BlockRenderer> = {
  header: {
    measure: (ctx, rect) => {
      const leftWidth = rect.width * (ctx.layout.headerLeftWidthPercent / 100);
      const metaRows: LabeledValue[] = [{ label: 'PO Number', value: ctx.doc.poNumber }, { label: 'Date', value: ctx.doc.orderDate }, { label: 'Status', value: ctx.doc.status }];
      const companyLines = [ctx.doc.settings.theme.companyName, ctx.doc.settings.theme.logoUrl ? `Logo: ${ctx.doc.settings.theme.logoUrl}` : '', 'Procurement Management System', `Currency: ${ctx.doc.settings.theme.currencyCode}`].filter(Boolean);
      const companyHeight = companyLines.reduce((sum, lineText, index) => sum + (index === 0 ? 20 : wrapText(lineText, leftWidth - 4, ctx.smallFontSize).length * 10), 0) + 10;
      const metaHeight = 24 + (metaRows.length * 16);
      return { height: Math.max(companyHeight, metaHeight) + 12 };
    },
    draw: (ctx, rect, top) => {
      const leftWidth = rect.width * (ctx.layout.headerLeftWidthPercent / 100);
      const metaRows: LabeledValue[] = [{ label: 'PO Number', value: ctx.doc.poNumber }, { label: 'Date', value: ctx.doc.orderDate }, { label: 'Status', value: ctx.doc.status }];
      const companyLines = [ctx.doc.settings.theme.companyName, ctx.doc.settings.theme.logoUrl ? `Logo: ${ctx.doc.settings.theme.logoUrl}` : '', 'Procurement Management System', `Currency: ${ctx.doc.settings.theme.currencyCode}`].filter(Boolean);
      let leftCursor = top;
      ctx.drawText(companyLines[0] || ctx.doc.settings.theme.companyName, rect.x, leftCursor - 16, { font: 'F2', size: ctx.doc.settings.theme.headingFontSize });
      leftCursor -= 24;
      companyLines.slice(1).forEach((lineText) => {
        leftCursor -= ctx.drawWrappedText(lineText, rect.x, leftCursor, leftWidth - 6, { size: ctx.smallFontSize, rowGap: 10 }) + 2;
      });
      ctx.drawText('PURCHASE ORDER', rect.x + rect.width, top - 18, { font: 'F2', size: ctx.doc.settings.theme.headingFontSize + 1, align: 'right' });
      let metaCursor = top - 40;
      metaRows.forEach((row) => {
        ctx.drawText(`${row.label}:`, rect.x + leftWidth + 28, metaCursor, { font: 'F2', size: ctx.baseFontSize });
        ctx.drawText(row.value, rect.x + rect.width, metaCursor, { size: ctx.baseFontSize, align: 'right' });
        metaCursor -= 16;
      });
      ctx.line(rect.x, top - (rendererMap.header.measure(ctx, rect).height), rect.x + rect.width, top - (rendererMap.header.measure(ctx, rect).height));
    },
  },
  poDetails: {
    measure: (ctx, rect) => {
      const details = ctx.doc.detailFields.filter((field) => ctx.visibleFields.has(field.key));
      if (!details.length) return { height: 0 };
      const columnCount = Math.min(3, Math.max(1, ctx.layout.sectionColumns === '3' ? 3 : 2));
      const gap = 16;
      const columnWidth = (rect.width - ((columnCount - 1) * gap) - (DEFAULT_PADDING * 2)) / columnCount;
      const columns = Array.from({ length: columnCount }, () => [] as LabeledValue[]);
      details.forEach((field, index) => columns[index % columnCount].push({ label: field.label, value: field.value }));
      const columnHeights = columns.map((column) => column.reduce((sum, field) => sum + measureLabeledValue(ctx, field, columnWidth) + 6, 0));
      return { height: BOX_TITLE_HEIGHT + DEFAULT_PADDING + Math.max(56, ...columnHeights) + DEFAULT_PADDING };
    },
    draw: (ctx, rect, top, height) => {
      const details = ctx.doc.detailFields.filter((field) => ctx.visibleFields.has(field.key));
      if (!details.length) return;
      const columnCount = Math.min(3, Math.max(1, ctx.layout.sectionColumns === '3' ? 3 : 2));
      const gap = 16;
      const columnWidth = (rect.width - ((columnCount - 1) * gap) - (DEFAULT_PADDING * 2)) / columnCount;
      const columns = Array.from({ length: columnCount }, () => [] as LabeledValue[]);
      details.forEach((field, index) => columns[index % columnCount].push({ label: field.label, value: field.value }));
      ctx.drawBox(top, height, rect.x, rect.width, { title: 'Purchase Order Details' });
      columns.forEach((column, columnIndex) => {
        const baseX = rect.x + DEFAULT_PADDING + (columnIndex * (columnWidth + gap));
        if (columnIndex > 0) ctx.line(baseX - (gap / 2), top - BOX_TITLE_HEIGHT, baseX - (gap / 2), top - height + DEFAULT_PADDING);
        let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
        column.forEach((field) => {
          cursor -= drawLabeledValue(ctx, field, baseX, cursor, columnWidth) + 6;
        });
      });
    },
  },
  vendorDetails: {
    measure: (ctx, rect) => {
      const fields: LabeledValue[] = [
        { label: 'Vendor Name', value: ctx.vendorDetails.vendorName },
        { label: 'Address', value: ctx.vendorDetails.address },
        { label: 'Phone', value: ctx.vendorDetails.phone },
        { label: 'Email', value: ctx.vendorDetails.email },
      ];
      const contentHeight = fields.reduce((sum, field) => sum + measureLabeledValue(ctx, field, rect.width - (DEFAULT_PADDING * 2)) + 6, 0);
      return { height: BOX_TITLE_HEIGHT + DEFAULT_PADDING + contentHeight + DEFAULT_PADDING };
    },
    draw: (ctx, rect, top, height) => {
      const fields: LabeledValue[] = [
        { label: 'Vendor Name', value: ctx.vendorDetails.vendorName },
        { label: 'Address', value: ctx.vendorDetails.address },
        { label: 'Phone', value: ctx.vendorDetails.phone },
        { label: 'Email', value: ctx.vendorDetails.email },
      ];
      ctx.drawBox(top, height, rect.x, rect.width, { title: 'Vendor Details' });
      let cursor = top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4;
      fields.forEach((field) => {
        cursor -= drawLabeledValue(ctx, field, rect.x + DEFAULT_PADDING, cursor, rect.width - (DEFAULT_PADDING * 2)) + 6;
      });
    },
  },
  billTo: {
    measure: (ctx, rect) => ({ height: measureAddressBox(ctx, ctx.doc.billingAddress, rect.width) }),
    draw: (ctx, rect, top, height) => drawAddressBox(ctx, 'Bill To', ctx.doc.billingAddress, rect.x, top, rect.width, height),
  },
  shipTo: {
    measure: (ctx, rect) => ({ height: measureAddressBox(ctx, ctx.doc.shippingAddress, rect.width) }),
    draw: (ctx, rect, top, height) => drawAddressBox(ctx, 'Ship To', ctx.doc.shippingAddress, rect.x, top, rect.width, height),
  },
  lineItems: {
    measure: () => ({ height: 0, pageBreakBefore: true }),
    draw: (ctx, rect, top) => {
      const columns = buildTableColumns(ctx, rect.width);
      const rows = buildLineItemRows(ctx.doc);
      let cursorY = top;
      const drawBlockHeader = () => {
        ctx.drawText('Line Items', rect.x, cursorY - 2, { font: 'F2', size: ctx.baseFontSize + 2 });
        cursorY -= 16;
        drawTableHeader(ctx, rect, cursorY, columns);
        cursorY -= 22;
      };

      drawBlockHeader();
      rows.forEach((row) => {
        const rowHeight = Math.max(22, ...columns.map((column) => (wrapText(row[column.key], column.width - 12, ctx.tableFontSize).length * 10) + 8));
        if (cursorY - rowHeight < ctx.marginBottom + 120) {
          ctx.newPage();
          cursorY = ctx.cursorY;
          drawBlockHeader();
        }
        ctx.rect(rect.x, cursorY, rect.width, rowHeight, false);
        let cursorX = rect.x;
        columns.forEach((column) => {
          ctx.line(cursorX, cursorY, cursorX, cursorY - rowHeight);
          wrapText(row[column.key], column.width - 12, ctx.tableFontSize).forEach((lineText, lineIndex) => {
            const anchorX = column.align === 'right' ? cursorX + column.width - 6 : column.align === 'center' ? cursorX + (column.width / 2) : cursorX + 6;
            ctx.drawText(lineText, anchorX, cursorY - 14 - (lineIndex * 10), { size: ctx.tableFontSize, align: column.align ?? 'left' });
          });
          cursorX += column.width;
        });
        ctx.line(rect.x + rect.width, cursorY, rect.x + rect.width, cursorY - rowHeight);
        cursorY -= rowHeight;
      });
      ctx.setCursorY(cursorY - ctx.sectionGap);
    },
  },
  totals: {
    measure: () => ({ height: 78 }),
    draw: (ctx, rect, top) => {
      ctx.drawBox(top, 78, rect.x, rect.width, { shadedTitle: false });
      let cursor = top - 18;
      [{ label: 'Subtotal', value: ctx.doc.subtotal }, { label: 'Discount', value: ctx.doc.discount }, { label: 'GST / Tax', value: ctx.doc.tax }].forEach((row) => {
        ctx.drawText(row.label, rect.x + 12, cursor, { size: ctx.baseFontSize });
        ctx.drawText(row.value, rect.x + rect.width - 10, cursor, { size: ctx.baseFontSize, align: 'right' });
        cursor -= 16;
      });
      ctx.line(rect.x + 12, cursor + 6, rect.x + rect.width - 10, cursor + 6);
      ctx.drawText('Grand Total', rect.x + 12, cursor - 10, { font: 'F2', size: ctx.baseFontSize + 1 });
      ctx.drawText(ctx.doc.grandTotal, rect.x + rect.width - 10, cursor - 10, { font: 'F2', size: ctx.baseFontSize + 3, align: 'right' });
    },
  },
  amountInWords: {
    measure: (ctx, rect) => {
      const text = amountToWords(ctx.doc.grandTotal, ctx.doc.settings.theme.currencyLabel);
      return { height: BOX_TITLE_HEIGHT + DEFAULT_PADDING + wrapText(text, rect.width - (DEFAULT_PADDING * 2), ctx.baseFontSize).length * ctx.lineHeight + DEFAULT_PADDING };
    },
    draw: (ctx, rect, top, height) => {
      const text = amountToWords(ctx.doc.grandTotal, ctx.doc.settings.theme.currencyLabel);
      ctx.drawBox(top, height, rect.x, rect.width, { title: 'Amount in Words' });
      ctx.drawWrappedText(text, rect.x + DEFAULT_PADDING, top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4, rect.width - (DEFAULT_PADDING * 2), { size: ctx.baseFontSize, rowGap: ctx.lineHeight });
    },
  },
  terms: {
    measure: (ctx, rect) => {
      const remarks = ctx.doc.remarks.length ? ctx.doc.remarks.join(' ') : 'No remarks';
      return { height: BOX_TITLE_HEIGHT + DEFAULT_PADDING + wrapText(remarks, rect.width - (DEFAULT_PADDING * 2), ctx.baseFontSize).length * ctx.lineHeight + DEFAULT_PADDING };
    },
    draw: (ctx, rect, top, height) => {
      const remarks = ctx.doc.remarks.length ? ctx.doc.remarks.join(' ') : 'No remarks';
      ctx.drawBox(top, height, rect.x, rect.width, { title: 'Terms & Conditions' });
      ctx.drawWrappedText(remarks, rect.x + DEFAULT_PADDING, top - BOX_TITLE_HEIGHT - DEFAULT_PADDING + 4, rect.width - (DEFAULT_PADDING * 2), { size: ctx.baseFontSize, rowGap: ctx.lineHeight });
    },
  },
  footer: {
    measure: (ctx) => ({ height: ctx.doc.settings.theme.footerStyle === 'minimal' ? 36 : 48 }),
    draw: (ctx, rect, top, height) => {
      const gap = 40;
      const halfWidth = (rect.width - gap) / 2;
      if (ctx.doc.settings.template.showPreparedBy) {
        ctx.line(rect.x, top - 14, rect.x + halfWidth, top - 14);
        ctx.drawText(ctx.doc.preparedBy, rect.x, top - 28, { font: 'F2', size: ctx.baseFontSize + 1 });
      }
      if (ctx.doc.settings.template.showSignatory) {
        ctx.line(rect.x + halfWidth + gap, top - 14, rect.x + rect.width, top - 14);
        ctx.drawText(ctx.doc.signatoryLabel, rect.x + rect.width, top - 28, { font: 'F2', size: ctx.baseFontSize + 1, align: 'right' });
      }
      if (ctx.doc.settings.theme.footerStyle === 'detailed') ctx.drawText(`Generated for ${ctx.doc.settings.theme.companyName}`, rect.x, top - height + 8, { size: ctx.smallFontSize });
    },
  },
};

const isBlockVisible = (doc: PurchaseOrderPdfDocument, block: PurchaseOrderPdfBlockConfig) => {
  const template = doc.settings.template;
  switch (block.key) {
    case 'vendorDetails': return block.visible && template.showVendorDetails;
    case 'billTo': return block.visible && template.showBillTo;
    case 'shipTo': return block.visible && template.showShipTo;
    case 'amountInWords': return block.visible && template.showAmountInWords;
    case 'terms': return block.visible && template.showTermsAndConditions;
    case 'footer': return block.visible && (template.showPreparedBy || template.showSignatory);
    default: return block.visible;
  }
};

const normalizeBlockRows = (rows: PoPdfLayoutRow[] | undefined): PoPdfLayoutRow[] => {
  const fallback = createDefaultPoPdfLayoutRows();
  if (!rows?.length) return fallback;
  const seen = new Set<PoPdfBlockKey>();
  const normalized = rows
    .map((row, rowIndex) => ({
      id: row.id || `row-${rowIndex + 1}`,
      columns: [1, 2, 3].includes(Number(row.columns)) ? (Number(row.columns) as 1 | 2 | 3) : 1,
      blocks: (row.blocks || []).filter((block) => PO_PDF_BLOCK_KEYS.includes(block.key)).map((block, blockIndex) => {
        seen.add(block.key);
        return {
          id: block.id || `${block.key}-${rowIndex + 1}-${blockIndex + 1}`,
          key: block.key,
          span: Math.max(1, Math.min(Number(block.span) || 1, [1, 2, 3].includes(Number(row.columns)) ? Number(row.columns) : 1)),
          visible: block.visible !== false,
        };
      }),
    }))
    .filter((row) => row.blocks.length > 0);

  PO_PDF_BLOCK_KEYS.forEach((key) => {
    if (seen.has(key)) return;
    normalized.push({ id: `row-auto-${key}`, columns: 1, blocks: [{ id: `${key}-auto`, key, span: 1, visible: true }] });
  });

  return normalized;
};

const getBlockRects = (row: PoPdfLayoutRow, startX: number, totalWidth: number): Array<{ block: PurchaseOrderPdfBlockConfig; rect: BlockRect }> => {
  const visibleBlocks = row.blocks;
  const gap = ROW_GAP;
  const baseWidth = (totalWidth - (Math.max(row.columns - 1, 0) * gap)) / row.columns;
  let remainingColumns = row.columns;
  let cursorX = startX;
  return visibleBlocks.map((block, index) => {
    const remainingBlocks = visibleBlocks.length - index;
    const maxSpan = remainingColumns - (remainingBlocks - 1);
    const span = Math.max(1, Math.min(block.span, maxSpan));
    const width = (baseWidth * span) + (gap * Math.max(span - 1, 0));
    const rect = { x: cursorX, y: 0, width };
    cursorX += width + gap;
    remainingColumns -= span;
    return { block: { ...block, span }, rect };
  });
};

export const purchaseOrderPdfRendererMap = rendererMap;

export const downloadPurchaseOrderPdf = (doc: PurchaseOrderPdfDocument) => {
  const { theme, layout } = doc.settings;
  const marginX = layout.pageMarginX;
  const marginTop = layout.pageMarginTop;
  const marginBottom = layout.pageMarginBottom;
  const printWidth = PAGE_WIDTH - (marginX * 2);
  const baseFontSize = theme.baseFontSize;
  const smallFontSize = Math.max(theme.baseFontSize - 1, 7);
  const tableFontSize = theme.tableFontSize;
  const lineHeight = layout.layoutDensity === 'compact' ? 10 : 12;
  const sectionGap = layout.sectionSpacing;
  const borderGray = layout.layoutDensity === 'compact' ? 0.45 : 0.55;
  const accentColor = hexToRgb(theme.primaryColor);

  const pages: PdfPage[] = [[]];
  let currentPage = pages[0];
  let cursorY = PAGE_HEIGHT - marginTop;

  const ctx: PdfRenderContext = {
    doc,
    layout,
    normalizedRows: normalizeBlockRows(layout.blockRows),
    printWidth,
    marginX,
    marginTop,
    marginBottom,
    baseFontSize,
    smallFontSize,
    tableFontSize,
    lineHeight,
    sectionGap,
    borderGray,
    accentColor,
    vendorDetails: splitVendorDetails(doc.vendorDetails),
    visibleFields: new Set(doc.settings.template.visiblePoDetailFields),
    visibleColumns: doc.settings.template.visibleLineItemColumns,
    currentPage,
    pages,
    cursorY,
    getAvailableHeight: () => ctx.cursorY - ctx.marginBottom,
    setCursorY: (value) => { ctx.cursorY = value; },
    push: (command) => ctx.currentPage.push(command),
    line: (x1, y1, x2, y2) => ctx.push(`${x1} ${y1} m ${x2} ${y2} l S`),
    rect: (x, top, width, height, fill = false) => ctx.push(`${x} ${top - height} ${width} ${height} re ${fill ? 'B' : 'S'}`),
    setFillColor: (r, g, b) => ctx.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`),
    setStrokeGray: (value) => ctx.push(`${value} G`),
    setLineWidth: (value) => ctx.push(`${value} w`),
    setBorderStyle: () => {
      if (theme.borderStyle === 'dashed') ctx.push('[3 2] 0 d');
      else if (theme.borderStyle === 'double') ctx.setLineWidth(1.1);
      else ctx.push('[] 0 d');
    },
    drawText: (text, x, baselineY, options) => {
      const font = options?.font ?? 'F1';
      const size = options?.size ?? baseFontSize;
      const align = options?.align ?? 'left';
      const content = sanitizeText(text || EMPTY_VALUE);
      const renderedWidth = textWidth(content, size);
      const drawX = align === 'right' ? x - renderedWidth : align === 'center' ? x - (renderedWidth / 2) : x;
      ctx.push(`BT /${font} ${size} Tf 1 0 0 1 ${drawX} ${baselineY} Tm ${toPdfString(content)} Tj ET`);
    },
    drawWrappedText: (text, x, top, width, options) => {
      const size = options?.size ?? baseFontSize;
      const rowGap = options?.rowGap ?? lineHeight;
      const lines = wrapText(text, width, size);
      lines.forEach((lineText, index) => {
        const baselineY = top - size - (index * rowGap);
        const anchorX = options?.align === 'right' ? x + width : options?.align === 'center' ? x + (width / 2) : x;
        ctx.drawText(lineText, anchorX, baselineY, { ...options, size });
      });
      return lines.length * rowGap;
    },
    drawBox: (top, height, x, width, options) => {
      ctx.setStrokeGray(borderGray);
      ctx.setLineWidth(0.6);
      ctx.setBorderStyle();
      ctx.rect(x, top, width, height, false);
      ctx.push('[] 0 d');
      if (options?.title) {
        if (options.shadedTitle !== false) {
          ctx.setFillColor(...accentColor);
          ctx.rect(x, top, width, BOX_TITLE_HEIGHT, true);
        }
        ctx.setFillColor(0, 0, 0);
        ctx.drawText(options.title, x + DEFAULT_PADDING, top - 14, { font: 'F2', size: baseFontSize + 1 });
      }
    },
    ensureSpace: (needed) => {
      if (ctx.cursorY - needed < marginBottom) ctx.newPage();
    },
    newPage: () => {
      ctx.currentPage = [];
      ctx.pages.push(ctx.currentPage);
      ctx.cursorY = PAGE_HEIGHT - marginTop;
    },
  };

  ctx.normalizedRows.forEach((row) => {
    const visibleBlocks = row.blocks.filter((block) => isBlockVisible(doc, block));
    if (!visibleBlocks.length) return;

    if (visibleBlocks.length === 1 && visibleBlocks[0].key === 'lineItems') {
      const renderer = rendererMap.lineItems;
      ctx.ensureSpace(60);
      renderer.draw(ctx, { x: marginX, y: ctx.cursorY, width: printWidth }, ctx.cursorY, 0);
      return;
    }

    const effectiveRow: PoPdfLayoutRow = { ...row, blocks: visibleBlocks };
    const blockRects = getBlockRects(effectiveRow, marginX, printWidth);
    const measurements = blockRects.map(({ block, rect }) => ({ block, rect, measure: rendererMap[block.key].measure(ctx, rect) }));
    const rowHeight = Math.max(...measurements.map((item) => item.measure.height), 0);
    if (!rowHeight) return;
    ctx.ensureSpace(rowHeight + sectionGap);
    const top = ctx.cursorY;
    measurements.forEach(({ block, rect }) => rendererMap[block.key].draw(ctx, rect, top, rowHeight));
    ctx.cursorY = top - rowHeight - sectionGap;
  });

  downloadBlob(createPdf(pages), `${sanitizeText(doc.poNumber) || 'purchase-order'}.pdf`);
};
