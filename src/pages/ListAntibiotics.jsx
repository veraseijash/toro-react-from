import { useEffect, useRef, useState } from 'react';
import { createAntibiotic, deleteAntibiotic, getAntibioticLists, updateAntibiotic } from '../services/antibioticsService';
import '../styles/RoutinesExams.css';
import '../styles/ListAntibiotics.css';

const readAntibiotics = (response) => {
  const rows = Array.isArray(response) ? response
    : response?.antibiotics ?? response?.antibioticLists ?? response?.data;
  if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
    throw new Error('No se pudieron cargar los antibióticos.');
  }
  return rows;
};

function AntibioticSettings({ antibiotic, onSaved, onPending, disabled }) {
  const [draft, setDraft] = useState({
    description: antibiotic.description ?? '',
    siglas: antibiotic.siglas ?? '',
    annulled: Number(antibiotic.annulled) === 1,
  });
  const [pending, setPending] = useState(0);
  const [saveErrors, setSaveErrors] = useState({});
  const queueRef = useRef(Promise.resolve());

  const changeField = (field, value) => {
    if (field === 'description' || field === 'siglas') {
      value = value.toUpperCase().slice(0, field === 'description' ? 50 : 10);
    }
    setDraft((current) => ({ ...current, [field]: value }));
    const changes = { [field]: field === 'annulled' ? Number(value) : value };
    setPending((current) => current + 1);
    onPending(1);
    queueRef.current = queueRef.current.then(async () => {
      try {
        const response = await updateAntibiotic(antibiotic.id, changes);
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar el cambio.');
        }
        await onSaved(antibiotic.id, changes);
        setSaveErrors((current) => ({ ...current, [field]: '' }));
      } catch {
        const label = { description: 'Descripción', siglas: 'Siglas', annulled: 'Ocultar' }[field];
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
        <label className="form-label" htmlFor="antibiotic-description">Descripción</label>
        <input id="antibiotic-description" className="form-control" type="text" maxLength={50}
          value={draft.description}
          onChange={(event) => changeField('description', event.target.value)} />
      </div>
      <div className="mb-3">
        <label className="form-label" htmlFor="antibiotic-siglas">Siglas</label>
        <input id="antibiotic-siglas" className="form-control" type="text" maxLength={10}
          value={draft.siglas}
          onChange={(event) => changeField('siglas', event.target.value)} />
      </div>
      <div className="form-check form-switch">
        <input id="antibiotic-annulled" className="form-check-input" type="checkbox" role="switch"
          checked={draft.annulled}
          onChange={(event) => changeField('annulled', event.target.checked)} />
        <label className="form-check-label" htmlFor="antibiotic-annulled">Ocultar</label>
      </div>
      {pending > 0 && <p className="small mt-3" role="status">Guardando cambios...</p>}
      {Object.entries(saveErrors).map(([field, message]) => message && (
        <p key={field} className="small text-danger mt-3" role="alert">{message}</p>
      ))}
    </fieldset>
  );
}

function ListAntibiotics() {
  const [antibiotics, setAntibiotics] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newAntibioticId, setNewAntibioticId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingSettings, setPendingSettings] = useState(0);
  const [operation, setOperation] = useState(null);
  const [operationError, setOperationError] = useState('');
  const operationRef = useRef(false);
  const listRef = useRef(null);
  const scrollToIdRef = useRef(null);

  const handleSaved = async (id, changes) => {
    setAntibiotics((current) => current.map((antibiotic) => (
      String(antibiotic.id) === String(id) ? { ...antibiotic, ...changes } : antibiotic
    )));
    if ('description' in changes) {
      setOperationError('');
      try {
        const rows = readAntibiotics(await getAntibioticLists());
        if (!rows.some((antibiotic) => String(antibiotic.id) === String(id))) {
          throw new Error('El antibiótico no aparece en la lista actualizada.');
        }
        scrollToIdRef.current = id;
        setAntibiotics(rows);
        setSelectedId(id);
      } catch {
        setOperationError('La descripción se guardó, pero no fue posible actualizar la lista.');
      }
    }
  };

  const handlePending = (delta) => setPendingSettings((current) => current + delta);

  useEffect(() => {
    let active = true;
    const loadAntibiotics = async () => {
      try {
        const rows = readAntibiotics(await getAntibioticLists());
        if (active) setAntibiotics(rows);
      } catch {
        if (active) setError('No fue posible cargar los antibióticos.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadAntibiotics();
    return () => { active = false; };
  }, []);

  const selectedAntibiotic = antibiotics.find((antibiotic) => String(antibiotic.id) === String(selectedId));
  const canCancel = selectedAntibiotic && newAntibioticId != null
    && String(selectedAntibiotic.id) === String(newAntibioticId);

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
  }, [antibiotics, selectedId]);

  const createNewAntibiotic = async () => {
    if (isLoading || error || pendingSettings > 0 || operationRef.current) return;
    operationRef.current = true;
    setOperation('create');
    setOperationError('');
    let created = false;
    const description = `Nuevo (${antibiotics.length + 1})`;
    try {
      const response = await createAntibiotic({ description, siglas: ' ' });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo crear el antibiótico.');
      }
      created = true;
      const rows = readAntibiotics(await getAntibioticLists());
      const createdId = response?.data?.id ?? response?.antibiotic?.id ?? response?.id;
      const newAntibiotic = rows.find((item) => createdId != null && String(item.id) === String(createdId))
        ?? rows.find((item) => item.description === description
          && !antibiotics.some((previous) => String(previous.id) === String(item.id)));
      setAntibiotics(rows);
      if (newAntibiotic) {
        scrollToIdRef.current = newAntibiotic.id;
        setSelectedId(newAntibiotic.id);
        setNewAntibioticId(newAntibiotic.id);
      } else {
        setOperationError('El antibiótico fue creado, pero no aparece en la lista actualizada.');
      }
    } catch {
      setOperationError(created
        ? 'El antibiótico fue creado, pero no se pudo actualizar la lista. Vuelve a abrir la pantalla.'
        : 'No fue posible crear el antibiótico. Vuelve a intentarlo.');
    } finally {
      operationRef.current = false;
      setOperation(null);
    }
  };

  const cancelAntibiotic = async () => {
    if (!canCancel || pendingSettings > 0 || operationRef.current) return;
    operationRef.current = true;
    setOperation('delete');
    setOperationError('');
    const id = selectedAntibiotic.id;
    try {
      const response = await deleteAntibiotic(id);
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo eliminar el antibiótico.');
      }
      setAntibiotics((current) => current.filter((item) => String(item.id) !== String(id)));
      setSelectedId(null);
      setNewAntibioticId(null);
    } catch {
      setOperationError('No fue posible eliminar el antibiótico. Vuelve a intentarlo.');
    } finally {
      operationRef.current = false;
      setOperation(null);
    }
  };

  return (
    <div className="dashboard-content setting-exams-page list-antibiotics-page">
      <div className="routines-exams-header">
        <h1>Lista de antibióticos</h1>
        <button type="button" className="btn btn-primary" onClick={createNewAntibiotic}
          disabled={isLoading || Boolean(error) || pendingSettings > 0 || operation !== null}>
          {operation === 'create' ? 'Creando...' : 'Nuevo antibiótico'}
        </button>
      </div>
      {operationError && <p className="text-danger" role="alert">{operationError}</p>}
      <div className="setting-exams-columns list-antibiotics-columns">
        <section className="routines-exams-column" aria-labelledby="antibiotics-title">
          <h2 id="antibiotics-title">Antibióticos registrados</h2>
          {isLoading && <p className="setting-exams-status" role="status">Cargando...</p>}
          {error && <p className="text-danger" role="alert">{error}</p>}
          {!isLoading && !error && antibiotics.length === 0 && <p>No hay antibióticos registrados.</p>}
          <ul ref={listRef} className="setting-exams-group-list scrollbar-thin">
            {antibiotics.map((antibiotic) => {
              const selected = String(antibiotic.id) === String(selectedId);
              return (
                <li key={antibiotic.id} data-id={antibiotic.id} className={selected ? 'is-selected' : ''}>
                  <button type="button" className="routines-exams-settings-button"
                    aria-label={`Configurar ${antibiotic.description}`} aria-pressed={selected}
                    aria-controls="antibiotics-settings-body"
                    disabled={pendingSettings > 0 || operation !== null}
                    onClick={() => {
                      setSelectedId(antibiotic.id);
                      setNewAntibioticId(null);
                    }}>
                    <span className="ico ico-cog text-warning" aria-hidden="true" />
                  </button>
                  {Number(antibiotic.annulled) === 1 ? (
                    <span className={`ico ico-eye-off ${selected ? 'setting-exams-group-description' : 'text-warning'}`} role="img" aria-label="Inactivo" />
                  ) : (
                    <span className={`ico ico-eye4 ${selected ? 'setting-exams-group-description' : 'text-primary'}`} role="img" aria-label="Activo" />
                  )}
                  <span className="setting-exams-group-description">{antibiotic.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="routines-exams-column" aria-labelledby="antibiotics-settings-title">
          <h2 id="antibiotics-settings-title" className="d-flex align-items-center gap-2">
            <span className="ico ico-cog text-warning" aria-hidden="true" />
            Configuración
          </h2>
          <div id="antibiotics-settings-body" className="card routines-exams-settings-body scrollbar-thin">
            <div className="card-body p-0">
              {selectedAntibiotic && <AntibioticSettings key={selectedAntibiotic.id} antibiotic={selectedAntibiotic}
                onSaved={handleSaved} onPending={handlePending} disabled={operation !== null} />}
              {canCancel && (
                <div className="d-flex justify-content-end mt-3">
                  <button type="button" className="btn btn-warning" onClick={cancelAntibiotic}
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

export default ListAntibiotics;
