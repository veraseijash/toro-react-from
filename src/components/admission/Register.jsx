import { useState } from 'react';

function Register({ patient, client, clientBilling = false, selectedExams = [] }) {
  const [validationErrors, setValidationErrors] = useState([]);
  const [receiptType, setReceiptType] = useState('receipt');
  const [printSample, setPrintSample] = useState(true);
  const [sameAsPatient, setSameAsPatient] = useState(false);
  const [billing, setBilling] = useState({ businessName: '', identity: '', address: '' });
  const patientBilling = {
    businessName: patient.name.slice(0, 100),
    identity: patient.identity
      ? `${patient.documentType}-${patient.identity.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`.slice(0, 20)
      : '',
    address: patient.address.slice(0, 250),
  };
  const values = clientBilling ? {
    businessName: String(client?.business_name ?? ''),
    identity: String(client?.rif ?? ''),
    address: String(client?.address ?? ''),
  } : sameAsPatient ? patientBilling : billing;
  const printInvoice = client?.Print_invoice ?? client?.print_invoice;
  const selectedReceiptType = clientBilling
    ? (printInvoice === true || printInvoice === 'true' || Number(printInvoice) === 1 ? 'invoice' : 'receipt')
    : receiptType;

  const validateRegistration = () => {
    const errors = [];
    if (!patient.name.trim()) errors.push('Nombre de paciente no puede quedar en blanco');
    if (!patient.phone?.trim()) errors.push('Teléfono de paciente no puede quedar en blanco');
    if (selectedExams.length === 0) errors.push('Debe seleccionar exámenes');
    if (Object.values(values).some((value) => !value.trim())) {
      errors.push('Registro de información fiscal no puede quedar en blanco');
    }
    setValidationErrors(errors);
  };

  const field = (name, label, maxLength, multiline = false) => {
    const Control = multiline ? 'textarea' : 'input';
    const id = `admission-register-${name}`;
    return (
      <div>
        <label className="visually-hidden" htmlFor={id}>{label}</label>
        <Control
          className="form-control"
          id={id}
          name={name}
          placeholder={label}
          rows={multiline ? 5 : undefined}
          maxLength={maxLength}
          value={values[name]}
          readOnly={clientBilling || sameAsPatient}
          aria-describedby={`${id}-counter`}
          onChange={(event) => setBilling((current) => ({ ...current, [name]: event.target.value }))}
        />
        <small className="admission-counter" id={`${id}-counter`}>{values[name].length} / {maxLength}</small>
      </div>
    );
  };

  return (
    <>
    <div className="card admission-register">
      <div className="card-body admission-register-grid">
        <div>
          <fieldset className="mb-4">
            <legend className="visually-hidden">Tipo de comprobante</legend>
            {[['invoice', 'Facturar'], ['receipt', 'Comprobante']].map(([value, label]) => (
              <div className="form-check" key={value}>
                <input className="form-check-input" type="radio" name="admission-receipt-type"
                  id={`admission-${value}`} value={value} checked={selectedReceiptType === value} disabled={clientBilling}
                  onChange={() => setReceiptType(value)} />
                <label className="form-check-label" htmlFor={`admission-${value}`}>{label}</label>
              </div>
            ))}
          </fieldset>
          <div className="form-check mb-4">
            <input className="form-check-input" type="checkbox" id="admission-print-sample"
              checked={printSample} onChange={(event) => setPrintSample(event.target.checked)} />
            <label className="form-check-label" htmlFor="admission-print-sample">Imprimir Toma de muestra</label>
          </div>
          <p className="small mb-4 text-warning">
            Al dar clic en el botón indicado como <strong>"Registrar"</strong> se procederá a validar los datos suministrados,
            si encuentra algún detalle le indicará, de lo contrario, registra el paciente e imprime los formatos
            seleccionados en las casillas de verificación.
          </p>
          <p className="small text-warning fw-bold fst-italic mb-0">Recuerde seleccionar las impresoras para cada caso.</p>
        </div>
        <div>
          <div className="form-check mb-2">
            <input className="form-check-input" type="checkbox" id="admission-same-as-patient"
              checked={!clientBilling && sameAsPatient} disabled={clientBilling} onChange={(event) => {
                if (!event.target.checked) setBilling(patientBilling);
                setSameAsPatient(event.target.checked);
              }} />
            <label className="form-check-label" htmlFor="admission-same-as-patient">Razón social igual al paciente</label>
          </div>
          <div className="admission-register-fields">
            {field('businessName', 'Razón Social', 100)}
            {field('identity', 'Documento de identidad', 20)}
            {field('address', 'Domicilio', 250, true)}
          </div>
        </div>
      </div>
    </div>
    <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-2 mt-3" onClick={validateRegistration}>
      <span className="ico ico-user-check1" aria-hidden="true"></span>
      REGISTRAR
    </button>
    {validationErrors.length > 0 && (
      <div className="card card-warning mt-3" style={{ width: '550px' }} role="alert" aria-label="Errores de validación">
        <div className="card-body d-flex align-items-start gap-2">
          <span className="ico ico-exclamation-circle admission-register-validation-icon" aria-hidden="true"></span>
          <ul>
            {validationErrors.map((message) => <li key={message}>{message}</li>)}
          </ul>
        </div>
      </div>
    )}
    </>
  );
}

export default Register;
