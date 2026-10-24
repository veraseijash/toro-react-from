import { useEffect, useId, useState } from 'react';
import { getTypepaymentsActive } from '../../services/admissionService';
import numericFormat from '../../utils/numericFormat';
import AdmissionTotals from './AdmissionTotals';

export default function MethodPayment({ totals }) {
  const paymentPanelId = useId();
  const [showPaymentPanel, setShowPaymentPanel] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loadingPaymentMethods, setLoadingPaymentMethods] = useState(true);
  const [paymentMethodsError, setPaymentMethodsError] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [paymentDetails, setPaymentDetails] = useState(['', '']);
  const [received, setReceived] = useState('');
  const [registeredPayments, setRegisteredPayments] = useState([]);
  const [paymentError, setPaymentError] = useState('');
  const { subtotal, totalToPay, dollar } = totals;

  useEffect(() => {
    let active = true;
    getTypepaymentsActive().then((response) => {
      const rows = Array.isArray(response) ? response : response?.typepayments ?? response?.typePayments ?? response?.typepayment ?? response?.data;
      if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
        throw new Error('Respuesta inválida');
      }
      if (active) setPaymentMethods(rows);
    }).catch(() => {
      if (active) setPaymentMethodsError('No se pudieron cargar las formas de pago.');
    }).finally(() => {
      if (active) setLoadingPaymentMethods(false);
    });
    return () => { active = false; };
  }, []);

  const selectedPayment = paymentMethods.find((method) => String(method.id) === selectedPaymentId);
  const onlyDollars = selectedPayment?.only_dollars === true || Number(selectedPayment?.only_dollars) === 1;
  const convertedAmount = Number(received) / Number(dollar?.value);
  const paymentAmount = received === '' ? '' : onlyDollars
    ? (Number(dollar?.value) > 0 && Number.isFinite(convertedAmount) ? Math.round(convertedAmount) : '')
    : received;
  const dollarDate = dollar?.date
    ? (dollar.date instanceof Date ? dollar.date.toISOString() : String(dollar.date)).slice(0, 10).split('-').reverse().join('/')
    : '';
  const balance = Math.round((totalToPay - registeredPayments.reduce((sum, payment) => sum + payment.amount, 0)) * 100) / 100;

  const registerPayment = () => {
    const amount = Number(paymentAmount);
    if (paymentAmount === '' || !Number.isFinite(amount) || amount <= 0) {
      setPaymentError('El monto no debe estar vacio');
      return;
    }
    if (Math.round(amount * 100) > Math.round(balance * 100)) {
      setPaymentError('El monto supera el saldo');
      return;
    }
    if (!selectedPayment) {
      setPaymentError('Selecciona una forma de pago');
      return;
    }
    setRegisteredPayments((current) => [...current, {
      description: selectedPayment.description,
      detail1: paymentDetails[0],
      detail2: paymentDetails[1],
      exchangeRate: onlyDollars ? dollar?.value : null,
      exchangeDate: onlyDollars ? dollarDate : '',
      received: Number(received),
      amount,
    }]);
    setPaymentError('');
    setReceived('');
    setPaymentDetails(['', '']);
    setSelectedPaymentId('');
    setShowPaymentPanel(false);
  };
  return (
    <>
      <AdmissionTotals totals={totals} />
        <div className="card admission-payments">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table admission-payments-table align-middle mb-2" aria-label="Resumen de pagos">
                <thead>
                  <tr>
                    <th scope="col" aria-label="Acciones"></th>
                    <th scope="col">DESCRIPCIÓN</th>
                    <th scope="col">DATO 1</th>
                    <th scope="col">DATO 2</th>
                    <th scope="col">CAMBIO</th>
                    <th scope="col">FECHA CAMBIO</th>
                    <th scope="col">RECIBIDO</th>
                    <th scope="col">MONTO</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row" colSpan={6}>Sub total</th>
                    <td></td>
                    <td>{numericFormat(subtotal, 2)}</td>
                  </tr>
                  <tr>
                    <th scope="row" colSpan={6}>Total a pagar</th>
                    <td></td>
                    <td>{numericFormat(totalToPay, 2)}</td>
                  </tr>
                  {registeredPayments.map((payment, index) => (
                    <tr key={index} className="admission-payment-row">
                      <td>
                        <button type="button" className="admission-payment-delete"
                          aria-label={`Eliminar pago ${payment.description}`}
                          onClick={() => {
                            setRegisteredPayments((current) => current.filter((_, paymentIndex) => paymentIndex !== index));
                            setPaymentError('');
                          }}>
                          <span className="ico ico-trash-2" aria-hidden="true"></span>
                        </button>
                      </td>
                      <td>{payment.description}</td>
                      <td>{payment.detail1}</td>
                      <td>{payment.detail2}</td>
                      <td>{payment.exchangeRate != null ? numericFormat(payment.exchangeRate, 2) : ''}</td>
                      <td>{payment.exchangeDate}</td>
                      <td>{numericFormat(payment.received, 2)}</td>
                      <td>{numericFormat(payment.amount, 2)}</td>
                    </tr>
                  ))}
                  <tr className="admission-payments-balance">
                    <th scope="row" colSpan={6}>Saldo</th>
                    <td></td>
                    <td>{numericFormat(balance, 2)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <button type="button" className="btn btn-primary d-inline-flex align-items-center gap-2"
              aria-expanded={showPaymentPanel} aria-controls={paymentPanelId}
              onClick={() => {
                if (showPaymentPanel) {
                  setSelectedPaymentId('');
                  setPaymentDetails(['', '']);
                  setReceived('');
                  setPaymentError('');
                }
                setShowPaymentPanel((visible) => !visible);
              }}>
              <span className="ico ico-money" aria-hidden="true"></span>
              SELECCIONA FORMA DE PAGO
            </button>
            <div id={paymentPanelId} className="card admission-payment-panel mt-2" hidden={!showPaymentPanel}>
              <div className="card-body">
                <div className="admission-payment-fields admission-payment-details">
                <div>
                  <select className="form-select" aria-label="Forma de pago" value={selectedPaymentId}
                    onChange={(event) => {
                      setSelectedPaymentId(event.target.value);
                      setPaymentDetails(['', '']);
                    }}
                    disabled={loadingPaymentMethods || !!paymentMethodsError || paymentMethods.length === 0}
                    aria-busy={loadingPaymentMethods}>
                    <option value="" disabled>{loadingPaymentMethods ? 'Cargando formas de pago...' : 'Selecciona una forma de pago'}</option>
                    {paymentMethods.map((method) => (
                      <option key={method.id} value={method.id}>{method.description}</option>
                    ))}
                  </select>
                  {paymentMethodsError && <small className="text-danger" role="alert">{paymentMethodsError}</small>}
                  {!loadingPaymentMethods && !paymentMethodsError && paymentMethods.length === 0 && (
                    <small role="status">No hay formas de pago disponibles.</small>
                  )}
                </div>
                {selectedPayment && ['description_1', 'description_2'].map((field, index) => (
                  <div key={field}>
                    <label className="form-label" htmlFor={`${paymentPanelId}-${field}`}>
                      {selectedPayment[field] || `Dato ${index + 1}`}
                    </label>
                    <input id={`${paymentPanelId}-${field}`} className="form-control" type="text"
                      value={paymentDetails[index]}
                      onChange={(event) => setPaymentDetails((current) => current.map((value, detailIndex) => (
                        detailIndex === index ? event.target.value : value
                      )))} />
                  </div>
                ))}
                </div>
                <div className="admission-payment-fields admission-payment-amounts mt-3">
                  <div>
                    <label className="form-label" htmlFor={`${paymentPanelId}-exchange-rate`}>Tipo de cambio</label>
                    <input id={`${paymentPanelId}-exchange-rate`} className="form-control" type="text"
                      value={onlyDollars && dollar ? numericFormat(dollar.value, 2) : ''} readOnly />
                  </div>
                  <div>
                    <label className="form-label" htmlFor={`${paymentPanelId}-exchange-date`}>Fecha del cambio</label>
                    <input id={`${paymentPanelId}-exchange-date`} className="form-control" type="text"
                      value={onlyDollars ? dollarDate : ''} readOnly />
                  </div>
                  <div>
                    <label className="form-label" htmlFor={`${paymentPanelId}-received`}>Recibido</label>
                    <input id={`${paymentPanelId}-received`} className="form-control" type="number" min="0" step="0.01"
                      placeholder="Recibido" value={received} onChange={(event) => setReceived(event.target.value)} />
                  </div>
                  <div>
                    <label className="form-label" htmlFor={`${paymentPanelId}-amount`}>Monto</label>
                    <input id={`${paymentPanelId}-amount`} className="form-control" type="number" min="0" step="0.01"
                      placeholder="Monto" value={paymentAmount} readOnly />
                  </div>
                </div>
              </div>
              <div className="card-footer d-flex align-items-center flex-wrap gap-3">
                <button type="button" className="btn btn-outline-warning" onClick={registerPayment}>REGISTRA FORMA DE PAGO</button>
                {paymentError && <span className="text-danger" role="alert">{paymentError}</span>}
              </div>
            </div>
          </div>
        </div>
    </>
  );
}
