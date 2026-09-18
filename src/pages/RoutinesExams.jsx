import { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'bootstrap';
import { createRoutines, deleteRoutines, getRoutinesList, updateRoutines } from '../services/routinesService';
import { getExamgroupsAll } from '../services/examsService';
import '../styles/RoutinesExams.css';

function AddExamButton({ exam, title, disabled, expanded, onClick }) {
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!expanded) return undefined;
    const tooltip = new Tooltip(triggerRef.current, {
      title, placement: 'left', container: 'body', animation: false,
    });
    return () => tooltip.dispose();
  }, [title, disabled, expanded]);

  return (
    <span ref={triggerRef} className="routines-laboratory-add-tooltip"
      tabIndex={disabled ? 0 : undefined} aria-label={disabled ? title : undefined}>
      <button type="button" className="routines-laboratory-add-button text-primary"
        aria-label={`Agregar ${exam.description} a la rutina`} disabled={disabled}
        onClick={() => {
          Tooltip.getInstance(triggerRef.current)?.hide();
          onClick();
        }}>
        <span className="ico ico-arrow-left-circle" aria-hidden="true" />
      </button>
    </span>
  );
}

const readRegisteredExams = (value) => {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const rows = JSON.parse(value);
      return Array.isArray(rows) ? rows : [];
    } catch {
      return [];
    }
  }
  return [];
};

const readRoutines = (response) => {
  const rows = Array.isArray(response) ? response : response?.routines ?? response?.data;
  if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
    throw new Error('No se pudieron cargar las rutinas.');
  }
  return rows;
};

function RoutineSettings({ routine, onSaved, onDeleted, onPending, disabled }) {
  const [draft, setDraft] = useState({ description: routine.description ?? '', details: routine.details ?? '' });
  const [pending, setPending] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const queueRef = useRef(Promise.resolve());
  const activeRef = useRef(true);
  const deletingRef = useRef(false);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  const changeField = (field, value) => {
    if (deletingRef.current) return;
    setDraft((current) => ({ ...current, [field]: value }));
    if (field === 'description' && !value.trim()) {
      setError('La descripción no puede quedar en blanco.');
      return;
    }
    setError('');
    setPending((current) => current + 1);
    onPending(1);
    const changes = { [field]: value };
    queueRef.current = queueRef.current.then(async () => {
      try {
        const response = await updateRoutines(routine.id, changes);
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar la rutina.');
        }
        onSaved(routine.id, changes);
      } catch {
        if (activeRef.current) setError('No fue posible guardar el cambio. Vuelve a intentarlo.');
      } finally {
        onPending(-1);
        if (activeRef.current) setPending((current) => current - 1);
      }
    });
  };

  const removeRoutine = async () => {
    if (disabled || pending > 0 || deletingRef.current) return;
    deletingRef.current = true;
    setIsDeleting(true);
    setError('');
    onPending(1);
    try {
      const response = await deleteRoutines(routine.id);
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo eliminar la rutina.');
      }
      onDeleted(routine.id);
    } catch {
      if (activeRef.current) setError('No fue posible eliminar la rutina. Vuelve a intentarlo.');
    } finally {
      onPending(-1);
      deletingRef.current = false;
      if (activeRef.current) setIsDeleting(false);
    }
  };

  return (
    <div className="d-flex flex-column h-100" aria-busy={pending > 0 || isDeleting}>
      <h3 className="fs-6 mb-3">Grupo</h3>
      <fieldset disabled={disabled || isDeleting}>
        <div className="mb-3">
          <label className="form-label" htmlFor="routine-description">Descripción</label>
          <input id="routine-description" className="form-control" type="text" maxLength={50}
            value={draft.description} aria-invalid={!draft.description.trim()}
            onChange={(event) => changeField('description', event.target.value)} />
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="routine-details">Detalle</label>
          <textarea id="routine-details" className="form-control" rows={4} maxLength={200}
            value={draft.details} aria-describedby="routine-details-count"
            onChange={(event) => changeField('details', event.target.value)} />
          <div id="routine-details-count" className="small text-end mt-1">{draft.details.length} / 200</div>
        </div>
      </fieldset>
      {pending > 0 && <p className="small" role="status">Guardando cambios...</p>}
      {error && <p className="small text-danger" role="alert">{error}</p>}
      <div className="d-flex justify-content-end pt-3">
        <button type="button" className="btn btn-warning" disabled={disabled || pending > 0 || isDeleting}
          onClick={removeRoutine}>{isDeleting ? 'Eliminando...' : 'Eliminar'}</button>
      </div>
    </div>
  );
}

