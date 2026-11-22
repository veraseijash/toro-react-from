const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const amount = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format;

export function buildInvoiceDocument(progress) {
  return buildAdmissionPrintDocument(progress, {
    template: progress.laboratory?.voucher_format,
    rowCount: Number(progress.laboratory?.rows_description_invoices),
    pages: progress.invoices,
    type: 'factura',
  });
}

export function buildAdmissionPrintDocument(progress, { template, rowCount, pages, type, logoUrl = '' }) {
  if (typeof template !== 'string' || !template.trim()) {
    throw new Error(`El laboratorio no tiene un formato de ${type} configurado.`);
  }

  const format = template.replace(/&#x(?:A|9|20);/gi, (entity) => ({
    '&#xa;': '\n', '&#x9;': '\t', '&#x20;': ' ',
  }[entity.toLowerCase()]));
  const rowPattern = /\[list_description\]\s*(<tr\b[^>]*>[\s\S]*?<\/tr>)\s*\[totales\]/i;
  const rowTemplate = format.match(rowPattern)?.[1];
  const cellPattern = /(<td\b[^>]*>)\s*(<\/td>)/gi;
  if (!rowTemplate || [...rowTemplate.matchAll(cellPattern)].length !== 4) {
    throw new Error(`El formato de ${type} debe incluir una fila de cuatro celdas entre [list_description] y [totales].`);
  }

  const parser = new DOMParser();
  const documents = pages.map(({ data, items, taxBreakdown }) => {
    const rows = Array.from({ length: Math.max(rowCount || 0, items.length) }, (_, index) => {
      const item = items[index];
      const cells = item ? [item.quantity, item.description, amount(item.amount), amount(item.total)] : [];
      let column = 0;
      return rowTemplate.replace(/^<tr\b/i, '<tr data-invoice-description')
        .replace(cellPattern, (_, open, close) =>
          `${open}${escapeHtml(cells[column++]) || '&nbsp;'}${close}`);
    }).join('');
    const taxes = taxBreakdown?.length ? taxBreakdown : [
      { rate: data.iva, base: data.tax_base, amount: data.iva_total },
    ];
    const totals = [
      ['SUB-TOTAL', data.subtotal],
      [`DESCUENTO (%) ${Number(data.discount)}`, data.discount_total],
      ...taxes.map((tax) => [`IVA: ${Number(tax.rate).toFixed(2)} % SOBRE ${amount(tax.base)}`, tax.amount]),
      ['TOTAL A PAGAR', data.total],
    ].map(([label, value]) => `<tr class="invoice-total">
      <td colspan="3">${label}</td><td>${amount(value)}</td>
    </tr>`).join('');
    const values = {
      noInvoice: escapeHtml(data.no_invoice),
      noReceipt: escapeHtml(data.no_invoice),
      src_image: escapeHtml(logoUrl),
      business_name: escapeHtml(progress.laboratory?.business_name),
      rif_lab: escapeHtml(progress.laboratory?.rif),
      address_lab: escapeHtml(progress.laboratory?.address),
      phone_1: escapeHtml(progress.laboratory?.phone_1),
      phone_2: escapeHtml(progress.laboratory?.phone_2),
      email: escapeHtml(progress.laboratory?.email),
      fecha: escapeHtml(progress.date),
      'razon-social': escapeHtml(data.business_name),
      rif: escapeHtml(data.rif),
      domicilio: escapeHtml(data.address),
      name: escapeHtml(progress.patient.name),
      phone: escapeHtml(progress.patient.phone),
      list_description: rows,
      totales: totals,
    };
    const html = format.replace(rowPattern, '[list_description][totales]')
      .replace(/\[\[?(rif_lab)\]|\[([\w-]+)\]/g,
        (placeholder, rifField, field) => {
          const key = rifField ?? field;
          return Object.hasOwn(values, key) ? values[key] : placeholder;
        });
    return parser.parseFromString(html, 'text/html');
  });

  const [document, ...remaining] = documents;
  const style = document.createElement('style');
  style.textContent = `
    table:has([data-invoice-description]) { border-collapse: collapse; }
    [data-invoice-description] > td {
      border-width: 0 0 0 1px !important;
      border-style: solid !important;
      border-color: black !important;
    }
    [data-invoice-description] > td:last-child { border-right-width: 1px !important; }
    [data-invoice-description]:has(+ .invoice-total) > td { border-bottom-width: 1px !important; }
    .invoice-total > td { padding: 3px 10px; text-align: right; }
    .invoice-total > td:last-child { border: 1px solid black; }
  `;
  document.head.appendChild(style);
  remaining.forEach((invoice) => {
    const page = document.createElement('section');
    page.style.breakBefore = 'page';
    page.append(...invoice.body.childNodes);
    document.body.appendChild(page);
  });
  return `<!doctype html>${document.documentElement.outerHTML}`;
}

// A separate document keeps admission controls and the success dialog out of print.
export default function printAdmissionInvoices(html, title = 'Facturas del paciente') {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.title = title;
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0';
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
    frame.onload = async () => {
      try {
        await frame.contentDocument.fonts?.ready;
        frame.contentWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
        frame.contentWindow.focus();
        frame.contentWindow.print();
        resolve();
      } catch (error) {
        frame.remove();
        reject(error);
      }
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}
