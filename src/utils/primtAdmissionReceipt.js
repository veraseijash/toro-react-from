import { IMAGES_BASE_URL } from '../config/appConfig';
import { buildAdmissionPrintPages } from './buildAdmissionInvoices';
import printAdmissionInvoices, { buildAdmissionPrintDocument } from './printAdmissionInvoices';

export function buildReceiptDocument(progress, rows, billing, discount) {
  const { receipt_format: template, rows_description_receipt, receipt_number, logo } = progress.laboratory;
  const rowCount = Number(rows_description_receipt);
  const lastNumber = Number(receipt_number);
  if (!Number.isSafeInteger(rowCount) || rowCount < 1 || !Number.isSafeInteger(lastNumber) || lastNumber < 0) {
    throw new Error('Configura las filas y el número correlativo del comprobante en el laboratorio.');
  }

  const pages = buildAdmissionPrintPages(rows, rowCount, billing, discount);
  pages.forEach(({ data }, index) => { data.no_invoice = lastNumber + index + 1; });
  const logoUrl = logo
    ? `${IMAGES_BASE_URL.replace(/\/+$/, '')}/${String(logo).replace(/^\/+/, '')}`
    : '';
  const html = buildAdmissionPrintDocument(progress, { template, rowCount, pages, type: 'comprobante', logoUrl });
  return { html, lastNumber: lastNumber + pages.length };
}

export default function printAdmissionReceipt(html) {
  return printAdmissionInvoices(html, 'Comprobantes del paciente');
}
