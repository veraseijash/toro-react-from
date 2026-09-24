import { useEffect, useRef, useState } from 'react';
import { createTax, getTaxs, updateTax as updateTaxService } from '../../services/laboratoryService';
import { IMAGES_BASE_URL } from '../../config/appConfig';

const isChecked = (value) => value === true || Number(value) === 1;
const TAX_SWITCHES = [
  ['only_dollars', 'Solo en dólares'],
  ['always_subtotal', 'Fijo en Sub-total'],
  ['hide', 'Ocultar'],
];
const CONFIGURATIONS = [
  {
    title: 'Configuración factura',
    toggle: ['print_invoice', 'Imprimir factura al ingreso de paciente'],
    number: ['invoice_number', 'Número correlativo de factura'],
    rows: 'rows_description_invoices',
  },
  {
    title: 'Configuración comprobante',
    toggle: ['print_receipt', 'Imprimir comprobante al ingreso de paciente'],
    number: ['receipt_number', 'Número correlativo de comprobante'],
    rows: 'rows_description_receipt',
  },
  {
    title: 'Configuración toma muestra',
    toggle: ['print_sample_take', 'Imprimir toma de muestra al ingreso de paciente'],
    number: ['voucher_number', 'Número correlativo de toma de muestra'],
  },
];

