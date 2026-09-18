import { useEffect, useRef, useState } from 'react';
import { getExamgroupsAll, updateExamgroup, updateExamList } from '../services/examsService';
import '../styles/OrderExams.css';

const sortExamsByPosition = (exams) => {
  const position = (exam) => {
    const value = Number(exam.position);
    return Number.isFinite(value) && value > 0 ? value : Infinity;
  };
  return [...exams].sort((first, second) => position(first) - position(second));
};

const readGroups = (response) => {
  const data = Array.isArray(response) ? response : response?.examGroups ?? response?.data;
  if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(data)) {
    throw new Error('No se pudieron cargar los grupos.');
  }
  return data.map((group) => ({
    ...group,
    examlists: Array.isArray(group.examlists) ? sortExamsByPosition(group.examlists) : [],
  }));
};

function GroupSettings({ group, onSaved, disabled }) {
  const [draft, setDraft] = useState({
    description: group.description ?? '',
    annulled: Number(group.annulled) === 1,
    its_exam: Number(group.its_exam) === 1,
  });
  const [pending, setPending] = useState(0);
  const [saveError, setSaveError] = useState('');
  const queueRef = useRef(Promise.resolve());
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  const changeField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (field === 'description' && !value.trim()) {
      setSaveError('La descripción no puede quedar en blanco.');
      return;
    }
    setSaveError('');
    setPending((current) => current + 1);
    const changes = { [field]: field === 'description' ? value : Number(value) };
    queueRef.current = queueRef.current.then(async () => {
      try {
        const response = await updateExamgroup(group.id, changes);
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar el grupo.');
        }
        onSaved(group.id, changes);
      } catch {
        if (activeRef.current) setSaveError('No fue posible guardar el cambio del grupo. Vuelve a intentarlo.');
      } finally {
        if (activeRef.current) setPending((current) => current - 1);
      }
    });
  };

  return (
    <div aria-busy={pending > 0}>
      <fieldset disabled={disabled}>
        <div className="mb-4">
          <label className="form-label" htmlFor="order-group-description">Descripción</label>
          <input id="order-group-description" className="form-control" type="text"
            placeholder="Descripción" value={draft.description}
            aria-invalid={!draft.description.trim()}
            onChange={(event) => changeField('description', event.target.value)} />
        </div>
        <div className="form-check form-switch mb-4">
          <input id="order-group-annulled" className="form-check-input" type="checkbox" role="switch"
            checked={draft.annulled} onChange={(event) => changeField('annulled', event.target.checked)} />
          <label className="form-check-label" htmlFor="order-group-annulled">Grupo Inactivo</label>
        </div>
        <div className="form-check form-switch mb-3">
          <input id="order-group-its-exam" className="form-check-input" type="checkbox" role="switch"
            checked={draft.its_exam} onChange={(event) => changeField('its_exam', event.target.checked)} />
          <label className="form-check-label" htmlFor="order-group-its-exam">Es examen de laboratorio</label>
        </div>
      </fieldset>
      {pending > 0 && <p className="small mb-0" role="status">Guardando cambios...</p>}
      {saveError && <p className="small text-danger mb-0" role="alert">{saveError}</p>}
    </div>
  );
}

