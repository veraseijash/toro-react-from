import { useEffect, useRef, useState } from 'react';
import { createCash_register, updateCash_register, getDollarvalue, getInvoiceTotales, getTypepayments } from '../../services/wayPayService';
import '../../styles/FlowCash.css';

const formatAmount = (value) => new Intl.NumberFormat('es-VE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
}).format(Number(value) || 0);

const newDeposit = (localId) => ({ localId, bank: '', number: '', amount: '0', cash: '0' });
const usesDollars = (payment) => Number(payment.only_dollars) === 1;

export default function FlowCash({ user, date, saving, onSavingChange, onSaved }) {
  const savingRef = useRef(false);
  const [saveError, setSaveError] = useState('');
  const register = Array.isArray(user.cash_register)
    ? user.cash_register[0]
    : user.cash_register;
  const hasRegister = Boolean(register && Object.keys(register).length > 0);
  const userId = user.id ?? user.userId;
  const [calculatedTotals, setCalculatedTotals] = useState([]);
  const [loading, setLoading] = useState(!hasRegister);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [deposits, setDeposits] = useState(() => (
    Array.isArray(register?.deposits)
      ? register.deposits.map((deposit, index) => ({ ...deposit, localId: index }))
      : hasRegister ? [] : [newDeposit(0)]
  ));
  const [nextId, setNextId] = useState(deposits.length);

  useEffect(() => {
    if (hasRegister) return;
    let active = true;
    setLoading(true);
    setError('');
    setCalculatedTotals([]);

    const loadTotals = async () => {
      try {
        const payments = await getTypepayments();
        if (!active) return;
        if (!Array.isArray(payments)) throw new Error('Respuesta de tipos de pago no válida');
        let dollarValue = 1;
        if (payments.some(usesDollars)) {
          const dollar = await getDollarvalue();
          if (!active) return;
          dollarValue = Number(dollar?.value);
          if (!Number.isFinite(dollarValue) || dollarValue <= 0) {
            throw new Error('Valor del dólar no válido');
          }
        }
        const rows = await Promise.all(payments.map(async (payment, index) => {
          const result = await getInvoiceTotales(date, userId, payment.id);
          if (result?.total_not_annulled == null || result?.total_annulled == null) {
            throw new Error('Respuesta de totales no válida');
          }
          const amounts = { ...result };
          if (usesDollars(payment)) {
            for (const field of [
              'total_not_annulled',
              'total_annulled',
              'total_dollars_not_annulled',
              'total_dollars_annulled',
            ]) {
              const amount = Number(result[field]);
              if (result[field] == null || !Number.isFinite(amount)) {
                throw new Error('Importe de totales no válido');
              }
              amounts[field] = Number((amount / dollarValue).toFixed(2));
            }
          }
          return {
            ...amounts,
            id: index,
            id_type_payment: payment.id,
            text: payment.description,
            ingress: amounts.total_not_annulled,
            egress: amounts.total_annulled,
          };
        }));
        if (active) setCalculatedTotals(rows);
      } catch {
        if (active) setError('No se pudieron cargar los totales de caja.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadTotals();
    return () => { active = false; };
  }, [hasRegister, date, userId, retry]);

  const totals = hasRegister
    ? (Array.isArray(register.totals) ? register.totals : [])
    : calculatedTotals;
  const updateDeposit = (localId, field, value) => {
    setDeposits((current) => current.map((deposit) => (
      deposit.localId === localId ? { ...deposit, [field]: value } : deposit
    )));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    setSaveError('');
    if (!hasRegister && (loading || error)) {
      setSaveError('Espera a que los totales se carguen correctamente antes de registrar.');
      return;
    }
    if (userId == null || !date || (hasRegister && register.id == null)) {
      setSaveError('Faltan datos del usuario, la fecha o el cierre de caja. Actualiza la lista.');
      return;
    }

    const payload = {
      user_id: Number(userId),
      admission_date: date,
      deposits: deposits.map(({ bank, number, amount, cash }) => ({
        bank: bank ?? '',
        number: number ?? '',
        amount: Number(amount).toFixed(2),
        cash: Number(cash).toFixed(2),
      })),
      totals: totals.map((total, index) => ({
        text: total.text,
        id: total.id ?? index,
        id_type_payment: Number(total.id_type_payment),
        ingress: Number(total.ingress),
        egress: Number(total.egress),
      })),
    };
    if (payload.deposits.some((deposit) => !Number.isFinite(Number(deposit.amount)) || !Number.isFinite(Number(deposit.cash)))
      || payload.totals.some((total) => !Number.isFinite(total.ingress) || !Number.isFinite(total.egress) || !Number.isFinite(total.id_type_payment))) {
      setSaveError('Revisa los importes de los depósitos y los totales.');
      return;
    }

    savingRef.current = true;
    onSavingChange(true);
    try {
      const result = hasRegister
        ? await updateCash_register(register.id, payload)
        : await createCash_register(payload);
      if (result?.success === false || result?.ok === false || result?.error
        || Number(result?.status) >= 400 || Number(result?.statusCode) >= 400) {
        throw new Error('No se pudo guardar el cierre');
      }
      onSaved();
    } catch {
      setSaveError('No se pudo registrar el cierre de caja. Intenta nuevamente.');
    } finally {
      savingRef.current = false;
      onSavingChange(false);
    }
  };

  return (
    <form id="flow-cash-form" className="flow-cash" onSubmit={handleSubmit}>
      <fieldset disabled={saving}>
      {saveError && <p role="alert">{saveError}</p>}
      <h2 className="h5 text-center text-white mb-3">CIERRE DE CAJA {register?.admission_date || date}</h2>
      <p>Cajero: <span className="small">{user.name}</span></p>

      {!hasRegister && loading && <p role="status">Cargando totales...</p>}
      {!hasRegister && error && (
        <div className="mb-3">
          <p role="alert">{error}</p>
          <button type="button" className="btn btn-secondary" onClick={() => setRetry((value) => value + 1)}>
            Reintentar
          </button>
        </div>
      )}

      <div className="card mb-3">
        <div className="card-body table-responsive">
          <table className="table mb-0 flow-cash-totals">
            <thead>
              <tr>
                <th scope="col">Descripción</th>
                <th scope="col" className="text-end">Entrada</th>
                <th scope="col" className="text-end">Salida</th>
                <th scope="col" className="text-end">Total</th>
              </tr>
            </thead>
            <tbody>
              {totals.map((total, index) => (
                <tr key={total.id ?? index}>
                  <td>{total.text}</td>
                  <td className="text-end">{formatAmount(total.ingress)}</td>
                  <td className="text-end">{formatAmount(total.egress)}</td>
                  <td className="text-end fw-bold">
                    {formatAmount((Number(total.ingress) || 0) - (Number(total.egress) || 0))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <h3 className="h6 text-white mb-4">Depósitos:</h3>
      <div className="flow-cash-deposits">
        {deposits.map((deposit, index) => (
          <div className="card flow-cash-deposit" key={deposit.localId}>
            <div className="flow-cash-deposit-actions">
              <button
                type="button"
                className="btn btn-secondary flow-cash-circle"
                aria-label={`Eliminar depósito ${index + 1}`}
                title={`Eliminar depósito ${index + 1}`}
                onClick={() => setDeposits((current) => current.filter((item) => item.localId !== deposit.localId))}
              >
                <span className="ico ico-trash-o" aria-hidden="true" />
              </button>
              <span className="flow-cash-circle flow-cash-deposit-number" aria-label={`Depósito ${index + 1}`}>
                {index + 1}
              </span>
            </div>
            <div className="card-body d-flex flex-column gap-3">
              <input
                className="form-control"
                aria-label={`Banco del depósito ${index + 1}`}
                placeholder="Banco"
                value={deposit.bank ?? ''}
                onChange={(event) => updateDeposit(deposit.localId, 'bank', event.target.value)}
              />
              <input
                className="form-control"
                aria-label={`Número de planilla del depósito ${index + 1}`}
                placeholder="N° planilla"
                value={deposit.number ?? ''}
                onChange={(event) => updateDeposit(deposit.localId, 'number', event.target.value)}
              />
              {[
                ['amount', 'Total depósito'],
                ['cash', 'Total efectivo'],
              ].map(([field, label]) => (
                <label className="d-block" key={field}>
                  <span className="form-label small d-block mb-1">{label}</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={deposit[field] ?? ''}
                    onChange={(event) => updateDeposit(deposit.localId, field, event.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
        <div className="text-end">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              setDeposits((current) => [...current, newDeposit(nextId)]);
              setNextId((current) => current + 1);
            }}
          >
            Agregar
          </button>
        </div>
      </div>
      </fieldset>
    </form>
  );
}
