import { useEffect, useRef, useState } from 'react';
import { getTypepayments, createTypepayment, updateTypepayment } from '../services/paymentMethodsService';
import '../styles/RoutinesExams.css';
import '../styles/PaymentMethods.css';

const fields = [['description', 'Denominación'], ['description_1', 'Descripción 1'], ['description_2', 'Descripción 2']];
const switches = [['only_dollars', 'Calcular el cambio'], ['annulled', 'Ocultar']];
const assertSuccess = (response) => {
  if (response?.success === false || response?.ok === false || response?.error) {
    throw new Error('No se pudo completar la operación.');
  }
};
const readPayments = (response) => {
  assertSuccess(response);
  const rows = Array.isArray(response) ? response : response?.typepayments ?? response?.typePayments ?? response?.typepayment ?? response?.data;
  if (!Array.isArray(rows)) throw new Error('No se pudo cargar la lista.');
  return rows;
};

function PaymentSettings({ payment, onSaved, onPending, disabled }) {
  const [draft, setDraft] = useState({
    description: payment.description ?? '',
    description_1: payment.description_1 ?? '',
    description_2: payment.description_2 ?? '',
    only_dollars: Number(payment.only_dollars) === 1,
    annulled: Number(payment.annulled) === 1,
  });
  const [pending, setPending] = useState(0);
  const [errors, setErrors] = useState({});
  const queueRef = useRef(Promise.resolve());

  const changeField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    const changes = { [field]: ['only_dollars', 'annulled'].includes(field) ? Number(value) : value };
    setPending((current) => current + 1);
    onPending(1);
    queueRef.current = queueRef.current.then(async () => {
      try {
        assertSuccess(await updateTypepayment(payment.id, changes));
        onSaved(payment.id, changes);
        setErrors((current) => ({ ...current, [field]: '' }));
      } catch {
        const label = [...fields, ...switches].find(([name]) => name === field)[1];
        setErrors((current) => ({ ...current, [field]: `No fue posible guardar ${label}. Modifica nuevamente el campo para reintentarlo.` }));
      } finally {
        setPending((current) => current - 1);
        onPending(-1);
      }
    });
  };

  return (
    <fieldset disabled={disabled} aria-busy={pending > 0}>
      {fields.map(([field, label]) => (
        <div className="mb-3" key={field}>
          <label className="form-label" htmlFor={`payment-${field}`}>{label}</label>
          <input id={`payment-${field}`} className="form-control" type="text" value={draft[field]}
            onChange={(event) => changeField(field, event.target.value)} />
        </div>
      ))}
      {switches.map(([field, label]) => (
        <div className="form-check form-switch mb-3" key={field}>
          <input id={`payment-${field}`} className="form-check-input" type="checkbox" role="switch"
            checked={draft[field]} onChange={(event) => changeField(field, event.target.checked)} />
          <label className="form-check-label" htmlFor={`payment-${field}`}>{label}</label>
        </div>
      ))}
      {pending > 0 && <p className="small" role="status">Guardando cambios...</p>}
      {Object.entries(errors).map(([field, message]) => message && (
        <p key={field} className="small text-danger" role="alert">{message}</p>
      ))}
    </fieldset>
  );
}

export default function PaymentMethods() {
  const [payments, setPayments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');
  const [pending, setPending] = useState(0);
  const pendingRef = useRef(0);
  const creatingRef = useRef(false);
  const selectedRowRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const rows = readPayments(await getTypepayments());
        if (active) setPayments(rows);
      } catch {
        if (active) setError('No fue posible cargar las formas de pago.');
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    selectedRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [selectedId]);

  const handlePending = (delta) => {
    pendingRef.current += delta;
    setPending(pendingRef.current);
  };
  const handleSaved = (id, changes) => {
    setPayments((current) => current.map((payment) => (
      String(payment.id) === String(id) ? { ...payment, ...changes } : payment
    )));
  };
  const createPayment = async () => {
    if (loading || error || creatingRef.current || pendingRef.current > 0) return;
    creatingRef.current = true;
    setCreating(true);
    setCreateError('');
    let created = false;
    const description = `Nueva forma de pago (${payments.length + 1})`;
    try {
      const response = await createTypepayment({ description, description_1: ' ', description_2: ' ', annulled: 0, only_dollars: 0 });
      assertSuccess(response);
      created = true;
      const rows = readPayments(await getTypepayments());
      const createdId = response?.data?.id ?? response?.typepayment?.id ?? response?.id;
      const newPayment = rows.find((payment) => createdId != null && String(payment.id) === String(createdId))
        ?? rows.find((payment) => payment.description === description
          && !payments.some((previous) => String(previous.id) === String(payment.id)));
      setPayments(rows);
      setSelectedId(newPayment?.id ?? null);
      if (!newPayment) setCreateError('La forma de pago fue creada, pero no aparece en la lista actualizada.');
    } catch {
      setCreateError(created
        ? 'La forma de pago fue creada, pero no se pudo actualizar la lista. Vuelve a abrir la pantalla.'
        : 'No fue posible crear la forma de pago. Vuelve a intentarlo.');
    } finally {
      creatingRef.current = false;
      setCreating(false);
    }
  };
  const selectedPayment = payments.find((payment) => String(payment.id) === String(selectedId));

  return (
    <div className="dashboard-content setting-exams-page payment-methods-page">
      <div className="routines-exams-header">
        <h1>Forma de pagos</h1>
        <button type="button" className="btn btn-primary" onClick={createPayment}
          disabled={loading || Boolean(error) || creating || pending > 0}>
          {creating ? 'Creando...' : 'Nueva forma de pago'}
        </button>
      </div>
      {createError && <p className="text-danger" role="alert">{createError}</p>}
      <div className="setting-exams-columns payment-methods-columns">
        <section className="routines-exams-column" aria-label="Formas de pago">
          {loading && <p className="setting-exams-status" role="status">Cargando...</p>}
          {error && <p className="text-danger" role="alert">{error}</p>}
          {!loading && !error && payments.length === 0 && <p>No hay formas de pago registradas.</p>}
          <ul className="setting-exams-group-list scrollbar-thin">
            {payments.map((payment) => {
              const selected = String(payment.id) === String(selectedId);
              return (
                <li key={payment.id} ref={selected ? selectedRowRef : null} className={selected ? 'is-selected' : ''}>
                  <button type="button" className="routines-exams-settings-button"
                    aria-label={`Configurar ${payment.description}`} aria-pressed={selected}
                    aria-controls="payment-settings-body" disabled={creating || pending > 0}
                    onClick={() => {
                      if (!creatingRef.current && pendingRef.current === 0) setSelectedId(payment.id);
                    }}>
                    <span className="ico ico-cog text-warning" aria-hidden="true" />
                  </button>
                  {Number(payment.annulled) === 1
                    ? <span className="ico ico-eye-off text-warning" role="img" aria-label="Inactivo" />
                    : <span className={`ico ico-eye4 ${selected ? 'setting-exams-group-description' : 'text-primary'}`} role="img" aria-label="Activo" />}
                  <span className="setting-exams-group-description">{payment.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="routines-exams-column" aria-labelledby="payment-settings-title">
          <h2 id="payment-settings-title" className="d-flex align-items-center gap-2">
            <span className="ico ico-cog text-warning" aria-hidden="true" />
            Configuración
          </h2>
          <div id="payment-settings-body" className="card routines-exams-settings-body scrollbar-thin">
            <div className="card-body p-0">
              {selectedPayment && <PaymentSettings key={selectedPayment.id} payment={selectedPayment}
                onSaved={handleSaved} onPending={handlePending} disabled={creating} />}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