function ExamSettings({ exam, groupId, groups, onSaved, onPending, disabled }) {
  const [draft, setDraft] = useState({
    description: exam.description ?? '',
    abbreviation: exam.abbreviation ?? '',
    annulled: Number(exam.annulled) === 1,
    group_id: String(groupId),
  });
  const [pending, setPending] = useState(0);
  const [saveError, setSaveError] = useState('');
  const queueRef = useRef(Promise.resolve());
  const activeRef = useRef(true);
  const savedGroupIdRef = useRef(String(groupId));

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  const changeField = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    if (field === 'description' && !value.trim()) {
      setSaveError('La descripción no puede quedar en blanco.');
      return;
    }
    setSaveError('');
    setPending((current) => current + 1);
    onPending(1);
    const changes = { [field]: ['annulled', 'group_id'].includes(field) ? Number(value) : value };
    queueRef.current = queueRef.current.then(async () => {
      try {
        const response = await updateExamList(exam.id, changes);
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar el examen.');
        }
        onSaved(exam.id, changes);
        if (field === 'group_id') savedGroupIdRef.current = String(value);
      } catch {
        if (activeRef.current) {
          setSaveError('No fue posible guardar el cambio del examen. Vuelve a intentarlo.');
          if (field === 'group_id') setDraft((current) => ({ ...current, group_id: savedGroupIdRef.current }));
        }
      } finally {
        onPending(-1);
        if (activeRef.current) setPending((current) => current - 1);
      }
    });
  };

  return (
    <div aria-busy={pending > 0}>
      <fieldset disabled={disabled}>
        <div className="mb-4">
          <label className="form-label" htmlFor="order-exam-description">Descripción</label>
          <input id="order-exam-description" className="form-control" type="text"
            value={draft.description} aria-invalid={!draft.description.trim()}
            onChange={(event) => changeField('description', event.target.value)} />
        </div>
        <div className="mb-4">
          <label className="form-label" htmlFor="order-exam-abbreviation">Abreviatura</label>
          <input id="order-exam-abbreviation" className="form-control" type="text"
            value={draft.abbreviation} onChange={(event) => changeField('abbreviation', event.target.value)} />
        </div>
        <div className="form-check form-switch mb-4">
          <input id="order-exam-annulled" className="form-check-input" type="checkbox" role="switch"
            checked={draft.annulled} onChange={(event) => changeField('annulled', event.target.checked)} />
          <label className="form-check-label" htmlFor="order-exam-annulled">Examen oculto</label>
        </div>
        <div className="mb-3">
          <label className="form-label" htmlFor="order-exam-group">Cambiar de grupo</label>
          <select id="order-exam-group" className="form-select" value={draft.group_id} disabled={pending > 0}
            onChange={(event) => changeField('group_id', event.target.value)}>
            {groups.map((group) => <option key={group.id} value={String(group.id)}>{group.description}</option>)}
          </select>
        </div>
      </fieldset>
      {pending > 0 && <p className="small mb-0" role="status">Guardando cambios...</p>}
      {saveError && <p className="small text-danger mb-0" role="alert">{saveError}</p>}
    </div>
  );
}

