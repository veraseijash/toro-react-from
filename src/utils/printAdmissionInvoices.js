const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[char]));
const amount = (value) => Number(value).toFixed(2);

// A separate document keeps admission controls and the success dialog out of print.
export default function printAdmissionInvoices(progress) {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.title = 'Facturas del paciente';
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:1000px;border:0';
    frame.setAttribute('aria-hidden', 'true');
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
    frame.srcdoc = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Facturas</title>
      <style>@page{margin:15mm}body{font:12px Arial,sans-serif;color:#000;background:#fff}
      section{break-after:page}section:last-child{break-after:auto}h1{font-size:20px}
      table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:7px;border-bottom:1px solid #ccc;text-align:left}
      .number{text-align:right}.totals{margin-left:auto;width:50%}.totals p{display:flex;justify-content:space-between}</style></head><body>
      ${progress.invoices.map(({ data, items }) => `<section>
        <h1>${escapeHtml(progress.laboratory?.business_name ?? progress.laboratory?.name ?? 'Laboratorio')}</h1>
        <h2>Factura ${escapeHtml(data.no_invoice)}</h2><p>Fecha: ${escapeHtml(progress.date)}</p>
        <p>Paciente: ${escapeHtml(progress.patient.name)}</p>
        <p>Razón social: ${escapeHtml(data.business_name)}<br>RIF: ${escapeHtml(data.rif)}<br>Domicilio: ${escapeHtml(data.address)}</p>
        <table><thead><tr><th>Cantidad</th><th>Descripción</th><th class="number">Precio unitario</th><th class="number">Total</th></tr></thead>
        <tbody>${items.map((item) => `<tr><td>${escapeHtml(item.quantity)}</td><td>${escapeHtml(item.description)}</td><td class="number">${amount(item.amount)}</td><td class="number">${amount(item.total)}</td></tr>`).join('')}</tbody></table>
        <div class="totals"><p><span>Subtotal</span><span>${amount(data.subtotal)}</span></p>
        <p><span>Descuento (${amount(data.discount)} %)</span><span>${amount(data.discount_total)}</span></p>
        <p><span>Base imponible</span><span>${amount(data.tax_base)}</span></p>
        <p><span>IVA</span><span>${amount(data.iva_total)}</span></p>
        <p><strong>Total</strong><strong>${amount(data.total)}</strong></p></div></section>`).join('')}
      </body></html>`;
    document.body.appendChild(frame);
  });
}
