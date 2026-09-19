import { useEffect, useRef, useState } from 'react';
import { createParasiticforms, deleteParasiticforms, getParasiticformsLists, updateParasiticforms } from '../services/parasiticformsService';
import '../styles/RoutinesExams.css';
import '../styles/ListParasiticforms.css';

const readParasiticforms = (response) => {
  const rows = Array.isArray(response) ? response
    : response?.parasiticforms ?? response?.listParasiticforms ?? response?.data;
  if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
    throw new Error('No se pudieron cargar las formas parasitarias.');
  }
  return rows;
};

function ParasiticformsSettings({ parasiticform, onSaved, onPending, disabled }) {
  const [draft, setDraft] = useState({
    description: parasiticform.description ?? '',
    annulled: Number(parasiticform.annulled) === 1,
  });
  const [pending, setPending] = useState(0);
  const [saveErrors, setSaveErrors] = useState({});
  const queueRef = useRef(Promise.resolve());

  const changeField = (field, value) => {
    if (field === 'description') {
      value = value.slice(0, 50);
    }
    setDraft((current) => ({ ...current, [field]: value }));
    const changes = { [field]: field === 'annulled' ? Number(value) : value };
    setPending((current) => current + 1);
    onPending(1);
    queueRef.current = queueRef.current.then(async () => {
      try {
        const response = await updateParasiticforms(parasiticform.id, changes);
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar el cambio.');
        }
        await onSaved(parasiticform.id, changes);
        setSaveErrors((current) => ({ ...current, [field]: '' }));
      } catch {
        const label = { description: 'Descripción', annulled: 'Ocultar' }[field];
        setSaveErrors((current) => ({
          ...current,
          [field]: `No fue posible guardar ${label}. Modifica nuevamente el campo para reintentarlo.`,
        }));
      } finally {
        setPending((current) => current - 1);
        onPending(-1);
      }
    });
  };

  return (
    <fieldset disabled={disabled} aria-busy={pending > 0}>
      <div className="mb-3">
        <label className="form-label" htmlFor="parasiticform-description">Descripción</label>
        <input id="parasiticform-description" className="form-control" type="text" maxLength={50}
          value={draft.description}
          onChange={(event) => changeField('description', event.target.value)} />
      </div>
      <div className="form-check form-switch">
        <input id="parasiticform-annulled" className="form-check-input" type="checkbox" role="switch"
          checked={draft.annulled}
          onChange={(event) => changeField('annulled', event.target.checked)} />
        <label className="form-check-label" htmlFor="parasiticform-annulled">Ocultar</label>
      </div>
      {pending > 0 && <p className="small mt-3" role="status">Guardando cambios...</p>}
      {Object.entries(saveErrors).map(([field, message]) => message && (
        <p key={field} className="small text-danger mt-3" role="alert">{message}</p>
      ))}
    </fieldset>
  );
}

