import { useEffect, useRef, useState } from 'react';
import { createGerm, deleteGerm, getListGermsOrder, updateGerm } from '../services/germsService';
import '../styles/RoutinesExams.css';
import '../styles/ListGerms.css';

const readGerms = (response) => {
  const rows = Array.isArray(response) ? response
    : response?.germs ?? response?.listGerms ?? response?.data;
  if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
    throw new Error('No se pudieron cargar los gérmenes.');
  }
  return rows;
};

function GermSettings({ germ, onSaved, onPending, disabled }) {
  const [draft, setDraft] = useState({
    germen: germ.germen ?? '',
    annulled: Number(germ.annulled) === 1,
  });
  const [pending, setPending] = useState(0);
  const [saveErrors, setSaveErrors] = useState({});
  const queueRef = useRef(Promise.resolve());

  const changeField = (field, value) => {
    if (field === 'germen') {
      value = value.toLowerCase().slice(0, 50);
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setDraft((current) => ({ ...current, [field]: value }));
    const changes = { [field]: field === 'annulled' ? Number(value) : value };
    setPending((current) => current + 1);
    onPending(1);
    queueRef.current = queueRef.current.then(async () => {
      try {
        const { data: response } = await updateGerm(germ.id, changes);
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar el cambio.');
        }
        await onSaved(germ.id, changes);
        setSaveErrors((current) => ({ ...current, [field]: '' }));
      } catch {
        const label = { germen: 'Descripción', annulled: 'Ocultar' }[field];
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
        <label className="form-label" htmlFor="germ-description">Descripción</label>
        <input id="germ-description" className="form-control" type="text" maxLength={50}
          value={draft.germen}
          onChange={(event) => changeField('germen', event.target.value)} />
      </div>
      <div className="form-check form-switch">
        <input id="germ-annulled" className="form-check-input" type="checkbox" role="switch"
          checked={draft.annulled}
          onChange={(event) => changeField('annulled', event.target.checked)} />
        <label className="form-check-label" htmlFor="germ-annulled">Ocultar</label>
      </div>
      {pending > 0 && <p className="small mt-3" role="status">Guardando cambios...</p>}
      {Object.entries(saveErrors).map(([field, message]) => message && (
        <p key={field} className="small text-danger mt-3" role="alert">{message}</p>
      ))}
    </fieldset>
  );
}

function ListGerms() {
  const [germs, setGerms] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [newGermId, setNewGermId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingSettings, setPendingSettings] = useState(0);
  const [operation, setOperation] = useState(null);
  const [operationError, setOperationError] = useState('');
  const operationRef = useRef(false);
  const listRef = useRef(null);
  const scrollToIdRef = useRef(null);

  const handleSaved = async (id, changes) => {
    setGerms((current) => current.map((germ) => (
      String(germ.id) === String(id) ? { ...germ, ...changes } : germ
    )));
    if ('germen' in changes) {
      setOperationError('');
      try {
        const rows = readGerms((await getListGermsOrder()).data);
        if (!rows.some((germ) => String(germ.id) === String(id))) {
          throw new Error('El germen no aparece en la lista actualizada.');
        }
        scrollToIdRef.current = id;
        setGerms(rows);
        setSelectedId(id);
      } catch {
        setOperationError('La descripción se guardó, pero no fue posible actualizar la lista.');
      }
    }
  };

  const handlePending = (delta) => setPendingSettings((current) => current + delta);

  useEffect(() => {
    let active = true;
    const loadGerms = async () => {
      try {
        const rows = readGerms((await getListGermsOrder()).data);
        if (active) setGerms(rows);
      } catch {
        if (active) setError('No fue posible cargar los gérmenes.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadGerms();
    return () => { active = false; };
  }, []);

  const selectedGerm = germs.find((germ) => String(germ.id) === String(selectedId));
  const canCancel = selectedGerm && newGermId != null
    && String(selectedGerm.id) === String(newGermId);

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
  }, [germs, selectedId]);

  const createNewGerm = async () => {
    if (isLoading || error || pendingSettings > 0 || operationRef.current) return;
    operationRef.current = true;
    setOperation('create');
    setOperationError('');
    let created = false;
    const germen = `Nuevo (${germs.length + 1})`;
    try {
      const { data: response } = await createGerm({ germen });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo crear el germen.');
      }
      created = true;
      const rows = readGerms((await getListGermsOrder()).data);
      const createdId = response?.data?.id ?? response?.germ?.id ?? response?.id;
      const newGerm = rows.find((item) => createdId != null && String(item.id) === String(createdId))
        ?? rows.find((item) => item.germen === germen
          && !germs.some((previous) => String(previous.id) === String(item.id)));
      setGerms(rows);
      if (newGerm) {
        scrollToIdRef.current = newGerm.id;
        setSelectedId(newGerm.id);
        setNewGermId(newGerm.id);
      } else {
        setOperationError('El germen fue creado, pero no aparece en la lista actualizada.');
      }
    } catch {
      setOperationError(created
        ? 'El germen fue creado, pero no se pudo actualizar la lista. Vuelve a abrir la pantalla.'
        : 'No fue posible crear el germen. Vuelve a intentarlo.');
    } finally {
      operationRef.current = false;
      setOperation(null);
    }
  };

  const cancelGerm = async () => {
    if (!canCancel || pendingSettings > 0 || operationRef.current) return;
    operationRef.current = true;
    setOperation('delete');
    setOperationError('');
    const id = selectedGerm.id;
    try {
      const { data: response } = await deleteGerm(id);
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo eliminar el germen.');
      }
      setGerms((current) => current.filter((item) => String(item.id) !== String(id)));
      setSelectedId(null);
      setNewGermId(null);
    } catch {
      setOperationError('No fue posible eliminar el germen. Vuelve a intentarlo.');
    } finally {
      operationRef.current = false;
      setOperation(null);
    }
  };

  return (
    <div className="dashboard-content setting-exams-page list-germs-page">
      <div className="routines-exams-header">
        <h1>Lista de gérmenes</h1>
        <button type="button" className="btn btn-primary" onClick={createNewGerm}
          disabled={isLoading || Boolean(error) || pendingSettings > 0 || operation !== null}>
          {operation === 'create' ? 'Creando...' : 'Nuevo Germen'}
        </button>
      </div>
      {operationError && <p className="text-danger" role="alert">{operationError}</p>}
      <div className="setting-exams-columns list-germs-columns">
        <section className="routines-exams-column" aria-labelledby="germs-title">
          <h2 id="germs-title">Gérmenes registrados</h2>
          {isLoading && <p className="setting-exams-status" role="status">Cargando...</p>}
          {error && <p className="text-danger" role="alert">{error}</p>}
          {!isLoading && !error && germs.length === 0 && <p>No hay gérmenes registrados.</p>}
          <ul ref={listRef} className="setting-exams-group-list scrollbar-thin">
            {germs.map((germ) => {
              const selected = String(germ.id) === String(selectedId);
              return (
                <li key={germ.id} data-id={germ.id} className={selected ? 'is-selected' : ''}>
                  <button type="button" className="routines-exams-settings-button"
                    aria-label={`Configurar ${germ.germen}`} aria-pressed={selected}
                    aria-controls="germs-settings-body"
                    disabled={pendingSettings > 0 || operation !== null}
                    onClick={() => {
                      setSelectedId(germ.id);
                      setNewGermId(null);
                    }}>
                    <span className="ico ico-cog text-warning" aria-hidden="true" />
                  </button>
                  {Number(germ.annulled) === 1 ? (
                    <span className={`ico ico-eye-off ${selected ? 'setting-exams-group-description' : 'text-warning'}`} role="img" aria-label="Inactivo" />
                  ) : (
                    <span className={`ico ico-eye4 ${selected ? 'setting-exams-group-description' : 'text-primary'}`} role="img" aria-label="Activo" />
                  )}
                  <span className="setting-exams-group-description">{germ.germen}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <aside className="routines-exams-column" aria-labelledby="germs-settings-title">
          <h2 id="germs-settings-title" className="d-flex align-items-center gap-2">
            <span className="ico ico-cog text-warning" aria-hidden="true" />
            Configuración
          </h2>
          <div id="germs-settings-body" className="card routines-exams-settings-body scrollbar-thin">
            <div className="card-body p-0">
              {selectedGerm && <GermSettings key={selectedGerm.id} germ={selectedGerm}
                onSaved={handleSaved} onPending={handlePending} disabled={operation !== null} />}
              {canCancel && (
                <div className="d-flex justify-content-end mt-3">
                  <button type="button" className="btn btn-warning" onClick={cancelGerm}
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

export default ListGerms;

