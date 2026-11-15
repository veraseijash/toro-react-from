import test from 'node:test';
import assert from 'node:assert/strict';
import saveAdmission from '../src/utils/saveAdmission.js';

const makeProgress = () => ({
  date: '2026-11-14', patient: { name: 'Paciente' }, patientId: null,
  positioned: false, nextExam: 0, exams: [{ examlistsId: 3 }, { examlistsId: 7 }],
});
const makeServices = (calls) => ({
  createPatient: async (data) => { calls.push(['patient', data]); return { patientId: 42 }; },
  getPatientsTotalByDate: async (date) => { calls.push(['total', date]); return { total: 8 }; },
  updatePatient: async (id, data) => { calls.push(['position', id, data]); return {}; },
  createExam: async (data) => { calls.push(['exam', data]); return {}; },
  createWaypay: async (data) => { calls.push(['waypay', data]); return { id: 91 }; },
  createWaypayitems: async (data) => { calls.push(['payment', data]); return {}; },
});

const makePaymentProgress = () => ({
  ...makeProgress(), wayPayId: null, nextPayment: 0,
  wayPay: { id_users: 5, id_client: 1, date: new Date('2026-11-14T12:00:00Z'), date_patients: new Date('2026-11-14T12:00:00Z'), annulment: false },
  paymentItems: [
    { id_type_payment: 2, description_1: 'Banco', description_2: 'Referencia', amount: 50, total: 50, rate: 0, dollar: false, dollar_date: '' },
    { id_type_payment: 4, description_1: '', description_2: '', amount: 500, total: 10, rate: 50, dollar: true, dollar_date: '14/11/2026' },
  ],
});

test('client 1 creates waypay after exams and links all payment items to returned ID', async () => {
  const calls = [];
  const progress = makePaymentProgress();
  await saveAdmission(progress, makeServices(calls));
  assert.deepEqual(calls.map(([step]) => step), ['patient', 'total', 'position', 'exam', 'exam', 'waypay', 'payment', 'payment']);
  assert.deepEqual(calls[5][1], { ...progress.wayPay, id_patients: 42 });
  assert.deepEqual(calls.slice(6).map(([, data]) => data), progress.paymentItems.map((item) => ({ ...item, id_way_pay: 91 })));
});

test('other clients skip waypay and payment items', async () => {
  const calls = [];
  const progress = makePaymentProgress();
  progress.wayPay.id_client = 2;
  await saveAdmission(progress, makeServices(calls));
  assert.equal(calls.some(([step]) => step === 'waypay' || step === 'payment'), false);
});

test('retry resumes failed payment without repeating waypay or completed items', async () => {
  const calls = [];
  const progress = makePaymentProgress();
  const services = makeServices(calls);
  const createItem = services.createWaypayitems;
  services.createWaypayitems = async (data) => {
    if (data.id_type_payment === 4) return { success: false, message: 'Pago rechazado' };
    return createItem(data);
  };
  await assert.rejects(saveAdmission(progress, services), /Pago rechazado/);
  assert.equal(progress.wayPayId, 91);
  assert.equal(progress.nextPayment, 1);
  services.createWaypayitems = createItem;
  await saveAdmission(progress, services);
  assert.equal(calls.filter(([step]) => step === 'waypay').length, 1);
  assert.equal(calls.filter(([step]) => step === 'payment').length, 2);
  assert.equal(calls.filter(([step]) => step === 'patient').length, 1);
});

test('invalid waypay ID prevents saving payment items', async () => {
  const calls = [];
  const services = makeServices(calls);
  services.createWaypay = async () => ({ id: null });
  await assert.rejects(saveAdmission(makePaymentProgress(), services), /wayPayId válido/);
  assert.equal(calls.some(([step]) => step === 'payment'), false);
});

test('client 1 still creates waypay when no payment items were selected', async () => {
  const calls = [];
  const progress = makePaymentProgress();
  progress.paymentItems = [];
  await saveAdmission(progress, makeServices(calls));
  assert.equal(calls.filter(([step]) => step === 'waypay').length, 1);
  assert.equal(calls.filter(([step]) => step === 'payment').length, 0);
});

test('creates patient, retrieves daily count, updates position, then saves each exam with patientId', async () => {
  const calls = [];
  const progress = makeProgress();
  assert.equal(await saveAdmission(progress, makeServices(calls)), 42);
  assert.equal(progress.patientPosition, 8);
  assert.deepEqual(calls, [
    ['patient', { name: 'Paciente' }], ['total', '2026-11-14'],
    ['position', 42, { patient_position: 8 }],
    ['exam', { examlistsId: 3, patientsId: 42 }], ['exam', { examlistsId: 7, patientsId: 42 }],
  ]);
});

test('retry resumes at failed exam without repeating confirmed writes', async () => {
  const calls = [];
  const progress = makeProgress();
  const services = makeServices(calls);
  const createExam = services.createExam;
  services.createExam = async (data) => {
    if (data.examlistsId === 7) throw new Error('Servicio no disponible');
    return createExam(data);
  };
  await assert.rejects(saveAdmission(progress, services), /Servicio no disponible/);
  assert.equal(progress.nextExam, 1);
  assert.equal(progress.patientPosition, 8);
  services.createExam = createExam;
  await saveAdmission(progress, services);
  assert.equal(calls.filter(([step]) => step === 'patient').length, 1);
  assert.equal(calls.filter(([step]) => step === 'position').length, 1);
  assert.equal(calls.filter(([step]) => step === 'exam').length, 2);
});

test('invalid daily count stops before position update and exams', async () => {
  const calls = [];
  const services = makeServices(calls);
  services.getPatientsTotalByDate = async () => ({ total: null });
  await assert.rejects(saveAdmission(makeProgress(), services), /total diario válido/);
  assert.deepEqual(calls.map(([step]) => step), ['patient']);
});

test('rejected patient response stops subsequent operations', async () => {
  const calls = [];
  const services = makeServices(calls);
  services.createPatient = async () => ({ success: false, message: 'Datos inválidos' });
  await assert.rejects(saveAdmission(makeProgress(), services), /Datos inválidos/);
  assert.deepEqual(calls, []);
});