function ListParasiticforms() {
  const [parasiticforms, setParasiticforms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newParasiticformsId, setNewParasiticformsId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingSettings, setPendingSettings] = useState(0);
  const [operation, setOperation] = useState(null);
  const [operationError, setOperationError] = useState('');
  const operationRef = useRef(false);
  const listRef = useRef(null);
  const scrollToIdRef = useRef(null);

  const handleSaved = async (id, changes) => {
    setParasiticforms((current) => current.map((parasiticform) => (
      String(parasiticform.id) === String(id) ? { ...parasiticform, ...changes } : parasiticform
    )));
    if ('description' in changes) {
      setOperationError('');
      try {
        const rows = readParasiticforms(await getParasiticformsLists());
        if (!rows.some((parasiticform) => String(parasiticform.id) === String(id))) {
          throw new Error('La forma parasitaria no aparece en la lista actualizada.');
        }
        scrollToIdRef.current = id;
        setParasiticforms(rows);
        setSelectedId(id);
      } catch {
        setOperationError('La descripción se guardó, pero no fue posible actualizar la lista.');
      }
    }
  };

  const handlePending = (delta) => setPendingSettings((current) => current + delta);

  useEffect(() => {
    let active = true;
    const loadParasiticforms = async () => {
      try {
        const rows = readParasiticforms(await getParasiticformsLists());
        if (active) setParasiticforms(rows);
      } catch {
        if (active) setError('No fue posible cargar las formas parasitarias.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadParasiticforms();
    return () => { active = false; };
  }, []);

  const selectedParasiticforms = parasiticforms.find((parasiticform) => String(parasiticform.id) === String(selectedId));
  const canCancel = selectedParasiticforms && newParasiticformsId != null
    && String(selectedParasiticforms.id) === String(newParasiticformsId);

  useEffect(() => {
    if (scrollToIdRef.current == null) return;
    const list = listRef.current;
    const row = Array.from(list?.children ?? []).find((item) => item.dataset.id === String(scrollToIdRef.current));
    if (!row) return;
    const listBounds = list.getBoundingClientRect();
    const rowBounds = row.getBoundingClientRect();
    if (rowBounds.top < listBounds.top) list.scrollTop += rowBounds.top - listBounds.top;
    else if (rowBounds.bottom > listBounds.bottom) list.scrollTop += rowBounds.bottom - listBounds.bottom;
    scrollToIdRef.current = null;
  }, [parasiticforms, selectedId]);

  const createNewParasiticforms = async () => {
    if (isLoading || error || pendingSettings > 0 || operationRef.current) return;
    operationRef.current = true;
    setOperation('create');
    setOperationError('');
    let created = false;
    const description = `Nuevo (${parasiticforms.length + 1})`;
    try {
      const response = await createParasiticforms({ description });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo crear la forma parasitaria.');
      }
      created = true;
      const rows = readParasiticforms(await getParasiticformsLists());
      const createdId = response?.data?.id ?? response?.parasiticform?.id ?? response?.id;
      const newParasiticforms = rows.find((item) => createdId != null && String(item.id) === String(createdId))
        ?? rows.find((item) => item.description === description
          && !parasiticforms.some((previous) => String(previous.id) === String(item.id)));
      setParasiticforms(rows);
      if (newParasiticforms) {
        scrollToIdRef.current = newParasiticforms.id;
        setSelectedId(newParasiticforms.id);
        setNewParasiticformsId(newParasiticforms.id);
      } else {
        setOperationError('La forma parasitaria fue creada, pero no aparece en la lista actualizada.');
      }
    } catch {
      setOperationError(created
        ? 'La forma parasitaria fue creada, pero no se pudo actualizar la lista. Vuelve a abrir la pantalla.'
        : 'No fue posible crear la forma parasitaria. Vuelve a intentarlo.');
    } finally {
      operationRef.current = false;
      setOperation(null);
    }
  };

  const cancelParasiticforms = async () => {
    if (!canCancel || pendingSettings > 0 || operationRef.current) return;
    operationRef.current = true;
    setOperation('delete');
    setOperationError('');
    const id = selectedParasiticforms.id;
    try {
      const response = await deleteParasiticforms(id);
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo eliminar la forma parasitaria.');
      }
      setParasiticforms((current) => current.filter((item) => String(item.id) !== String(id)));
      setSelectedId(null);
      setNewParasiticformsId(null);
    } catch {
      setOperationError('No fue posible eliminar la forma parasitaria. Vuelve a intentarlo.');
    } finally {
      operationRef.current = false;
      setOperation(null);
    }
  };

  return (
    <div className="dashboard-content setting-exams-page list-parasiticforms-page">
      <div className="routines-exams-header">
        <h1>Lista de forma parasitaria</h1>
        <button type="button" className="btn btn-primary" onClick={createNewParasiticforms}
          disabled={isLoading || Boolean(error) || pendingSettings > 0 || operation !== null}>
          {operation === 'create' ? 'Creando...' : 'Nuevo Germen'}
        </button>
      </div>
      {operationError && <p className="text-danger" role="alert">{operationError}</p>}
      <div className="setting-exams-columns list-parasiticforms-columns">
        <section className="routines-exams-column" aria-labelledby="parasiticforms-title">
          <h2 id="parasiticforms-title">Formas parasitarias registradas</h2>
          {isLoading && <p className="setting-exams-status" role="status">Cargando...</p>}
          {error && <p className="text-danger" role="alert">{error}</p>}
          {!isLoading && !error && parasiticforms.length === 0 && <p>No hay formas parasitarias registradas.</p>}
          <ul ref={listRef} className="setting-exams-group-list scrollbar-thin">
            {parasiticforms.map((parasiticform) => {
              const selected = String(parasiticform.id) === String(selectedId);
              return (
                <li key={parasiticform.id} data-id={parasiticform.id} className={selected ? 'is-selected' : ''}>
                  <button type="button" className="routines-exams-settings-button"
                    aria-label={`Configurar ${parasiticform.description}`} aria-pressed={selected}
                    aria-controls="parasiticforms-settings-body"
                    disabled={pendingSettings > 0 || operation !== null}
                    onClick={() => {
                      setSelectedId(parasiticform.id);
                      setNewParasiticformsId(null);
                    }}>
                    <span className="ico ico-cog text-warning" aria-hidden="true" />
                  </button>
                  {Number(parasiticform.annulled) === 1 ? (
                    <span className={`ico ico-eye-off ${selected ? 'setting-exams-group-description' : 'text-warning'}`} role="img" aria-label="Inactivo" />
                  ) : (
                    <span className={`ico ico-eye4 ${selected ? 'setting-exams-group-description' : 'text-primary'}`} role="img" aria-label="Activo" />
                  )}
                  <span className="setting-exams-group-description">{parasiticform.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="routines-exams-column" aria-labelledby="parasiticforms-settings-title">
          <h2 id="parasiticforms-settings-title" className="d-flex align-items-center gap-2">
            <span className="ico ico-cog text-warning" aria-hidden="true" />
            Configuración
          </h2>
          <div id="parasiticforms-settings-body" className="card routines-exams-settings-body scrollbar-thin">
            <div className="card-body p-0">
              {selectedParasiticforms && <ParasiticformsSettings key={selectedParasiticforms.id} parasiticform={selectedParasiticforms}
                onSaved={handleSaved} onPending={handlePending} disabled={operation !== null} />}
              {canCancel && (
                <div className="d-flex justify-content-end mt-3">
                  <button type="button" className="btn btn-warning" onClick={cancelParasiticforms}
                    disabled={pendingSettings > 0 || operation !== null}>
                    {operation === 'delete' ? 'Eliminando...' : 'Cancelar'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default ListParasiticforms;


