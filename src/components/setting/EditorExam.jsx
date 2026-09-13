import { useEffect, useRef, useState } from 'react';
import { Modal } from 'bootstrap';
import { getExamList, getTaxs } from '../../services/examsService';
import WorksheetEditor from './WorksheetEditor';
import FormatVue from './FormatVue';

const TABS = [
  { id: 'detail', title: 'Detalle' },
  { id: 'worksheet', title: 'Hoja de trabajo' },
  { id: 'edit', title: 'Editar examen' },
];

function EditorExam({ examId, onClose }) {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [draft, setDraft] = useState({});
  const [fieldErrors, setFieldErrors] = useState({});
  const [taxes, setTaxes] = useState([]);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(false);
  const [taxError, setTaxError] = useState('');

  useEffect(() => {
    const element = modalRef.current;
    const modal = new Modal(element);
    modalInstanceRef.current = modal;
    const handleHidden = () => onClose(null);
    element.addEventListener('hidden.bs.modal', handleHidden);
    return () => {
      element.removeEventListener('hidden.bs.modal', handleHidden);
      modal.hide();
      modal.dispose();
      modalInstanceRef.current = null;
    };
  }, [onClose]);

  useEffect(() => {
    if (examId == null) {
      modalInstanceRef.current?.hide();
      return undefined;
    }
    let isCurrent = true;
    setExam(null);
    setDraft({});
    setFieldErrors({});
    setTaxes([]);
    setTaxError('');
    setIsLoadingTaxes(true);
    setError('');
    setIsLoading(true);
    setActiveTab(TABS[0].id);
    modalInstanceRef.current?.show();

    const loadExam = async () => {
      try {
        const response = await getExamList(examId);
        const data = response?.data ?? response?.exam ?? response;
        if (response?.success === false || response?.ok === false || response?.error
          || !data || typeof data.description !== 'string') {
          throw new Error('No se pudo cargar el examen.');
        }
        if (isCurrent) {
          setExam(data);
          setDraft({
            description: data.description,
            abbreviation: data.abbreviation ?? '',
            work_sheet: data.work_sheet ?? '',
            tax_id: String(data.tax_id ?? ''),
            annulled: Number(data.annulled) === 1,
            special_test: Number(data.special_test) === 1,
            ...Object.fromEntries([1, 2, 3, 4, 5, 6].map((number) => [
              `cost${number}`, String(Number(data[`cost${number}`] ?? 0)),
            ])),
          });
        }
      } catch {
        if (isCurrent) setError('No se pudo cargar la información del examen. Cierra la ventana y vuelve a intentarlo.');
      } finally {
        if (isCurrent) setIsLoading(false);
      }
    };
    const loadTaxes = async () => {
      try {
        const response = await getTaxs();
        const rows = Array.isArray(response) ? response : response?.data ?? response?.taxs ?? response?.taxes;
        if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows) || rows.length === 0) {
          throw new Error('No hay impuestos disponibles.');
        }
        if (isCurrent) setTaxes(rows);
      } catch {
        if (isCurrent) setTaxError('No se pudieron cargar los tipos de impuesto. Cierra la ventana y vuelve a intentarlo.');
      } finally {
        if (isCurrent) setIsLoadingTaxes(false);
      }
    };
    loadExam();
    loadTaxes();
    return () => { isCurrent = false; };
  }, [examId]);

  const updateField = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setFieldErrors((current) => ({ ...current, [name]: false }));
  };

  const handleTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    modalRef.current.querySelector(`#editor-exam-tab-${TABS[nextIndex].id}`)?.focus();
  };

  return (
    <div ref={modalRef} className="modal editor-exam-modal" tabIndex={-1} aria-labelledby="editor-exam-title" aria-hidden="true">
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          <div className="modal-header">
            <h2 className="modal-title fs-5" id="editor-exam-title">
              {exam?.description ?? (isLoading ? 'Cargando examen...' : 'Editar examen')}
            </h2>
            <div className="d-flex align-items-center gap-3 ms-auto ps-3">
              <button type="button" className="btn btn-primary" disabled>Registrar</button>
              <button type="button" className="btn-close m-0" data-bs-dismiss="modal" aria-label="Cerrar" />
            </div>
          </div>
          <div className="modal-body">
            {isLoading && <p role="status">Cargando información del examen...</p>}
            {error && <p className="text-danger" role="alert">{error}</p>}
            <ul className="nav nav-tabs" role="tablist" aria-label="Editor de examen">
              {TABS.map((tab, index) => (
                <li className="nav-item" role="presentation" key={tab.id}>
                  <button
                    type="button"
                    className={`nav-link${activeTab === tab.id ? ' active' : ''}`}
                    id={`editor-exam-tab-${tab.id}`}
                    role="tab"
                    aria-controls={`editor-exam-panel-${tab.id}`}
                    aria-selected={activeTab === tab.id}
                    tabIndex={activeTab === tab.id ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(event) => handleTabKeyDown(event, index)}
                  >
                    {tab.title}
                  </button>
                </li>
              ))}
            </ul>
            <div className="tab-content pt-3">
              {TABS.map((tab) => (
                <div
                  key={tab.id}
                  className={`tab-pane${activeTab === tab.id ? ' active' : ''}${tab.id === 'edit' ? ' editor-exam-format-panel' : ''}`}
                  id={`editor-exam-panel-${tab.id}`}
                  role="tabpanel"
                  aria-labelledby={`editor-exam-tab-${tab.id}`}
                  tabIndex={0}
                >
                  {tab.id === 'detail' ? (
                    <div className="editor-exam-detail container">
                      <fieldset disabled={isLoading || !exam || Boolean(error)}>
                        <div className="row g-3 mb-3">
                          {[['description', 'Descripción'], ['abbreviation', 'Abreviatura']].map(([name, label]) => (
                            <div className="col-6" key={name}>
                              <label className="form-label" htmlFor={`editor-exam-${name}`}>{label}</label>
                              <input
                                id={`editor-exam-${name}`}
                                name={name}
                                className={`form-control${fieldErrors[name] ? ' is-invalid' : ''}`}
                                value={draft[name] ?? ''}
                                required
                                aria-invalid={Boolean(fieldErrors[name])}
                                aria-describedby={fieldErrors[name] ? `editor-exam-${name}-error` : undefined}
                                onChange={(event) => updateField(name, event.target.value)}
                                onBlur={(event) => setFieldErrors((current) => ({ ...current, [name]: !event.target.value.trim() }))}
                              />
                              <div id={`editor-exam-${name}-error`} className="text-warning small mt-1" hidden={!fieldErrors[name]}>
                                Este campo no debe quedar en blanco.
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="row g-3 mb-3">
                          {[1, 2, 3, 4, 5, 6].map((number) => (
                            <div className="col-2" key={number}>
                              <label className="form-label" htmlFor={`editor-exam-cost${number}`}>Precio {number}</label>
                              <input
                                id={`editor-exam-cost${number}`}
                                name={`cost${number}`}
                                className="form-control"
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                value={draft[`cost${number}`] ?? '0'}
                                onChange={(event) => {
                                  if (/^\d*$/.test(event.target.value)) updateField(`cost${number}`, event.target.value);
                                }}
                                onBlur={(event) => {
                                  if (event.target.value === '') updateField(`cost${number}`, '0');
                                }}
                              />
                            </div>
                          ))}
                        </div>
                        <div className="row g-3 align-items-end">
                          <div className="col-2">
                            <label className="form-label" htmlFor="editor-exam-tax">Tipo de impuesto</label>
                            <select
                              id="editor-exam-tax"
                              name="tax_id"
                              className="form-select"
                              value={draft.tax_id ?? ''}
                              disabled={isLoadingTaxes || Boolean(taxError)}
                              onChange={(event) => updateField('tax_id', event.target.value)}
                            >
                              <option value="">{isLoadingTaxes ? 'Cargando...' : 'Selecciona'}</option>
                              {taxes.map((tax) => <option key={tax.id} value={tax.id}>{tax.description}</option>)}
                            </select>
                            {taxError && <p className="text-warning small mt-1" role="alert">{taxError}</p>}
                          </div>
                          <div className="col-6 d-flex flex-wrap gap-4">
                            {[['annulled', 'Anulado'], ['special_test', 'Prueba especial']].map(([name, label]) => (
                              <div className="form-check form-switch" key={name}>
                                <input
                                  id={`editor-exam-${name}`}
                                  name={name}
                                  className="form-check-input"
                                  type="checkbox"
                                  role="switch"
                                  checked={Boolean(draft[name])}
                                  onChange={(event) => updateField(name, event.target.checked)}
                                />
                                <label className="form-check-label" htmlFor={`editor-exam-${name}`}>{label}</label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </fieldset>
                    </div>
                  ) : tab.id === 'worksheet' ? (
                    exam && !isLoading && !error && <WorksheetEditor
                      key={examId}
                      initialValue={exam.work_sheet ?? ''}
                      onChange={(value) => updateField('work_sheet', value)}
                    />
                  ) : (
                    exam && !isLoading && !error && <FormatVue format={exam.format_vue} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default EditorExam;
