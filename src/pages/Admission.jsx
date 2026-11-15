import { useEffect, useRef, useState } from 'react';
import { getClient, getLaboratory, createPatient, getPatientsTotalByDate, updatePatient, createExam, createWaypay, createWaypayitems, createInvoice, createInvoiceitems } from '../services/admissionService';
import { updateLaboratory } from '../services/laboratoryService';
import buildAdmissionInvoices from '../utils/buildAdmissionInvoices';
import printAdmissionInvoices from '../utils/printAdmissionInvoices';
import useAuth from '../context/useAuth';
import saveAdmission, { checkAdmissionResponse } from '../utils/saveAdmission';
import Information from '../components/admission/Information';
import ExamsList from '../components/admission/ExamsList';
import MethodPayment from '../components/admission/MethodPayment';
import Register from '../components/admission/Register';
import useAdmissionTotals from '../components/admission/useAdmissionTotals';
import '../styles/Admission.css';

const TABS = [
  { id: 'patient', label: 'Información del paciente' },
  { id: 'exams', label: 'Seleccionar exámenes' },
  { id: 'payment', label: 'Forma de pago' },
  { id: 'register', label: 'Registrar' },
];

function AdmissionForm({ onReset }) {
  const { session } = useAuth();
  const [payments, setPayments] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [registrationError, setRegistrationError] = useState('');
  const savingRef = useRef(false);
  const registrationRef = useRef(null);
  const registrationDialogRef = useRef(null);
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [tariff, setTariff] = useState('1');
  const totals = useAdmissionTotals(tariff);
  const [clientId, setClientId] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [clientDetails, setClientDetails] = useState(null);
  const paymentDisabled = clientId !== '' && clientId !== '1';
  const client = String(clientDetails?.id) === clientId
    ? { ...selectedClient, ...clientDetails } : selectedClient;
  const [tariffError, setTariffError] = useState('');
  const [patient, setPatient] = useState({ name: '', documentType: 'V', identity: '', address: '' });

  useEffect(() => {
    if (!registered) return;
    const dialog = registrationDialogRef.current;
    dialog.showModal();
    return () => { dialog.close(); };
  }, [registered]);

  const handleRegister = async (options) => {
    if (savingRef.current || registered) return;
    savingRef.current = true;
    setIsSaving(true);
    setRegistrationError('');
    try {
      if (!registrationRef.current) {
        if (!Number(session?.user?.id) || !Number(clientId)) throw new Error('No se pudo identificar al usuario o al cliente.');
        if (tariffError || totals.loadingTaxes || totals.taxError) throw new Error('Espera a que se carguen correctamente la tarifa y los impuestos.');
        if (!patient.birthdate) throw new Error('Indica la fecha de nacimiento del paciente.');
        if (!totals.dollar?.date || !(Number(totals.dollar.value) > 0)) throw new Error('Se requiere un valor del dólar válido.');
        const now = new Date();
        const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
        const time = [now.getHours(), now.getMinutes(), now.getSeconds()]
          .map((value) => String(value).padStart(2, '0')).join(':');
        const activePayments = paymentDisabled ? [] : payments;
        const totalCanceled = activePayments.reduce((sum, payment) => sum + payment.amount, 0);
        const taxable = totals.taxTotals.filter((tax) => Number(tax.value) > 0);
        let invoices = [];
        let laboratory = null;
        if (options.receiptType === 'invoice') {
          const response = checkAdmissionResponse(await getLaboratory());
          laboratory = response?.laboratory ?? response?.data ?? response;
          invoices = buildAdmissionInvoices(totals.selectedRows, laboratory, options.billing, session.user.id, clientId, totals.discount);
        }
        registrationRef.current = {
          invoices, laboratory,
          date, patientId: null, positioned: false, nextExam: 0,
          wayPayId: null, nextPayment: 0,
          wayPay: Number(clientId) === 1 ? {
            id_users: Number(session.user.id), id_client: Number(clientId),
            date: now, date_patients: now, annulment: false,
          } : null,
          paymentItems: activePayments.map((payment) => ({
            id_type_payment: payment.typePaymentId,
            description_1: payment.detail1, description_2: payment.detail2,
            amount: payment.received, total: payment.amount,
            rate: Number(payment.exchangeRate ?? 0),
            dollar: payment.dollar, dollar_date: payment.exchangeDate,
          })),
          patient: {
            name: patient.name, document_number: patient.identity.replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
            verification_code: patient.documentType, age: Number(patient.age), month_year: patient.ageUnit,
            phone: patient.phone, admission_date: date, admission_time: time, suggested: patient.suggested ?? '',
            client_id: Number(clientId), birth_date: patient.birthdate, sex: patient.sex === 'Masculino',
            observation: patient.observation ?? '', total: totals.totalToPay,
            way_pay_dollars: activePayments.filter((payment) => payment.exchangeRate != null).reduce((sum, payment) => sum + payment.received, 0),
            total_no_dollars: activePayments.filter((payment) => payment.exchangeRate == null).reduce((sum, payment) => sum + payment.amount, 0),
            total_canceled: totalCanceled, business_name: options.billing.businessName,
            rif: options.billing.identity, address: options.billing.address,
            tax_base: taxable.reduce((sum, tax) => sum + tax.base, 0),
            iva: taxable.reduce((sum, tax) => sum + Number(tax.value), 0),
            subtotal: totals.subtotal, discount: Number(totals.discount), discount_total: totals.discountAmount,
            iva_total: totals.taxTotals.reduce((sum, tax) => sum + tax.amount, 0),
            dollar_price: Number(totals.dollar.value), dollar_price_date: totals.dollar.date,
            sample_type: patient.sampleType, sample: patient.sample, email: patient.email ?? '',
            email_sent: false, email_status: Boolean(patient.sendEmail), user_id: Number(session.user.id), permissions: [],
          },
          exams: totals.selectedRows.map(({ exam, quantity, tax, taxRate, unitPrice, subtotal, total }, index) => ({
            examlistsId: Number(exam.id), date: now, group_id: Number(exam.group_id ?? exam.examgroup_id ?? exam.examgroup?.id),
            position: Number(exam.position ?? index + 1), amount: quantity, price: unitPrice, total,
            tax_description: tax?.description ?? '', tax_amount: taxRate,
            tax_total: Math.round(subtotal * taxRate) / 100, description: exam.description,
          })),
        };
        if (registrationRef.current.exams.some((exam) => !Number.isFinite(exam.group_id))) {
          registrationRef.current = null;
          throw new Error('No se pudo identificar el grupo de uno de los exámenes.');
        }
      }
      await saveAdmission(registrationRef.current, { createPatient, getPatientsTotalByDate, updatePatient, createExam, createWaypay, createWaypayitems, createInvoice, createInvoiceitems, updateLaboratory });
      if (registrationRef.current.invoices.length && !registrationRef.current.printed) {
        await printAdmissionInvoices(registrationRef.current);
        registrationRef.current.printed = true;
      }
      setRegistered(true);
    } catch (error) {
      setRegistrationError(`${error.message || 'No se pudo completar el registro.'}${registrationRef.current?.patientId ? ` Paciente #${registrationRef.current.patientId}. Al reintentar se continuará con los datos originales.` : ''}`);
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const loadTariff = async () => {
      setTariffError('');
      try {
        const response = await getClient(clientId);
        const client = response?.client ?? response?.data ?? response;
        if (active && response?.success !== false && !response?.error) {
          setClientDetails({ ...client, id: clientId });
        }
        const value = Number(client?.tariff);
        if (response?.success === false || response?.error || !Number.isInteger(value) || value < 1 || value > 6) throw new Error('Tarifa inválida');
        if (active) setTariff(String(value));
      } catch {
        if (active) setTariffError('No se pudo cargar la tarifa del cliente.');
      }
    };
    loadTariff();
    return () => { active = false; };
  }, [clientId]);

  useEffect(() => {
    if (paymentDisabled && activeTab === 'payment') setActiveTab('patient');
  }, [paymentDisabled, activeTab]);

  const handleTabKeyDown = (event, index) => {
    const enabledTabs = TABS.filter((tab) => tab.id !== 'payment' || !paymentDisabled);
    index = enabledTabs.findIndex((tab) => tab.id === TABS[index].id);
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % enabledTabs.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + enabledTabs.length - 1) % enabledTabs.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = enabledTabs.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(enabledTabs[nextIndex].id);
    document.getElementById(`admission-tab-${enabledTabs[nextIndex].id}`)?.focus();
  };

  return (
    <div className="dashboard-content admission-page">
      <h1>Admisión de paciente</h1>
      <ul className="nav nav-pills" role="tablist" aria-label="Admisión de paciente">
        {TABS.map((tab, index) => (
          <li className="nav-item" role="presentation" key={tab.id}>
            <button
              type="button"
              className={`nav-link${activeTab === tab.id ? ' active' : ''}`}
              id={`admission-tab-${tab.id}`}
              role="tab"
              disabled={tab.id === 'payment' && paymentDisabled}
              aria-disabled={tab.id === 'payment' && paymentDisabled}
              aria-selected={activeTab === tab.id}
              aria-controls={`admission-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-content">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={`admission-panel-${tab.id}`}
            className={`tab-pane${activeTab === tab.id ? ' active' : ''}${tab.id === 'exams' ? ' admission-exams-panel' : ''}`}
            role="tabpanel"
            aria-labelledby={`admission-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
          >
            {tab.id === 'patient' && <Information onClientChange={setClientId} onClientDetailsChange={setSelectedClient} onPatientChange={setPatient} tariffError={tariffError} />}
            {tab.id === 'exams' && <ExamsList tariff={tariff} onTariffChange={setTariff} totals={totals} />}
            {tab.id === 'payment' && <MethodPayment key={String(paymentDisabled)} totals={totals} disabled={paymentDisabled} onPaymentsChange={setPayments} />}
            {tab.id === 'register' && <>
              <Register key={clientId} patient={patient} client={client} clientBilling={paymentDisabled} selectedExams={totals.selectedRows} onRegister={handleRegister} isSaving={isSaving} registered={registered} />
              {registrationError && <p className="text-danger mt-3" role="alert">{registrationError}</p>}
            </>}
          </div>
        ))}
      </div>
      <dialog ref={registrationDialogRef} className="app-dialog admission-success-dialog"
        aria-labelledby="admission-success-title" aria-describedby="admission-success-message"
        onCancel={(event) => event.preventDefault()}>
        <div className="dialog-panel dialog-centered">
          <div className="dialog-content">
            <div className="dialog-header">
              <h2 className="dialog-title fs-5" id="admission-success-title">Registro completado</h2>
            </div>
            <div className="dialog-body">
              <p id="admission-success-message" className="mb-0">
                Paciente {registrationRef.current?.patient.name} fue registrado con el orden de llegada {registrationRef.current?.patientPosition}.
              </p>
            </div>
            <div className="dialog-footer">
              <button type="button" className="btn btn-primary" onClick={() => {
                registrationDialogRef.current.close();
                onReset();
              }}>Aceptar</button>
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
}

export default function Admission() {
  const [registrationKey, setRegistrationKey] = useState(0);
  return <AdmissionForm key={registrationKey} onReset={() => setRegistrationKey((key) => key + 1)} />;
}