export default function RoutinesExams() {
  const [routines, setRoutines] = useState([]);
  const [selectedRoutineId, setSelectedRoutineId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [examGroups, setExamGroups] = useState([]);
  const [isLoadingGroups, setIsLoadingGroups] = useState(true);
  const [groupsError, setGroupsError] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [isSavingExams, setIsSavingExams] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const savingExamsRef = useRef(false);
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);
  const [createError, setCreateError] = useState('');
  const creatingRoutineRef = useRef(false);
  const [settingsRoutineId, setSettingsRoutineId] = useState(null);
  const [settingsExam, setSettingsExam] = useState(null);
  const [pendingSettings, setPendingSettings] = useState(0);
  const pendingSettingsRef = useRef(0);
  const handleSettingsPending = (delta) => {
    pendingSettingsRef.current += delta;
    setPendingSettings(pendingSettingsRef.current);
  };
  const selectRoutine = (id) => {
    setSelectedRoutineId(id);
    setSettingsRoutineId(null);
    setSettingsExam(null);
  };
  const handleRoutineSaved = (id, changes) => {
    setRoutines((current) => current.map((routine) => (
      String(routine.id) === String(id) ? { ...routine, ...changes } : routine
    )));
  };
  const handleRoutineDeleted = (id) => {
    setRoutines((current) => current.filter((routine) => String(routine.id) !== String(id)));
    setSelectedRoutineId((current) => String(current) === String(id) ? null : current);
    setSettingsRoutineId((current) => String(current) === String(id) ? null : current);
    setSettingsExam((current) => String(current?.routineId) === String(id) ? null : current);
  };

  useEffect(() => {
    let active = true;
    const loadGroups = async () => {
      try {
        const response = await getExamgroupsAll();
        const rows = Array.isArray(response) ? response : response?.examGroups ?? response?.data;
        if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
          throw new Error('No se pudieron cargar los grupos.');
        }
        if (active) setExamGroups(rows);
      } catch {
        if (active) setGroupsError('No fue posible cargar los exámenes de laboratorio.');
      } finally {
        if (active) setIsLoadingGroups(false);
      }
    };
    loadGroups();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const loadRoutines = async () => {
      try {
        const response = await getRoutinesList();
        const rows = readRoutines(response);
        if (active) setRoutines(rows);
      } catch {
        if (active) setError('No fue posible cargar las rutinas de exámenes.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadRoutines();
    return () => { active = false; };
  }, []);

  const selectedRoutine = routines.find((routine) => String(routine.id) === String(selectedRoutineId));
  const settingsRoutine = routines.find((routine) => String(routine.id) === String(settingsRoutineId));
  const exams = readRegisteredExams(selectedRoutine?.registered_exams);
  const examSettingsRoutine = routines.find((routine) => String(routine.id) === String(settingsExam?.routineId));
  const configuredExam = readRegisteredExams(examSettingsRoutine?.registered_exams).find((exam) => (
    String(exam.examId ?? exam.id) === String(settingsExam?.examId)
  ));
  const createRoutine = async () => {
    if (isLoading || error || creatingRoutineRef.current || savingExamsRef.current || pendingSettingsRef.current > 0) return;
    creatingRoutineRef.current = true;
    setIsCreatingRoutine(true);
    setCreateError('');
    let created = false;
    const description = `Nuevo (${routines.length + 1})`;
    try {
      const response = await createRoutines({ description, registered_exams: [], details: ' ' });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo crear la rutina.');
      }
      created = true;
      const rows = readRoutines(await getRoutinesList());
      const createdId = response?.data?.id ?? response?.routine?.id ?? response?.id;
      const newRoutine = rows.find((routine) => createdId != null && String(routine.id) === String(createdId))
        ?? rows.find((routine) => routine.description === description
          && !routines.some((previous) => String(previous.id) === String(routine.id)));
      setRoutines(rows);
      setSelectedRoutineId(newRoutine?.id ?? null);
      setSettingsRoutineId(null);
      setSettingsExam(null);
      setSaveError(null);
      if (!newRoutine) setCreateError('La rutina fue creada, pero no aparece en la lista actualizada.');
    } catch {
      setCreateError(created
        ? 'La rutina fue creada, pero no fue posible actualizar la lista. Vuelve a abrir la pantalla.'
        : 'No fue posible crear la rutina. Vuelve a intentarlo.');
    } finally {
      creatingRoutineRef.current = false;
      setIsCreatingRoutine(false);
    }
  };
  const toggleGroup = (id) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const addExam = async (exam) => {
    if (!selectedRoutine || savingExamsRef.current || creatingRoutineRef.current || pendingSettingsRef.current > 0) return;
    if (exams.some((registered) => String(registered.examId ?? registered.id) === String(exam.id))) return;
    const routineId = selectedRoutine.id;
    const registeredExams = [
      ...exams.map((registered) => ({ examId: registered.examId ?? registered.id, description: registered.description })),
      { examId: exam.id, description: exam.description },
    ];
    const replaceExams = (rows) => setRoutines((current) => current.map((routine) => (
      String(routine.id) === String(routineId) ? { ...routine, registered_exams: rows } : routine
    )));
    savingExamsRef.current = true;
    setIsSavingExams(true);
    setSaveError(null);
    replaceExams(registeredExams);
    try {
      const response = await updateRoutines(routineId, { registered_exams: registeredExams });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo guardar la rutina.');
      }
    } catch {
      replaceExams(exams);
      setSaveError({ routineId, message: 'No fue posible agregar el examen a la rutina. Vuelve a intentarlo.' });
    } finally {
      savingExamsRef.current = false;
      setIsSavingExams(false);
    }
  };

  const removeExam = async () => {
    if (!configuredExam || !examSettingsRoutine || savingExamsRef.current
      || creatingRoutineRef.current || pendingSettingsRef.current > 0) return;
    const routineId = examSettingsRoutine.id;
    const examId = configuredExam.examId ?? configuredExam.id;
    const registeredExams = readRegisteredExams(examSettingsRoutine.registered_exams)
      .filter((exam) => String(exam.examId ?? exam.id) !== String(examId));
    savingExamsRef.current = true;
    setIsSavingExams(true);
    setSaveError(null);
    try {
      const response = await updateRoutines(routineId, { registered_exams: registeredExams });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo quitar el examen.');
      }
      handleRoutineSaved(routineId, { registered_exams: registeredExams });
      setSettingsExam((current) => (
        String(current?.routineId) === String(routineId) && String(current?.examId) === String(examId)
          ? null : current
      ));
    } catch {
      setSaveError({ routineId, message: 'No fue posible quitar el examen de la rutina. Vuelve a intentarlo.' });
    } finally {
      savingExamsRef.current = false;
      setIsSavingExams(false);
    }
  };

  return (
    <div className="dashboard-content setting-exams-page routines-exams-page">
      <div className="routines-exams-header">
        <h1>Rutinas de exámenes</h1>
        <button type="button" className="btn btn-primary"
          disabled={isLoading || Boolean(error) || isCreatingRoutine || isSavingExams || pendingSettings > 0}
          onClick={createRoutine}>
          {isCreatingRoutine ? 'Creando...' : 'Nueva rutina'}
        </button>
      </div>
      {createError && <p className="text-danger" role="alert">{createError}</p>}
      <div className="setting-exams-columns routines-exams-columns">
        <section className="routines-exams-column" aria-labelledby="routines-title">
          <h2 id="routines-title">Rutinas</h2>
          {isLoading && <p className="setting-exams-status" role="status">Cargando...</p>}
          {error && <p className="setting-exams-status text-danger" role="alert">{error}</p>}
          {!isLoading && !error && routines.length === 0 && <p>No hay rutinas de exámenes.</p>}
          <ul className="setting-exams-group-list scrollbar-thin">
            {routines.map((routine) => {
              const selected = String(selectedRoutineId) === String(routine.id);
              return (
                <li key={routine.id} className={selected ? 'is-selected' : ''}
                  role="button" tabIndex={0} aria-pressed={selected}
                  onClick={() => selectRoutine(routine.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectRoutine(routine.id);
                    }
                  }}>
                  <span className="ico ico-group-exams setting-exams-group-icon" aria-hidden="true" />
                  <button type="button" className="routines-exams-settings-button"
                    aria-label={`Configurar ${routine.description}`}
                    aria-pressed={String(settingsRoutineId) === String(routine.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedRoutineId(routine.id);
                      setSettingsRoutineId(routine.id);
                      setSettingsExam(null);
                    }}>
                    <span className="ico ico-cog text-warning" aria-hidden="true" />
                  </button>
                  <span className="setting-exams-group-description">{routine.description}</span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="routines-exams-column" aria-labelledby="routine-exams-title">
          <h2 id="routine-exams-title">Exámenes en la rutina</h2>
          {isSavingExams && <p className="setting-exams-status" role="status">Guardando cambios...</p>}
          {saveError && String(saveError.routineId) === String(selectedRoutineId) && (
            <p className="text-danger" role="alert">{saveError.message}</p>
          )}
          {selectedRoutine ? (
            <div className="card overflow-auto scrollbar-thin">
              <ul className="list-group list-group-flush routines-exams-list">
                {exams.map((exam) => (
                  <li className="list-group-item d-flex align-items-center gap-3" key={exam.examId ?? exam.id}>
                    <span className="ico ico-jeringa text-primary" aria-hidden="true" />
                    <button type="button" className="routines-exams-settings-button"
                      aria-label={`Configurar ${exam.description}`}
                      aria-pressed={String(settingsExam?.routineId) === String(selectedRoutine.id)
                        && String(settingsExam?.examId) === String(exam.examId ?? exam.id)}
                      onClick={() => {
                        setSettingsRoutineId(null);
                        setSettingsExam({ routineId: selectedRoutine.id, examId: exam.examId ?? exam.id });
                      }}>
                      <span className="ico ico-cog text-warning" aria-hidden="true" />
                    </button>
                    <span className="flex-grow-1">{exam.description}</span>
                  </li>
                ))}
              </ul>
              {exams.length === 0 && <p className="m-3">No hay exámenes en esta rutina.</p>}
            </div>
          ) : <p className="setting-exams-status">Selecciona una rutina para ver sus exámenes.</p>}
        </section>
        <section className="routines-exams-column" aria-labelledby="laboratory-exams-title">
          <h2 id="laboratory-exams-title">Lista exámenes de laboratorio</h2>
          {isLoadingGroups && <p className="setting-exams-status" role="status">Cargando...</p>}
          {groupsError && <p className="text-danger" role="alert">{groupsError}</p>}
          {!isLoadingGroups && !groupsError && examGroups.length === 0 && <p>No hay grupos de exámenes.</p>}
          <div className="card routines-laboratory-card">
          <ul className="routines-laboratory-groups scrollbar-thin">
            {examGroups.map((group) => {
              const expanded = expandedGroups.has(group.id);
              const groupExams = Array.isArray(group.examlists) ? group.examlists : [];
              return (
                <li key={group.id}>
                  <button type="button" className="routines-laboratory-group-button"
                    aria-expanded={expanded} aria-controls={`routine-laboratory-group-${group.id}`}
                    onClick={() => toggleGroup(group.id)}>
                    <span className="ico ico-group-exams routines-laboratory-icon" aria-hidden="true" />
                    <span className="flex-grow-1">{group.description}</span>
                    <span className={`ico ${expanded ? 'ico-chevron-up' : 'ico-chevron-down'}`} aria-hidden="true" />
                  </button>
                  <ul id={`routine-laboratory-group-${group.id}`} className="routines-laboratory-exams" hidden={!expanded}>
                    {groupExams.map((exam) => {
                      const registered = exams.some((item) => String(item.examId ?? item.id) === String(exam.id));
                      return (
                        <li className="routines-laboratory-exam" key={exam.id}>
                          <span className="ico ico-jeringa routines-laboratory-icon" aria-hidden="true" />
                          <span className="flex-grow-1">{exam.description}</span>
                          <AddExamButton exam={exam} expanded={expanded}
                            title={!selectedRoutine ? 'Selecciona una rutina' : registered ? 'El examen ya está en la rutina' : 'Agregar a la rutina'}
                            disabled={!selectedRoutine || isSavingExams || isCreatingRoutine || pendingSettings > 0 || registered}
                            onClick={() => addExam(exam)} />
                        </li>
                      );
                    })}
                    {groupExams.length === 0 && <li className="setting-exams-status p-3">No hay exámenes en este grupo.</li>}
                  </ul>
                </li>
              );
            })}
          </ul>
          </div>
        </section>
        <aside className="routines-exams-column" aria-labelledby="routines-settings-title">
          <h2 id="routines-settings-title" className="d-flex align-items-center gap-2">
            <span className="ico ico-cog text-warning" aria-hidden="true" />
            Configuración
          </h2>
          <div className="card routines-exams-settings-body scrollbar-thin">
            {settingsRoutine && <RoutineSettings key={settingsRoutine.id} routine={settingsRoutine}
              onSaved={handleRoutineSaved} onDeleted={handleRoutineDeleted} onPending={handleSettingsPending}
              disabled={isCreatingRoutine || isSavingExams} />}
            {configuredExam && <div aria-busy={isSavingExams}>
              <h3 className="fs-6 mb-4">Examen</h3>
              <p className="small mb-3">{configuredExam.description}</p>
              <div className="d-flex justify-content-end">
              <button type="button" className="btn btn-warning"
                disabled={isSavingExams || isCreatingRoutine || pendingSettings > 0} onClick={removeExam}>
                Eliminar
              </button>
              </div>
              {saveError && String(saveError.routineId) === String(examSettingsRoutine.id) && (
                <p className="small text-danger mt-3 mb-0" role="alert">{saveError.message}</p>
              )}
            </div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
