const money = (value) => Math.round((value + Number.EPSILON) * 100) / 100;

export default function buildAdmissionInvoices(rows, laboratory, billing, userId, clientId, discount) {
  const limit = Number(laboratory.rows_description_invoices);
  const lastNumber = Number(laboratory.invoice_number);
  if (!Number.isSafeInteger(limit) || limit < 1 || !Number.isSafeInteger(lastNumber) || lastNumber < 0) {
    throw new Error('Configura las filas por factura y el número correlativo en el laboratorio.');
  }
  return buildAdmissionPrintPages(rows, limit, billing, discount).map((page, index) => ({
    ...page,
    id: null, nextItem: 0, counterUpdated: false,
    data: {
      ...page.data,
      no_invoice: lastNumber + index + 1,
      document_type: 'Factura', id_users: Number(userId),
      paying: Number(clientId) === 1 ? 1 : 0,
    },
  }));
}

export function buildAdmissionPrintPages(rows, limit, billing, discount) {
  const discountRate = Math.min(100, Math.max(0, Number(discount) || 0));
  const pages = [];
  for (let start = 0; start < rows.length; start += limit) {
    const chunk = rows.slice(start, start + limit);
    const subtotal = money(chunk.reduce((sum, row) => sum + row.subtotal, 0));
    const discountTotal = money(subtotal * discountRate / 100);
    const taxes = new Map();
    chunk.forEach((row) => {
      const key = row.tax?.id ?? row.exam.tax_id ?? row.taxRate;
      const tax = taxes.get(key) ?? { rate: row.taxRate, base: 0 };
      tax.base += row.subtotal;
      taxes.set(key, tax);
    });
    const ivaTotal = money([...taxes.values()].reduce((sum, tax) => sum + money(tax.base * tax.rate / 100), 0));
    const taxBreakdown = new Map();
    for (const { rate, base } of taxes.values()) {
      if (rate <= 0) continue;
      const entry = taxBreakdown.get(rate) ?? { rate, base: 0, amount: 0 };
      entry.base = money(entry.base + base);
      entry.amount = money(entry.amount + money(base * rate / 100));
      taxBreakdown.set(rate, entry);
    }
    pages.push({
      taxBreakdown: [...taxBreakdown.values()],
      data: {
        business_name: billing.businessName, rif: billing.identity, address: billing.address,
        subtotal, discount: discountRate, discount_total: discountTotal,
        iva: [...taxes.values()].reduce((sum, tax) => sum + tax.rate, 0), iva_total: ivaTotal,
        tax_base: money([...taxes.values()].filter((tax) => tax.rate > 0).reduce((sum, tax) => sum + tax.base, 0)),
        total: money(subtotal - discountTotal + ivaTotal),
      },
      items: chunk.map((row, index) => ({
        examIndex: start + index, quantity: row.quantity, description: row.exam.description,
        amount: row.unitPrice, total: row.total,
      })),
    });
  }
  return pages;
}
