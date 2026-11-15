import test from 'node:test';
import assert from 'node:assert/strict';
import buildAdmissionInvoices from '../src/utils/buildAdmissionInvoices.js';
import saveAdmission from '../src/utils/saveAdmission.js';

const row = (index) => ({ exam: { id: index + 1, description: `Examen ${index}`, tax_id: 1 }, quantity: 2, unitPrice: 10, subtotal: 20, taxRate: 16, total: 23.2 });
const billing = { businessName: 'Paciente', identity: 'V-123', address: 'Domicilio' };
const build = (count, limit = 10) => buildAdmissionInvoices(Array.from({ length: count }, (_, index) => row(index)), {
  rows_description_invoices: limit, invoice_number: 134,
}, billing, 1, '1', 10);

test('30 exam rows create three consecutive invoices with ten rows each', () => {
  const invoices = build(30);
  assert.deepEqual(invoices.map((invoice) => invoice.data.no_invoice), [135, 136, 137]);
  assert.deepEqual(invoices.map((invoice) => invoice.items.length), [10, 10, 10]);
  assert.equal(invoices[1].items[0].examIndex, 10);
  assert.equal(invoices[2].items[9].examIndex, 29);
  assert.equal(invoices[0].items[0].quantity, 2);
});

test('last invoice contains remainder and totals are computed for each invoice', () => {
  const invoices = build(11);
  assert.equal(invoices[1].items.length, 1);
  assert.deepEqual(invoices[1].data, {
    no_invoice: 136, business_name: 'Paciente', document_type: 'Factura', rif: 'V-123', address: 'Domicilio', id_users: 1,
    subtotal: 20, discount: 10, discount_total: 2, iva: 16, iva_total: 3.2, tax_base: 20, total: 21.2, paying: 1,
  });
  assert.equal(invoices[0].data.total, 212);
});

test('invalid invoice configuration is rejected before writes', () => {
  assert.throws(() => build(3, 0), /Configura/);
});

test('mixed taxes and client billing use only the current invoice rows', () => {
  const exempt = { ...row(1), taxRate: 0, exam: { id: 2, tax_id: 2, description: 'Exento' } };
  const invoices = buildAdmissionInvoices([row(0), exempt], { rows_description_invoices: 10, invoice_number: 0 }, billing, 5, '2', 0);
  assert.equal(invoices[0].data.paying, 0);
  assert.equal(invoices[0].data.tax_base, 20);
  assert.equal(invoices[0].data.iva_total, 3.2);
  assert.equal(invoices[0].data.total, 43.2);
});

test('invoice retry preserves saved invoices/items and finally updates patient invoice numbers', async () => {
  const calls = [];
  const progress = {
    patientId: 42, positioned: true, exams: [{}, {}], nextExam: 0,
    invoices: build(2, 1),
  };
  let examId = 100;
  let invoiceId = 200;
  let fail = true;
  const services = {
    createExam: async () => ({ id: ++examId }),
    createInvoice: async (data) => { calls.push(['invoice', data.no_invoice]); return { id: ++invoiceId }; },
    updateLaboratory: async (id, data) => { calls.push(['counter', id, data]); return {}; },
    createInvoiceitems: async (data) => {
      if (data.id_exams === 102 && fail) throw new Error('Error de ítem');
      calls.push(['item', data]); return {};
    },
    updatePatient: async (id, data) => { calls.push(['patient', id, data]); return {}; },
  };
  await assert.rejects(saveAdmission(progress, services), /Error de ítem/);
  assert.equal(calls.some(([step]) => step === 'patient'), false);
  fail = false;
  await saveAdmission(progress, services);
  assert.equal(calls.filter(([step]) => step === 'invoice').length, 2);
  assert.equal(calls.filter(([step]) => step === 'counter').length, 2);
  const items = calls.filter(([step]) => step === 'item');
  assert.deepEqual(items.map(([, item]) => item.id_exams), [101, 102]);
  assert.deepEqual(items.map(([, item]) => item.id_invoice), [201, 202]);
  assert.deepEqual(calls.at(-1), ['patient', 42, { invoice: '135, 136' }]);
});