function LaboratoryInvoice({ laboratory, setLaboratory }) {
  const [taxes, setTaxes] = useState([]);
  const [loadingTaxes, setLoadingTaxes] = useState(true);
  const [taxError, setTaxError] = useState('');
  const [isCreatingTax, setIsCreatingTax] = useState(false);
  const [createTaxError, setCreateTaxError] = useState('');
  const creatingTaxRef = useRef(false);
  const taxDraftsRef = useRef(new Map());
  const taxTimersRef = useRef(new Map());
  const taxQueueRef = useRef(Promise.resolve());
  const [taxSaveStates, setTaxSaveStates] = useState({});
  const logoUrl = laboratory.logo
    ? `${IMAGES_BASE_URL.replace(/\/+$/, '')}/${String(laboratory.logo).replace(/^\/+/, '')}`
    : '';
  const receiptHtml = String(laboratory.receipt_format ?? '').replaceAll('[src_image]', () => (
    logoUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  ));

  useEffect(() => {
    let active = true;
    const loadTaxes = async () => {
      try {
        const response = await getTaxs();
        const rows = Array.isArray(response) ? response : response?.data ?? response?.taxs ?? response?.taxes;
        if (response?.success === false || response?.error || !Array.isArray(rows)) {
          throw new Error('Respuesta de impuestos inválida.');
        }
        if (active) setTaxes(rows);
      } catch {
        if (active) setTaxError('No fue posible cargar los impuestos.');
      } finally {
        if (active) setLoadingTaxes(false);
      }
    };
    loadTaxes();
    return () => { active = false; };
  }, []);

  const updateField = (field, value) => setLaboratory((current) => ({ ...current, [field]: value }));
  const handleCreateTax = async () => {
    if (creatingTaxRef.current) return;
    creatingTaxRef.current = true;
    setIsCreatingTax(true);
    setCreateTaxError('');
    const newTax = { description: 'nuevo', value: 0, only_dollars: 0, always_subtotal: 0, hide: 0 };
    try {
      const response = await createTax(newTax);
      if (response?.success === false || response?.ok === false || response?.error
        || Number(response?.statusCode) >= 400 || Number(response?.status) >= 400) {
        throw new Error('No se pudo crear el impuesto.');
      }
      const created = response?.tax ?? response?.data ?? response;
      setTaxes((current) => [...current, {
        ...newTax,
        ...(created && typeof created === 'object' && !Array.isArray(created) ? created : {}),
      }]);
    } catch {
      setCreateTaxError('No fue posible crear el impuesto. Intenta nuevamente.');
    } finally {
      creatingTaxRef.current = false;
      setIsCreatingTax(false);
    }
  };
  const saveTax = (index, tax) => {
    const payload = {
      description: tax.description ?? '',
      value: Number(tax.value || 0),
      only_dollars: isChecked(tax.only_dollars) ? 1 : 0,
      always_subtotal: isChecked(tax.always_subtotal) ? 1 : 0,
      hide: isChecked(tax.hide) ? 1 : 0,
    };
    taxQueueRef.current = taxQueueRef.current.then(async () => {
      try {
        if (tax.id == null) throw new Error('El impuesto no tiene identificador.');
        const response = await updateTaxService(tax.id, payload);
        if (response?.success === false || response?.ok === false || response?.error
          || Number(response?.statusCode) >= 400 || Number(response?.status) >= 400) {
          throw new Error('No se pudo guardar el impuesto.');
        }
        if (taxDraftsRef.current.get(index) === tax) {
          setTaxSaveStates((current) => ({ ...current, [index]: 'saved' }));
        }
      } catch {
        if (taxDraftsRef.current.get(index) === tax) {
          setTaxSaveStates((current) => ({ ...current, [index]: 'error' }));
        }
      }
    });
  };

  const updateTax = (index, field, value) => {
    const tax = { ...(taxDraftsRef.current.get(index) ?? taxes[index]), [field]: value };
    taxDraftsRef.current.set(index, tax);
    setTaxes((current) => current.map((item, row) => row === index ? tax : item));
    setTaxSaveStates((current) => ({ ...current, [index]: 'saving' }));
    clearTimeout(taxTimersRef.current.get(index)?.timer);
    taxTimersRef.current.delete(index);
    if (TAX_SWITCHES.some(([name]) => name === field)) {
      saveTax(index, tax);
    } else {
      const flush = () => {
        taxTimersRef.current.delete(index);
        saveTax(index, tax);
      };
      taxTimersRef.current.set(index, { timer: setTimeout(flush, 500), flush });
    }
  };

  useEffect(() => {
    const timers = taxTimersRef.current;
    return () => {
      for (const { timer, flush } of timers.values()) {
        clearTimeout(timer);
        flush();
      }
    };
  }, []);

  const renderField = (field, label, type = 'number') => (
    <div>
      <label className="form-label" htmlFor={`laboratory-${field}`}>{label}</label>
      <input id={`laboratory-${field}`} name={field} className="form-control" type={type}
        min={type === 'number' ? 0 : undefined} step={type === 'number' ? 1 : undefined}
        value={laboratory[field] ?? ''}
        onChange={(event) => updateField(field, type === 'number' && event.target.value !== ''
          ? Number(event.target.value) : event.target.value)} />
    </div>
  );

  return (
    <div className="row g-4 setting-laboratory-invoice">
      <div className="col-12 col-xl-6">
        {[
          ['voucher_format', 'Modelo de factura'],
          ['receipt_format', 'Modelo de comprobante'],
        ].map(([field, title]) => (
          <section className="mb-3" key={field} aria-labelledby={`laboratory-${field}-title`}>
            <h2 className="fs-6 text-primary mb-2" id={`laboratory-${field}-title`}>{title}</h2>
            <div className="border rounded p-2">
              {laboratory[field] ? (
                <iframe className="setting-laboratory-template" title={title} sandbox=""
                  srcDoc={field === 'receipt_format' ? receiptHtml : String(laboratory[field])} />
              ) : <p className="text-secondary mb-0">Sin modelo configurado.</p>}
            </div>
          </section>
        ))}
      </div>
      <div className="col-12 col-xl-6">
        {CONFIGURATIONS.map(({ title, toggle, number, rows }) => (
          <section className="mb-3" key={toggle[0]} aria-labelledby={`laboratory-${toggle[0]}-title`}>
            <h2 className="fs-6 text-primary mb-2" id={`laboratory-${toggle[0]}-title`}>{title}</h2>
            <div className="border rounded p-3">
              <div className="row g-4 align-items-center">
                <div className="col-12 col-md-6">
                  <div className="form-check form-switch">
                    <input className="form-check-input" type="checkbox" role="switch"
                      id={`laboratory-${toggle[0]}`} checked={isChecked(laboratory[toggle[0]])}
                      onChange={(event) => updateField(toggle[0], event.target.checked ? 1 : 0)} />
                    <label className="form-check-label" htmlFor={`laboratory-${toggle[0]}`}>{toggle[1]}</label>
                  </div>
                </div>
                <div className="col-12 col-md-6">{renderField(...number)}</div>
                {rows ? (
                  <div className="col-12 col-md-6">
                    {renderField(rows, 'Número máximo de filas en la descripción')}
                  </div>
                ) : (
                  <>
                    <div className="col-12 col-md-6">{renderField('printer_type', 'Impresora Tiquera', 'text')}</div>
                    <div className="col-12 col-md-6">
                      {renderField('printer_interface', 'Localización en la red', 'text')}
                      <small className="text-secondary">Ej. //localhost/pos-80 o //192.168.1.15/nombre impresora</small>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        ))}
        <section aria-labelledby="laboratory-taxes-title" aria-busy={loadingTaxes}>
          <h2 className="fs-6 text-primary mb-2" id="laboratory-taxes-title">Configuración de impuestos</h2>
          <div className="border rounded p-3">
            {loadingTaxes && <p role="status">Cargando impuestos...</p>}
            {taxError && <p className="text-danger" role="alert">{taxError}</p>}
            {!loadingTaxes && !taxError && (
              <>
                <div className="table-responsive">
                  <table className="table align-middle setting-laboratory-taxes">
                    <thead>
                      <tr>
                        <th scope="col">Descripción</th>
                        <th scope="col">Valor</th>
                        {TAX_SWITCHES.map(([field, label]) => <th scope="col" key={field}>{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {taxes.map((tax, index) => (
                        <tr key={tax.id ?? `new-${index}`}>
                          <td>
                            <input className="form-control" aria-label={`Descripción del impuesto ${index + 1}`}
                              value={tax.description ?? ''} onChange={(event) => updateTax(index, 'description', event.target.value)} />
                            {taxSaveStates[index] === 'saving' && <small className="text-secondary" role="status">Guardando...</small>}
                            {taxSaveStates[index] === 'saved' && <small className="text-secondary" role="status">Guardado</small>}
                            {taxSaveStates[index] === 'error' && (
                              <div className="text-danger small" role="alert">
                                No se pudo guardar.
                                <button type="button" className="btn btn-link btn-sm" onClick={() => {
                                  setTaxSaveStates((current) => ({ ...current, [index]: 'saving' }));
                                  saveTax(index, taxDraftsRef.current.get(index));
                                }}>Reintentar</button>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="input-group">
                              <input className="form-control" type="number" min="0" step="0.01"
                                aria-label={`Valor del impuesto ${index + 1}`} value={tax.value ?? 0}
                                onChange={(event) => updateTax(index, 'value', event.target.value === '' ? '' : Number(event.target.value))} />
                              <span className="input-group-text">%</span>
                            </div>
                          </td>
                          {TAX_SWITCHES.map(([field, label]) => (
                            <td key={field}>
                              <div className="form-check form-switch">
                                <input className="form-check-input" type="checkbox" role="switch"
                                  aria-label={`${label}, impuesto ${index + 1}`} checked={isChecked(tax[field])}
                                  onChange={(event) => updateTax(index, field, event.target.checked ? 1 : 0)} />
                              </div>
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {createTaxError && <p className="text-danger mt-3 mb-0" role="alert">{createTaxError}</p>}
                <div className="d-flex justify-content-end mt-3">
                  <button type="button" className="btn btn-outline-primary" disabled={isCreatingTax}
                    onClick={handleCreateTax}>
                    {isCreatingTax ? 'Creando impuesto...' : 'Agregar nuevo impuesto'}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default LaboratoryInvoice;