export default function OrderExams() {
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const draggedIndexRef = useRef(null);
  const savingOrderRef = useRef(false);
  const [examSaveError, setExamSaveError] = useState('');
  const [isSavingExamOrder, setIsSavingExamOrder] = useState(false);
  const [draggedExamIndex, setDraggedExamIndex] = useState(null);
  const [dragOverExamIndex, setDragOverExamIndex] = useState(null);
  const draggedExamRef = useRef(null);
  const [settingsGroupId, setSettingsGroupId] = useState(null);
  const [settingsExamId, setSettingsExamId] = useState(null);
  const [pendingExamChanges, setPendingExamChanges] = useState(0);
  const pendingExamChangesRef = useRef(0);

  const selectGroup = (id) => {
    setSelectedGroupId(id);
    setSettingsGroupId(null);
    setSettingsExamId(null);
  };

  useEffect(() => {
    draggedExamRef.current = null;
    setDraggedExamIndex(null);
    setDragOverExamIndex(null);
    setExamSaveError('');
  }, [selectedGroupId]);

  useEffect(() => {
    let active = true;
    const loadGroups = async () => {
      try {
        const response = await getExamgroupsAll();
        const data = readGroups(response);
        if (active) setGroups(data);
      } catch {
        if (active) setError('No fue posible cargar los grupos de exámenes.');
      } finally {
        if (active) setIsLoading(false);
      }
    };
    loadGroups();
    return () => { active = false; };
  }, []);

  const selectedGroup = groups.find((group) => String(group.id) === String(selectedGroupId));
  const exams = Array.isArray(selectedGroup?.examlists) ? selectedGroup.examlists : [];
  const settingsGroup = groups.find((group) => String(group.id) === String(settingsGroupId));
  const settingsExamGroup = groups.find((group) => group.examlists?.some((exam) => String(exam.id) === String(settingsExamId)));
  const settingsExam = settingsExamGroup?.examlists.find((exam) => String(exam.id) === String(settingsExamId));
  const handleExamPending = (delta) => {
    pendingExamChangesRef.current += delta;
    setPendingExamChanges(pendingExamChangesRef.current);
  };
  const handleExamSaved = (id, changes) => {
    if (Object.hasOwn(changes, 'group_id')) {
      setSettingsExamId((current) => String(current) === String(id) ? null : current);
    }
    setGroups((current) => {
      const sourceGroup = current.find((group) => group.examlists?.some((exam) => String(exam.id) === String(id)));
      const savedExam = sourceGroup?.examlists.find((exam) => String(exam.id) === String(id));
      if (!savedExam) return current;
      const targetId = changes.group_id ?? sourceGroup.id;
      const updatedExam = { ...savedExam, ...changes };
      return current.map((group) => {
        const rows = group.examlists ?? [];
        if (String(group.id) === String(sourceGroup.id) && String(targetId) === String(sourceGroup.id)) {
          return { ...group, examlists: rows.map((exam) => String(exam.id) === String(id) ? updatedExam : exam) };
        }
        if (String(group.id) === String(sourceGroup.id)) {
          return { ...group, examlists: rows.filter((exam) => String(exam.id) !== String(id)) };
        }
        if (String(group.id) === String(targetId)) {
          return { ...group, examlists: sortExamsByPosition([...rows, updatedExam]) };
        }
        return group;
      });
    });
  };
  const handleGroupSaved = (id, changes) => {
    setGroups((current) => current.map((group) => (
      String(group.id) === String(id) ? { ...group, ...changes } : group
    )));
  };

  const resetDragState = () => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragStart = (event, index) => {
    if (savingOrderRef.current || pendingExamChangesRef.current > 0) {
      event.preventDefault();
      return;
    }
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    setSaveError('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
    const row = event.currentTarget.closest('li');
    event.dataTransfer.setDragImage(row, 20, row.offsetHeight / 2);
  };

  const handleDrop = async (event, targetIndex) => {
    event.preventDefault();
    const sourceIndex = draggedIndexRef.current;
    resetDragState();
    if (savingOrderRef.current || pendingExamChangesRef.current > 0 || sourceIndex === null || sourceIndex === targetIndex) return;

    const previousGroups = groups;
    const reorderedGroups = [...groups];
    const [movedGroup] = reorderedGroups.splice(sourceIndex, 1);
    reorderedGroups.splice(targetIndex, 0, movedGroup);
    savingOrderRef.current = true;
    setIsSavingOrder(true);
    setGroups(reorderedGroups);
    try {
      const results = await Promise.allSettled(reorderedGroups.map(async (group, index) => {
        const response = await updateExamgroup(group.id, { position: index + 1 });
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar la posición del grupo.');
        }
      }));
      if (results.some((result) => result.status === 'rejected')) {
        throw new Error('No se pudo guardar el orden.');
      }
    } catch {
      setGroups((current) => previousGroups.map((previous) => (
        current.find((group) => String(group.id) === String(previous.id)) ?? previous
      )));
      setSaveError('No fue posible guardar el nuevo orden de los grupos de exámenes.');
    } finally {
      savingOrderRef.current = false;
      setIsSavingOrder(false);
    }
  };

  const resetExamDragState = () => {
    draggedExamRef.current = null;
    setDraggedExamIndex(null);
    setDragOverExamIndex(null);
  };

  const handleExamDragStart = (event, index) => {
    if (savingOrderRef.current || pendingExamChangesRef.current > 0) {
      event.preventDefault();
      return;
    }
    draggedExamRef.current = { index, groupId: selectedGroup.id };
    setDraggedExamIndex(index);
    setExamSaveError('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(exams[index].id));
    const row = event.currentTarget.closest('li');
    event.dataTransfer.setDragImage(row, 20, row.offsetHeight / 2);
  };

  const handleExamDrop = async (event, targetIndex) => {
    event.preventDefault();
    const source = draggedExamRef.current;
    resetExamDragState();
    if (savingOrderRef.current || pendingExamChangesRef.current > 0 || !source || source.groupId !== selectedGroup?.id || source.index === targetIndex) return;

    const groupId = source.groupId;
    const previousExams = exams;
    const reorderedExams = [...exams];
    const [movedExam] = reorderedExams.splice(source.index, 1);
    reorderedExams.splice(targetIndex, 0, movedExam);
    const examsToSave = reorderedExams.map((exam, index) => ({ ...exam, position: index + 1 }));
    const replaceExams = (rows) => setGroups((current) => current.map((group) => (
      group.id === groupId ? { ...group, examlists: rows } : group
    )));
    savingOrderRef.current = true;
    setIsSavingExamOrder(true);
    replaceExams(examsToSave);
    try {
      const results = await Promise.allSettled(examsToSave.map(async (exam) => {
        const response = await updateExamList(exam.id, { position: exam.position });
        if (response?.success === false || response?.ok === false || response?.error) {
          throw new Error('No se pudo guardar la posición del examen.');
        }
      }));
      if (results.some((result) => result.status === 'rejected')) {
        throw new Error('No se pudo guardar el orden.');
      }
      const savedGroups = readGroups(await getExamgroupsAll());
      const savedExams = savedGroups.find((group) => String(group.id) === String(groupId))?.examlists;
      if (!savedExams || savedExams.length !== examsToSave.length || examsToSave.some((exam, index) => (
        String(savedExams[index]?.id) !== String(exam.id)
        || Number(savedExams[index]?.position) !== exam.position
      ))) {
        if (savedExams) replaceExams(savedExams);
        setExamSaveError('El servidor no confirmó el nuevo orden de los exámenes. Vuelve a intentarlo.');
        return;
      }
      replaceExams(savedExams);
    } catch {
      replaceExams(previousExams);
      setExamSaveError('No fue posible guardar el nuevo orden de los exámenes.');
    } finally {
      savingOrderRef.current = false;
      setIsSavingExamOrder(false);
    }
  };

  return (
    <div className="dashboard-content setting-exams-page order-exams-page">
      <h1>Ordenar exámenes</h1>
      <div className="setting-exams-columns">
        <section className="setting-exams-groups" aria-labelledby="order-exams-groups-title">
          <h2 id="order-exams-groups-title">Grupo de exámenes</h2>
          {isLoading && <p className="setting-exams-status" role="status">Cargando...</p>}
          {error && <p className="setting-exams-status text-danger" role="alert">{error}</p>}
          {saveError && <p className="setting-exams-status text-danger" role="alert">{saveError}</p>}
          {isSavingOrder && <p className="setting-exams-status" role="status">Guardando orden...</p>}
          {!isLoading && !error && groups.length === 0 && <p>No hay grupos de exámenes.</p>}
          <ul className="setting-exams-group-list scrollbar-thin" aria-busy={isSavingOrder}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragOverIndex(null);
            }}>
            {groups.map((group, index) => {
              const selected = String(selectedGroupId) === String(group.id);
              const annulled = Number(group.annulled) === 1;
              return (
                <li key={group.id} className={`${selected ? 'is-selected' : ''}${draggedIndex === index ? ' is-dragging' : ''}${dragOverIndex === index ? ' is-drag-over' : ''}`.trim()}
                  onDragOver={(event) => {
                    if (draggedIndexRef.current === null || savingOrderRef.current) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = 'move';
                    setDragOverIndex(index === draggedIndexRef.current ? null : index);
                  }}
                  onDrop={(event) => handleDrop(event, index)}
                  role="button" tabIndex={0} aria-pressed={selected}
                  onClick={() => selectGroup(group.id)}
                  onKeyDown={(event) => {
                    if (event.target !== event.currentTarget) return;
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectGroup(group.id);
                    }
                  }}>
                  <button type="button" className="order-exams-drag-handle"
                    aria-label={`Arrastrar para ordenar ${group.description}`}
                    title="Mantén presionado y arrastra para ordenar"
                    draggable={!isSavingOrder && !isSavingExamOrder && pendingExamChanges === 0} disabled={isSavingOrder || isSavingExamOrder || pendingExamChanges > 0}
                    onClick={(event) => event.stopPropagation()}
                    onDragStart={(event) => handleDragStart(event, index)}
                    onDragEnd={resetDragState}>
                    <span className="ico ico-drag-vertical order-exams-drag-icon" aria-hidden="true" />
                  </button>
                  <span className={`ico ico-group-exams setting-exams-group-icon${annulled ? ' setting-exams-group-icon-annulled text-warning' : ''}`} aria-hidden="true" />
                  <button type="button" className="order-exams-group-settings-button"
                    aria-label={`Configurar ${group.description}`}
                    aria-pressed={String(settingsGroupId) === String(group.id)}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedGroupId(group.id);
                      setSettingsGroupId(group.id);
                      setSettingsExamId(null);
                    }}>
                    <span className="ico ico-cog text-warning" aria-hidden="true" />
                  </button>
                  <span className={`setting-exams-group-description${annulled ? ' text-warning' : ''}`}>{group.description}</span>
                  {Number(group.its_exam) === 1 && <span className="ico ico-jeringa setting-exams-its-exam-icon" aria-label="Es examen" />}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="setting-exams-detail" aria-label="Exámenes del grupo seleccionado">
          {selectedGroup ? <>
            <h2>Exámenes grupo {selectedGroup.description}</h2>
            {examSaveError && <p className="setting-exams-status text-danger" role="alert">{examSaveError}</p>}
            {isSavingExamOrder && <p className="setting-exams-status" role="status">Guardando orden...</p>}
            <div className="card overflow-auto scrollbar-thin">
              <ul className="list-group list-group-flush order-exams-list" aria-busy={isSavingExamOrder}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setDragOverExamIndex(null);
                }}>
                {exams.map((exam, index) => (
                  <li className={`list-group-item d-flex align-items-center gap-3${draggedExamIndex === index ? ' is-dragging' : ''}${dragOverExamIndex === index ? ' is-drag-over' : ''}`} key={exam.id}
                    tabIndex={0}
                    onDragOver={(event) => {
                      if (!draggedExamRef.current || draggedExamRef.current.groupId !== selectedGroup.id || savingOrderRef.current) return;
                      event.preventDefault();
                      event.dataTransfer.dropEffect = 'move';
                      setDragOverExamIndex(index === draggedExamRef.current.index ? null : index);
                    }}
                    onDrop={(event) => handleExamDrop(event, index)}>
                    <button type="button" className="order-exams-drag-handle"
                      aria-label={`Arrastrar para ordenar ${exam.description}`}
                      title="Mantén presionado y arrastra para ordenar"
                      draggable={!isSavingOrder && !isSavingExamOrder && pendingExamChanges === 0} disabled={isSavingOrder || isSavingExamOrder || pendingExamChanges > 0}
                      onClick={(event) => event.stopPropagation()}
                      onDragStart={(event) => handleExamDragStart(event, index)}
                      onDragEnd={resetExamDragState}>
                      <span className="ico ico-drag-vertical order-exams-drag-icon" aria-hidden="true" />
                    </button>
                    <span className="ico ico-jeringa text-primary" aria-hidden="true" />
                    <button type="button" className="order-exams-group-settings-button"
                      aria-label={`Configurar ${exam.description}`}
                      aria-pressed={String(settingsExamId) === String(exam.id)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSettingsGroupId(null);
                        setSettingsExamId(exam.id);
                      }}>
                      <span className="ico ico-cog text-warning" aria-hidden="true" />
                    </button>
                    <span className="flex-grow-1">{exam.description}</span>
                    <span className={`ico ${Number(exam.annulled) === 1 ? 'ico-eye-off text-warning' : 'ico-eye4 text-primary'}`}
                      role="img" aria-label={Number(exam.annulled) === 1 ? 'Inactivo' : 'Activo'} />
                  </li>
                ))}
              </ul>
              {exams.length === 0 && <p className="m-3">No hay exámenes en este grupo.</p>}
            </div>
          </> : <p className="setting-exams-status">Selecciona un grupo para ver sus exámenes.</p>}
        </section>
        <aside className="order-exams-settings" aria-labelledby="order-exams-settings-title">
          <h2 id="order-exams-settings-title" className="d-flex align-items-center gap-2">
            <span className="ico ico-cog text-warning" aria-hidden="true" />
            Configuración
          </h2>
          <div className="card order-exams-settings-body scrollbar-thin">
            {settingsGroup && <GroupSettings key={settingsGroup.id} group={settingsGroup}
              onSaved={handleGroupSaved} disabled={isSavingOrder} />}
            {settingsExam && <ExamSettings key={`exam-${settingsExam.id}`} exam={settingsExam}
              groupId={settingsExamGroup.id} groups={groups} onSaved={handleExamSaved}
              onPending={handleExamPending} disabled={isSavingOrder || isSavingExamOrder} />}
          </div>
        </aside>
      </div>
    </div>
  );
}
