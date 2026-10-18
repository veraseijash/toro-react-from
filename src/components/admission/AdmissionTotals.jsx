import { useEffect, useId, useRef, useState } from 'react';
import { Modal } from 'bootstrap';
import { createDollarvalue, getDollarvalue } from '../../services/admissionService';
import numericFormat from '../../utils/numericFormat';

function readDollarValue(response) {
  if (response?.success === false || response?.error) throw new Error('Respuesta inválida');
  const data = response?.dollarvalue ?? response?.data ?? response;
  if (Array.isArray(data)) {
    return [...data].sort((a, b) => new Date(b.date) - new Date(a.date))[0] ?? null;
  }
  return data?.date != null && data?.value != null ? data : null;
}

export default function AdmissionTotals({ totals }) {
  const discountId = useId();
  const dollarId = useId();
  const modalRef = useRef(null);
  const modalInstance = useRef(null);
  const savingRef = useRef(false);
  const [dollar, setDollar] = useState(null);
  const [loadingDollar, setLoadingDollar] = useState(true);
  const [dollarError, setDollarError] = useState('');
  const [draft, setDraft] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getDollarvalue().then((response) => {
      const value = readDollarValue(response);
      console.log('Loaded dollar value:', value);
      if (active) setDollar(value);
    }).catch(() => {
      if (active) setDollarError('No se pudo cargar el valor del dólar.');
    }).finally(() => {
      if (active) setLoadingDollar(false);
    });
    const element = modalRef.current;
    const modal = new Modal(element);
    modalInstance.current = modal;
    const preventHide = (event) => { if (savingRef.current) event.preventDefault(); };
    const focusInput = () => element.querySelector('input')?.focus();
    element.addEventListener('hide.bs.modal', preventHide);
    element.addEventListener('shown.bs.modal', focusInput);
    return () => {
      active = false;
      element.removeEventListener('hide.bs.modal', preventHide);
      element.removeEventListener('shown.bs.modal', focusInput);
      modal.hide();
      modal.dispose();
      modalInstance.current = null;
    };
  }, []);

  const saveDollar = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    const value = Number(draft);
    if (!Number.isFinite(value) || value <= 0) {
      setSaveError('Ingresa un valor mayor que cero.');
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const payload = { date: new Date(), value };
      const response = await createDollarvalue(payload);
      const saved = readDollarValue(response);
      setDollar(saved ?? payload);
      setDollarError('');
      savingRef.current = false;
      modalInstance.current?.hide();
    } catch {
      setSaveError('No se pudo guardar el valor del dólar. Intenta nuevamente.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const { subtotal, discount, setDiscount, discountAmount, loadingTaxes, taxError, taxTotals, totalToPay } = totals;
  return (
        <>
        <div className="card admission-exams-totals">
          <div className="card-body">
            <div style={{ width: '50%' }}>
              <div className="d-flex align-items-center gap-2" style={{ color: 'var(--text-warning)' }}>
                <button type="button" aria-label="Nuevo valor del Dolar" style={{ color: 'inherit', background: 'none', border: 0, padding: 0 }} onClick={() => {
                  setDraft('');
                  setSaveError('');
                  modalInstance.current?.show();
                }}><span className="ico ico-dolllar-plus ico-2x" aria-hidden="true"></span></button>
                <span>Valor del dólar{dollar && ` (${(dollar.date instanceof Date ? dollar.date.toISOString() : String(dollar.date)).slice(0, 10).split('-').reverse().join('/')}) $${numericFormat(dollar.value, 2)}`}</span>
              </div>
              {loadingDollar && <small role="status">Cargando valor del dólar...</small>}
              {dollarError && <small className="text-danger" role="alert">{dollarError}</small>}
            </div>
            <div style={{ width: '50%' }}>
              <div className="admission-total-row">
                <span>SUB-TOTAL</span><span>{numericFormat(subtotal, 2)}</span>
              </div>
              <div className="admission-total-row">
                <div className="admission-discount-field">
                  <label htmlFor={discountId}>DESCUENTO (%)</label>
                  <input className="form-control" id={discountId} type="number" min={0} max={100} step={1} value={discount} onChange={(event) => setDiscount(event.target.value)} />
                </div>
                <span>-{numericFormat(discountAmount, 2)}</span>
              </div>
              {loadingTaxes && <small role="status">Cargando impuestos...</small>}
              {taxError && <small className="text-danger" role="alert">{taxError}</small>}
              {taxTotals.map((tax) => (
                <div className="admission-total-row" key={tax.id}>
                  <span>{Number(tax.value) === 0 ? 'Exonerado' : `IVA: ${numericFormat(tax.value, 2)} %`} sobre {numericFormat(tax.base, 2)}</span>
                  <span>{numericFormat(tax.amount, 2)}</span>
                </div>
              ))}
              <div className="admission-total-row fw-bold">
                <span>TOTAL A PAGAR</span><span>{numericFormat(totalToPay, 2)}</span>
              </div>
            </div>
          </div>
        </div>
        <div ref={modalRef} className="modal" tabIndex={-1} aria-labelledby={`${dollarId}-title`} aria-hidden="true">
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content" onSubmit={saveDollar}>
              <div className="modal-header">
                <h2 className="modal-title fs-5" id={`${dollarId}-title`}>Nuevo valor del Dolar</h2>
              </div>
              <div className="modal-body">
                <label htmlFor={dollarId} className="form-label">Valor del dólar</label>
                <input id={dollarId} className="form-control" type="number" min="0.000001" step="any" required value={draft} disabled={saving} onChange={(event) => setDraft(event.target.value)} />
                {saveError && <p className="text-danger mt-2" role="alert">{saveError}</p>}
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Guardando...' : 'Aceptar'}</button>
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={saving}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
        </>
  );
}
