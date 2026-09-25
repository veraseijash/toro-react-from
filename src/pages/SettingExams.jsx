import { useEffect, useRef, useState } from 'react';
import { Modal, Tooltip } from 'bootstrap';
import { toast } from 'react-toastify';
import EditorExam from '../components/setting/EditorExam';
import { createExamList, updateExamList, getTaxs, createExamgroup, getExamgroup, getExamgroupsAll, updateExamgroup, updateGroupCosts } from '../services/examsService';

const PAGE_SIZE_OPTIONS = [5, 10, 15, 25];
const formatPrice = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number.toFixed(2) : '0.00';
};

function SettingExams() {
  const [examGroups, setExamGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [saveErrorMessage, setSaveErrorMessage] = useState('');
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [editingExamId, setEditingExamId] = useState(null);
  const [isUpdatingExam, setIsUpdatingExam] = useState(false);
  const updatingExamRef = useRef(false);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [priceErrors, setPriceErrors] = useState({});
  const [isSavingPrices, setIsSavingPrices] = useState(false);
  const [pricesRevision, setPricesRevision] = useState(0);
  const savingPricesRef = useRef(false);
  const draggedIndexRef = useRef(null);
  const pricesButtonRef = useRef(null);
  const pricesModalRef = useRef(null);
  const pricesModalInstanceRef = useRef(null);
  const [groupDescriptionError, setGroupDescriptionError] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [groupsRevision, setGroupsRevision] = useState(0);
  const [isHidingGroup, setIsHidingGroup] = useState(false);
  const hidingGroupRef = useRef(false);
  const newGroupButtonRef = useRef(null);
  const newGroupModalRef = useRef(null);
  const newGroupModalInstanceRef = useRef(null);
  const creatingGroupRef = useRef(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [isLoadingGroup, setIsLoadingGroup] = useState(false);
  const [groupLoadError, setGroupLoadError] = useState('');
  const [groupDraft, setGroupDraft] = useState({ description: '', its_exam: false, annulled: false });
  const groupMenuButtonRef = useRef(null);
  const groupModalTriggerRef = useRef(null);
  const examModalRef = useRef(null);
  const examModalInstanceRef = useRef(null);
  const savingExamRef = useRef(false);
  const taxRequestRef = useRef(0);
  const [newExamGroupId, setNewExamGroupId] = useState(null);
  const [taxes, setTaxes] = useState([]);
  const [isLoadingTaxes, setIsLoadingTaxes] = useState(false);
  const [taxError, setTaxError] = useState('');
  const [examFormErrors, setExamFormErrors] = useState({});
  const [isSavingExam, setIsSavingExam] = useState(false);

  useEffect(() => {
    const element = examModalRef.current;
    const modal = new Modal(element);
    examModalInstanceRef.current = modal;
    const onHide = (event) => {
      if (savingExamRef.current) event.preventDefault();
    };
    const onHidden = () => {
      taxRequestRef.current += 1;
      groupMenuButtonRef.current?.focus();
    };
    element.addEventListener('hide.bs.modal', onHide);
    element.addEventListener('hidden.bs.modal', onHidden);
    return () => {
      taxRequestRef.current += 1;
      element.removeEventListener('hide.bs.modal', onHide);
      element.removeEventListener('hidden.bs.modal', onHidden);
      modal.hide();
      modal.dispose();
      examModalInstanceRef.current = null;
    };
  }, []);

  const openNewExam = async () => {
    if (selectedGroupId == null) return;
    setIsGroupMenuOpen(false);
    setNewExamGroupId(selectedGroupId);
    examModalRef.current.querySelector('form').reset();
    setExamFormErrors({});
    setTaxes([]);
    setTaxError('');
    setIsLoadingTaxes(true);
    const request = ++taxRequestRef.current;
    examModalInstanceRef.current?.show();
    try {
      const response = await getTaxs();
      const rows = Array.isArray(response) ? response : response?.data ?? response?.taxs ?? response?.taxes;
      if (response?.success === false || response?.error || !Array.isArray(rows) || rows.length === 0) {
        throw new Error('No hay impuestos disponibles.');
      }
      if (request === taxRequestRef.current) setTaxes(rows);
    } catch {
      if (request === taxRequestRef.current) setTaxError('No fue posible cargar los tipos de impuesto. Cierra la modal y vuelve a intentarlo.');
    } finally {
      if (request === taxRequestRef.current) setIsLoadingTaxes(false);
    }
  };

  const handleCreateExam = async (event) => {
    event.preventDefault();
    if (savingExamRef.current || isLoadingTaxes || taxError || newExamGroupId == null) return;
    const form = new FormData(event.currentTarget);
    const description = String(form.get('description') ?? '').trim();
    const abbreviation = String(form.get('abbreviation') ?? '').trim();
    const errors = {};
    for (const [name, value, limit] of [['description', description, 60], ['abbreviation', abbreviation, 10]]) {
      if (!value) errors[name] = `El campo ${name === 'description' ? 'Descripción' : 'Abreviatura'} no puede quedar en blanco`;
      else if (value.length > limit) errors[name] = `No puede contener más de ${limit} caracteres.`;
    }
    const costs = {};
    for (const number of [1, 2, 3, 4, 5, 6]) {
      const value = form.get(`cost${number}`);
      if (!/^\d+$/.test(value ?? '') || !Number.isSafeInteger(Number(value))) {
        errors[`cost${number}`] = 'Ingresa un número entero mayor o igual a cero.';
      }
      costs[`cost${number}`] = Number(value);
    }
    const taxId = form.get('tax_id');
    if (!taxes.some((tax) => String(tax.id) === taxId)) errors.tax_id = 'Selecciona un tipo de impuesto.';
    setExamFormErrors(errors);
    if (Object.keys(errors).length) return;
    savingExamRef.current = true;
    setIsSavingExam(true);
    try {
      const response = await createExamList({
        group_id: Number(newExamGroupId), description, abbreviation,
        tax_id: Number(taxId),
        annulled: form.has('annulled') ? 1 : 0,
        special_test: form.has('special_test') ? 1 : 0,
        ...costs,
      });
      if (response?.success === false || response?.ok === false || response?.error) throw new Error('No se registró el examen');
      toast.success('El examen fue creado satisfactoriamente');
      savingExamRef.current = false;
      examModalInstanceRef.current?.hide();
      setPricesRevision((current) => current + 1);
    } catch {
      toast.error('Presento problemas al tratar de registrar el examen');
    } finally {
      savingExamRef.current = false;
      setIsSavingExam(false);
    }
  };

  useEffect(() => {
    if (editingGroupId == null) return undefined;
    let isActive = true;
    const loadGroup = async () => {
      try {
        const response = await getExamgroup(editingGroupId);
        if (response?.success === false || response?.error) throw new Error('No se pudo cargar el grupo.');
        const group = response?.data ?? response?.examGroup ?? response;
        if (!group || typeof group.description !== 'string') throw new Error('Grupo inválido');
        if (isActive) setGroupDraft({
          description: group.description,
          its_exam: group.its_exam === true || Number(group.its_exam) === 1,
          annulled: group.annulled === true || Number(group.annulled) === 1,
        });
      } catch {
        if (isActive) setGroupLoadError('No se pudo cargar la información del grupo.');
      } finally {
        if (isActive) setIsLoadingGroup(false);
      }
    };
    loadGroup();
    return () => { isActive = false; };
  }, [editingGroupId]);

  useEffect(() => {
    const element = newGroupModalRef.current;
    const modal = new Modal(element);
    newGroupModalInstanceRef.current = modal;
    const restoreFocus = () => {
      groupModalTriggerRef.current?.focus();
      setEditingGroupId(null);
    };
    const focusDescription = () => element.querySelector('input[name="description"]')?.focus();
    const preventCloseWhileSaving = (event) => {
      if (creatingGroupRef.current) event.preventDefault();
    };
    element.addEventListener('shown.bs.modal', focusDescription);
    element.addEventListener('hidden.bs.modal', restoreFocus);
    element.addEventListener('hide.bs.modal', preventCloseWhileSaving);
    return () => {
      element.removeEventListener('shown.bs.modal', focusDescription);
      element.removeEventListener('hidden.bs.modal', restoreFocus);
      element.removeEventListener('hide.bs.modal', preventCloseWhileSaving);
      modal.hide();
      modal.dispose();
      newGroupModalInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const modalElement = pricesModalRef.current;
    const modal = new Modal(modalElement);
    pricesModalInstanceRef.current = modal;
    const restoreFocus = () => pricesButtonRef.current?.focus();
    const preventCloseWhileSaving = (event) => {
      if (savingPricesRef.current) event.preventDefault();
    };
    modalElement.addEventListener('hidden.bs.modal', restoreFocus);
    modalElement.addEventListener('hide.bs.modal', preventCloseWhileSaving);
    return () => {
      modalElement.removeEventListener('hidden.bs.modal', restoreFocus);
      modalElement.removeEventListener('hide.bs.modal', preventCloseWhileSaving);
      modal.hide();
      modal.dispose();
      pricesModalInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    let isActive = true;

    const loadExamGroups = async () => {
      setIsLoading(true);
      setErrorMessage('');
      try {
        const response = await getExamgroupsAll();
        console.log('Grupo exam: ', response);
        const groups = Array.isArray(response)
          ? response
          : response?.examGroups ?? response?.data ?? [];

        if (isActive) setExamGroups(Array.isArray(groups) ? groups : []);
      } catch {
        if (isActive) {
          setExamGroups([]);
          setErrorMessage('No fue posible cargar los grupos de exámenes.');
        }
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadExamGroups();
    return () => {
      isActive = false;
    };
  }, [groupsRevision, pricesRevision]);

  useEffect(() => {
    const closeActions = () => {
      setOpenActionsId(null);
      setIsGroupMenuOpen(false);
    };
    document.addEventListener('click', closeActions);
    return () => document.removeEventListener('click', closeActions);
  }, []);

  useEffect(() => {
    if (!pricesButtonRef.current) return undefined;
    const tooltip = new Tooltip(pricesButtonRef.current, { placement: 'left' });
    return () => tooltip.dispose();
  }, [selectedGroupId]);

  const handleHideGroup = async () => {
    if (selectedGroupId == null || !selectedGroup || hidingGroupRef.current) return;
    const annulled = Number(selectedGroup.annulled) === 0 ? 1 : 0;
    hidingGroupRef.current = true;
    setIsHidingGroup(true);
    setIsGroupMenuOpen(false);
    try {
      const response = await updateExamgroup(selectedGroupId, { annulled });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo actualizar la visibilidad del grupo.');
      }
      toast.success(annulled === 1 ? 'El grupo fue ocultado.' : 'El grupo está visible.');
      setGroupsRevision((current) => current + 1);
    } catch {
      toast.error('No se pudo actualizar la visibilidad del grupo.');
    } finally {
      hidingGroupRef.current = false;
      setIsHidingGroup(false);
    }
  };

  const handleCreateGroup = async (event) => {
    event.preventDefault();
    if (creatingGroupRef.current || isLoadingGroup || groupLoadError) return;
    const form = new FormData(event.currentTarget);
    const description = String(form.get('description') ?? '').trim();
    if (!description) {
      setGroupDescriptionError('El campo Descripción no puede quedar en blanco');
      event.currentTarget.elements.namedItem('description').focus();
      return;
    }
    setGroupDescriptionError('');
    creatingGroupRef.current = true;
    setIsCreatingGroup(true);
    try {
      const payload = {
        description,
        annulled: editingGroupId != null && form.has('annulled') ? 1 : 0,
        its_exam: form.has('its_exam') ? 1 : 0,
      };
      const response = editingGroupId != null
        ? await updateExamgroup(editingGroupId, payload)
        : await createExamgroup(payload);
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se registró el grupo');
      }
      toast.success(editingGroupId != null ? 'Los datos fueron registrados.' : 'Se registró el grupo sin problemas');
      creatingGroupRef.current = false;
      newGroupModalInstanceRef.current?.hide();
      setGroupsRevision((current) => current + 1);
    } catch {
      toast.error(editingGroupId != null ? 'No se pudo realizar los cambios.' : 'Presento un problema y no se registro el grupo');
    } finally {
      creatingGroupRef.current = false;
      setIsCreatingGroup(false);
    }
  };

  const handleSavePrices = async (event) => {
    event.preventDefault();
    if (savingPricesRef.current) return;

    const form = new FormData(event.currentTarget);
    const selectedCosts = [1, 2, 3, 4, 5, 6].filter((number) => form.has(`cost${number}`));
    const errors = {};
    if (selectedCosts.length === 0) errors.costs = 'Selecciona al menos un costo para aplicar los cambios.';
    const cambios = selectedCosts.map((number) => {
      const base = form.get(`baseCost${number}`);
      const increment = form.get(`increment${number}`);
      if (!['1', '2', '3', '4', '5', '6'].includes(base)) {
        errors[`base${number}`] = `Selecciona sobre qué costo se aplicará el incremento de Costo ${number}.`;
      }
      if (!/^\d+$/.test(increment ?? '') || !Number.isSafeInteger(Number(increment))) {
        errors[`increment${number}`] = 'Ingresa un incremento entero mayor o igual a cero.';
      }
      return { aplicar: `cost${number}`, incremento: Number(increment), sobre: `cost${base}` };
    });
    setPriceErrors(errors);
    if (Object.keys(errors).length > 0) return;

    savingPricesRef.current = true;
    setIsSavingPrices(true);
    try {
      const response = await updateGroupCosts({ group_id: Number(form.get('groupId')), cambios });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se realizó el cambio.');
      }
      toast.success('Los cambios de precios fueron realizados correctamente.');
      savingPricesRef.current = false;
      pricesModalInstanceRef.current?.hide();
      setPricesRevision((current) => current + 1);
    } catch {
      toast.error('No se realizó el cambio de precios. Inténtalo nuevamente.');
    } finally {
      savingPricesRef.current = false;
      setIsSavingPrices(false);
    }
  };

  const handleToggleExam = async (exam) => {
    if (updatingExamRef.current || exam.id == null) return;
    const annulled = Number(exam.annulled) === 1 ? 0 : 1;
    updatingExamRef.current = true;
    setIsUpdatingExam(true);
    setOpenActionsId(null);
    try {
      const response = await updateExamList(exam.id, { annulled });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo actualizar el examen.');
      }
      toast.success(annulled === 1 ? 'El examen fue ocultado.' : 'El examen está visible.');
      setPricesRevision((current) => current + 1);
    } catch {
      toast.error('No se pudo actualizar el examen. Inténtalo nuevamente.');
    } finally {
      updatingExamRef.current = false;
      setIsUpdatingExam(false);
    }
  };

  const handleSaveEditedExam = async (examId, changes) => {
    const response = await updateExamList(examId, changes);
    if (response?.success === false || response?.ok === false || response?.error) {
      throw new Error('No se pudo actualizar el examen.');
    }
    const updatedExam = response?.data?.exam ?? response?.data ?? response?.exam ?? response;
    if (!updatedExam || typeof updatedExam !== 'object' || Array.isArray(updatedExam)
      || String(updatedExam.id) !== String(examId)) {
      throw new Error('El servicio no devolvió el examen actualizado.');
    }
    setEditingExamId(null);
    setExamGroups((groups) => groups.map((group) => ({
      ...group,
      examlists: Array.isArray(group.examlists) ? group.examlists.map((exam) => (
        String(exam.id) === String(examId) ? { ...exam, ...updatedExam } : exam
      )) : group.examlists,
    })));
    toast.success('El examen fue actualizado correctamente.');
  };

  const selectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setPage(1);
  };

  const selectedGroup = examGroups.find((group) => String(group.id) === String(selectedGroupId));
  const groupExams = Array.isArray(selectedGroup?.examlists) ? selectedGroup.examlists : [];
  const totalItems = groupExams.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const currentPage = Math.min(page, totalPages);
  const exams = groupExams.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const resetDragState = () => {
    draggedIndexRef.current = null;
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragStart = (event, index) => {
    draggedIndexRef.current = index;
    setDraggedIndex(index);
    setSaveErrorMessage('');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(index));
  };

  const handleDragOver = (event, index) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index === draggedIndexRef.current ? null : index);
  };

  const handleDrop = async (event, targetIndex) => {
    event.preventDefault();

    const sourceIndex = draggedIndexRef.current;
    resetDragState();

    if (sourceIndex === null || sourceIndex === targetIndex) return;

    const previousGroups = [...examGroups];
    const reorderedGroups = [...examGroups];
    const [movedGroup] = reorderedGroups.splice(sourceIndex, 1);
    reorderedGroups.splice(targetIndex, 0, movedGroup);
    setExamGroups(reorderedGroups);

    try {
      await Promise.all(
        reorderedGroups.map((group, index) =>
          updateExamgroup(group.id, { position: index + 1 }),
        ),
      );
    } catch {
      setExamGroups(previousGroups);
      setSaveErrorMessage('No fue posible guardar el nuevo orden de los grupos de exámenes.');
    }
  };

  return (
    <div className="dashboard-content setting-exams-page">
      <h1>Lista de exámenes</h1>

      <div className="setting-exams-columns">
        <section className="setting-exams-groups" aria-labelledby="exam-groups-title">
          <h2 id="exam-groups-title">Grupo de exámenes</h2>

          {isLoading && <p className="setting-exams-status">Cargando...</p>}
          {!isLoading && errorMessage && (
            <p className="setting-exams-status text-danger" role="alert">{errorMessage}</p>
          )}
          {!isLoading && !errorMessage && examGroups.length === 0 && (
            <p className="setting-exams-status">No hay grupos de exámenes.</p>
          )}
          {!isLoading && !errorMessage && examGroups.length > 0 && (
            <ul
              className="setting-exams-group-list scrollbar-thin"
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setDragOverIndex(null);
              }}
            >
              {examGroups.map((group, index) => (
                <li
                  key={group.id ?? `${group.description}-${index}`}
                  className={`${String(selectedGroupId) === String(group.id) ? 'is-selected' : ''}${draggedIndex === index ? ' is-dragging' : ''}${dragOverIndex === index ? ' is-drag-over' : ''}`.trim()}
                  draggable
                  tabIndex={0}
                  role="button"
                  aria-pressed={String(selectedGroupId) === String(group.id)}
                  onClick={() => selectGroup(group.id)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      selectGroup(group.id);
                    }
                  }}
                  onDragStart={(event) => handleDragStart(event, index)}
                  onDragOver={(event) => handleDragOver(event, index)}
                  onDrop={(event) => handleDrop(event, index)}
                  onDragEnd={resetDragState}
                >
                  <span
                    className={`ico ico-group-exams setting-exams-group-icon${group.annulled === true || Number(group.annulled) === 1 ? ' setting-exams-group-icon-annulled text-warning' : ''}`}
                    aria-hidden="true"
                  />
                  <span className={`setting-exams-group-description${group.annulled === true || Number(group.annulled) === 1 ? ' text-warning' : ''}`}>
                    {group.description}
                  </span>
                  {(group.its_exam === true || Number(group.its_exam) === 1) && (
                    <span
                      className="ico ico-jeringa setting-exams-its-exam-icon"
                      aria-label="Es examen"
                      title="Es examen"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {saveErrorMessage && (
            <p className="setting-exams-status text-danger" role="alert">{saveErrorMessage}</p>
          )}
        </section>

        <section className="setting-exams-detail" aria-label="Detalle de exámenes">
          {selectedGroupId != null && (
            <>
              <div className="card setting-exams-detail-header">
                <div className="card-body">
                  <strong className="setting-exams-selected-description">{selectedGroup?.description ?? ''}</strong>
                  <div className="setting-exams-header-actions">
                    <button ref={newGroupButtonRef} type="button" className="btn btn-primary" onClick={() => {
                      groupModalTriggerRef.current = newGroupButtonRef.current;
                      setEditingGroupId(null);
                      setGroupDraft({ description: '', its_exam: false, annulled: false });
                      setIsLoadingGroup(false);
                      setGroupLoadError('');
                      setGroupDescriptionError('');
                      newGroupModalInstanceRef.current?.show();
                    }}>Nuevo grupo</button>
                    <button
                      ref={pricesButtonRef}
                      onClick={() => {
                        Tooltip.getInstance(pricesButtonRef.current)?.hide();
                        pricesModalRef.current.querySelector('form').reset();
                        setPriceErrors({});
                        pricesModalInstanceRef.current?.show();
                      }}
                      type="button"
                      className="setting-exams-header-icon text-primary"
                      aria-label="Actualizar todos los precios"
                      title="Actualizar todos los precios"
                      data-bs-toggle="tooltip"
                      data-bs-placement="left"
                    >
                      <span className="ico ico-money" aria-hidden="true" />
                    </button>
                    <div className="setting-exams-group-menu-wrap">
                      <button
                        type="button"
                        className="setting-exams-header-icon text-primary"
                        aria-label="Acciones del grupo"
                        ref={groupMenuButtonRef}
                        aria-haspopup="menu"
                        aria-expanded={isGroupMenuOpen}
                        onClick={(event) => {
                          event.stopPropagation();
                          setIsGroupMenuOpen((current) => !current);
                        }}
                      >
                        <span className="ico ico-more-vertical" aria-hidden="true" />
                      </button>
                      {isGroupMenuOpen && (
                        <ul className="setting-exams-actions-menu setting-exams-group-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                          <li><button type="button" role="menuitem" onClick={() => {
                            setIsGroupMenuOpen(false);
                            groupModalTriggerRef.current = groupMenuButtonRef.current;
                            setGroupDraft({ description: '', its_exam: false, annulled: false });
                            setGroupDescriptionError('');
                            setGroupLoadError('');
                            setIsLoadingGroup(true);
                            setEditingGroupId(selectedGroupId);
                            newGroupModalInstanceRef.current?.show();
                          }}>Editar grupo</button></li>
                          <li><button type="button" role="menuitem" disabled={isHidingGroup} onClick={handleHideGroup}>{Number(selectedGroup?.annulled) === 0 ? 'Ocultar grupo' : 'Mostrar grupo'}</button></li>
                          <li className="setting-exams-menu-separator" role="separator" />
                          <li><button type="button" role="menuitem" onClick={openNewExam}>Nuevo examen</button></li>
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="card setting-exams-table-panel">
              <div className="card-body setting-exams-table-body">
                <div className="setting-exams-table-scroll scrollbar-thin">
                <table className="setting-exams-table">
                  <thead>
                    <tr>
                      <th>Activo</th><th>Descripción</th><th>Abreviatura</th>
                      <th>Prueba<br />especial</th>
                      {[1, 2, 3, 4, 5, 6].map((number) => <th key={number} className="text-end">Precio {number}</th>)}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exams.length === 0 && <tr><td colSpan="11" className="setting-exams-table-message">No hay exámenes en este grupo.</td></tr>}
                    {exams.map((exam, index) => {
                      const isActive = Number(exam.annulled) !== 1;
                      const examKey = exam.id ?? `${exam.description}-${index}`;
                      return (
                        <tr key={examKey}>
                          <td className="setting-exams-center">
                            <span
                              className={`ico ${isActive ? 'ico-eye4 text-primary' : 'ico-eye-off text-warning'}`}
                              aria-label={isActive ? 'Activo' : 'Inactivo'}
                            />
                          </td>
                          <td>{exam.description ?? ''}</td>
                          <td>{exam.abbreviation ?? exam.abbreviature ?? ''}</td>
                          <td className="setting-exams-center">
                            {Number(exam.special_test ?? exam.specialTest ?? 0) === 0 ? (
                              <span className="ico ico-close text-warning ico-lg" aria-label="No es prueba especial" />
                            ) : (
                              <span className="ico ico-check-star text-primary ico-lg" aria-label="Es prueba especial" />
                            )}
                          </td>
                          {[1, 2, 3, 4, 5, 6].map((number) => (
                            <td key={number} className="setting-exams-price">{formatPrice(exam[`cost${number}`])}</td>
                          ))}
                          <td className="setting-exams-center setting-exams-actions-cell">
                            <button
                              type="button"
                              className="setting-exams-action"
                              aria-label={`Acciones para ${exam.description ?? 'examen'}`}
                              aria-haspopup="menu"
                              aria-expanded={openActionsId === examKey}
                              onClick={(event) => {
                                event.stopPropagation();
                                setOpenActionsId((current) => current === examKey ? null : examKey);
                              }}
                            >
                              <span className="ico ico-more-vertical" aria-hidden="true" />
                            </button>
                            {openActionsId === examKey && (
                              <ul className="setting-exams-actions-menu" role="menu" onClick={(event) => event.stopPropagation()}>
                                <li><button type="button" role="menuitem" disabled={exam.id == null} onClick={() => { setOpenActionsId(null); setEditingExamId(exam.id); }}>Editar</button></li>
                                <li><button type="button" role="menuitem" disabled={isUpdatingExam || exam.id == null} onClick={() => handleToggleExam(exam)}>{isActive ? 'Ocultar' : 'Mostrar'}</button></li>
                              </ul>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
                <div className="setting-exams-pagination">
                <label><span>Elementos por página</span><select value={itemsPerPage} onChange={(event) => { setItemsPerPage(Number(event.target.value)); setPage(1); }}>{PAGE_SIZE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
                <span>{totalItems === 0 ? '0-0' : `${(currentPage - 1) * itemsPerPage + 1}-${Math.min(currentPage * itemsPerPage, totalItems)}`} de {totalItems}</span>
                <div className="setting-exams-page-buttons">
                  <button type="button" onClick={() => setPage(1)} disabled={currentPage <= 1} aria-label="Primera página"><span className="ico ico-chevrons-left" /></button>
                  <button type="button" onClick={() => setPage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} aria-label="Página anterior"><span className="ico ico-chevron-left1" /></button>
                  <span>{currentPage}</span>
                  <button type="button" onClick={() => setPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage >= totalPages} aria-label="Página siguiente"><span className="ico ico-chevron-right1" /></button>
                  <button type="button" onClick={() => setPage(totalPages)} disabled={currentPage >= totalPages} aria-label="Última página"><span className="ico ico-chevrons-right" /></button>
                </div>
                </div>
              </div>
              </div>
            </>
          )}
        </section>
      </div>
      <EditorExam examId={editingExamId} examlists={selectedGroup?.examlists} onClose={setEditingExamId} onSave={handleSaveEditedExam} />
      <div ref={newGroupModalRef} className="modal setting-exams-prices-modal" tabIndex={-1} aria-labelledby="new-exam-group-title" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <form className="modal-content" noValidate onSubmit={handleCreateGroup}>
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="new-exam-group-title">{editingGroupId != null ? 'Editar grupo de examen' : 'Nuevo grupo de examen'}</h2>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" disabled={isCreatingGroup} />
            </div>
            <div className="modal-body">
              {isLoadingGroup && <p role="status">Cargando...</p>}
              {groupLoadError && <p className="text-warning" role="alert">{groupLoadError}</p>}
              <fieldset hidden={isLoadingGroup || Boolean(groupLoadError)} disabled={isCreatingGroup || isLoadingGroup || Boolean(groupLoadError)}>
                <label className="form-label" htmlFor="new-exam-group-description">Descripción del grupo:</label>
                <input
                  className="form-control"
                  id="new-exam-group-description"
                  name="description"
                  type="text"
                  required
                  aria-invalid={Boolean(groupDescriptionError)}
                  aria-describedby={groupDescriptionError ? 'new-exam-group-description-error' : undefined}
                  value={groupDraft.description}
                  onChange={(event) => {
                    setGroupDraft((current) => ({ ...current, description: event.target.value }));
                    setGroupDescriptionError('');
                  }}
                />
                {groupDescriptionError && <div id="new-exam-group-description-error" className="text-warning small mt-1" role="alert">{groupDescriptionError}</div>}
                <div className="mt-2 form-check form-switch">
                  <input className="form-check-input" id="new-exam-group-clinical" name="its_exam" role="switch" type="checkbox" checked={groupDraft.its_exam} onChange={(event) => setGroupDraft((current) => ({ ...current, its_exam: event.target.checked }))} />
                  <label className="form-check-label" htmlFor="new-exam-group-clinical">Es análisis clínico</label>
                </div>
                {editingGroupId != null && (
                  <div className="mt-2 form-check form-switch">
                    <input className="form-check-input" id="edit-exam-group-annulled" name="annulled" role="switch" type="checkbox" checked={groupDraft.annulled} onChange={(event) => setGroupDraft((current) => ({ ...current, annulled: event.target.checked }))} />
                    <label className="form-check-label" htmlFor="edit-exam-group-annulled">Anulado</label>
                  </div>
                )}
              </fieldset>
            </div>
            <div className="modal-footer justify-content-end">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={isCreatingGroup}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isCreatingGroup || isLoadingGroup || Boolean(groupLoadError)}>{isCreatingGroup ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </form>
        </div>
      </div>
      <div ref={examModalRef} className="modal setting-exams-prices-modal" tabIndex={-1} aria-labelledby="new-exam-title" aria-hidden="true">
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <form className="modal-content" noValidate onSubmit={handleCreateExam}>
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="new-exam-title">Crear nuevo examen</h2>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" disabled={isSavingExam} />
            </div>
            <div className="modal-body">
              <fieldset disabled={isSavingExam}>
                {[['description', 'Descripción:', 60], ['abbreviation', 'Abreviatura', 10]].map(([name, label, limit]) => (
                  <div className="mb-3" key={name}>
                    <label className="form-label" htmlFor={`new-exam-${name}`}>{label}</label>
                    <input className="form-control" id={`new-exam-${name}`} name={name} maxLength={limit} required aria-invalid={Boolean(examFormErrors[name])} aria-describedby={examFormErrors[name] ? `new-exam-${name}-error` : undefined} />
                    {examFormErrors[name] && <div className="text-warning small mt-1" id={`new-exam-${name}-error`} role="alert">{examFormErrors[name]}</div>}
                  </div>
                ))}
                <div className="card mb-3">
                  <div className="card-body">
                    <div className="form-label" id="new-exam-rates-title">Tarifa</div>
                    <div className="row g-3" role="group" aria-labelledby="new-exam-rates-title">
                      {[1, 2, 3, 4, 5, 6].map((number) => (
                        <div className="col-4" key={number}>
                          <label className="form-label" htmlFor={`new-exam-cost${number}`}>Precio {number}</label>
                          <input className="form-control" id={`new-exam-cost${number}`} name={`cost${number}`} type="number" min="0" step="1" inputMode="numeric" defaultValue="0" required
                            aria-invalid={Boolean(examFormErrors[`cost${number}`])}
                            onKeyDown={(event) => { if (['e', 'E', '+', '-', '.', ','].includes(event.key)) event.preventDefault(); }}
                            onInput={(event) => { if (!/^\d*$/.test(event.currentTarget.value)) event.currentTarget.value = '0'; }}
                          />
                          {examFormErrors[`cost${number}`] && <div className="text-warning small mt-1" role="alert">{examFormErrors[`cost${number}`]}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label" htmlFor="new-exam-tax">Tipo de impuesto:</label>
                  {isLoadingTaxes ? <p role="status">Cargando...</p> : taxError ? <p className="text-warning" role="alert">{taxError}</p> : (
                    <select className="form-select" id="new-exam-tax" name="tax_id" defaultValue={taxes[0]?.id}>
                      {taxes.map((tax) => <option key={tax.id} value={tax.id}>{tax.description}</option>)}
                    </select>
                  )}
                  {examFormErrors.tax_id && <div className="text-warning small mt-1" role="alert">{examFormErrors.tax_id}</div>}
                </div>
                <div className="row">
                  {[['annulled', 'Anulado'], ['special_test', 'Prueba especial']].map(([name, label]) => (
                    <div className="col-6" key={name}>
                      <div className="mt-2 form-check form-switch">
                        <input className="form-check-input" id={`new-exam-${name}`} name={name} role="switch" type="checkbox" />
                        <label className="form-check-label" htmlFor={`new-exam-${name}`}>{label}</label>
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            </div>
            <div className="modal-footer justify-content-end">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={isSavingExam}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSavingExam || isLoadingTaxes || Boolean(taxError)}>{isSavingExam ? 'Registrando...' : 'Registrar'}</button>
            </div>
          </form>
        </div>
      </div>
      <div
        ref={pricesModalRef}
        className="modal setting-exams-prices-modal"
        tabIndex={-1}
        aria-labelledby="automatic-prices-title"
        aria-hidden="true"
      >
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
          <form className="modal-content" noValidate onSubmit={handleSavePrices}>
            <div className="modal-header">
              <h2 className="modal-title fs-5" id="automatic-prices-title">Cambio de precios automático</h2>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Cerrar" disabled={isSavingPrices} />
            </div>
            <div className="modal-body">
              <fieldset disabled={isSavingPrices}>
              <div className="mb-4">
                <label className="form-label" htmlFor="automatic-prices-group">Afecta a los grupos:</label>
                <select className="form-select" id="automatic-prices-group" name="groupId" defaultValue="0">
                  <option value="0">Todos los grupos</option>
                  {examGroups.map((group) => (
                    <option key={group.id} value={group.id}>{group.description}</option>
                  ))}
                </select>
              </div>
              {[1, 2, 3, 4, 5, 6].map((number) => (
                <div className="row g-3 align-items-end mb-3" key={number}>
                  <div className="col-12 col-sm-3">
                    <div className="form-check mb-sm-2">
                      <input className="form-check-input" type="checkbox" id={`automatic-price-${number}`} name={`cost${number}`} />
                      <label className="form-check-label" htmlFor={`automatic-price-${number}`}>Costo {number}</label>
                    </div>
                    {number === 1 && priceErrors.costs && <div className="text-warning small mt-1" role="alert">{priceErrors.costs}</div>}
                  </div>
                  <div className="col-6 col-sm-4">
                    <label className="form-label" htmlFor={`automatic-increment-${number}`}>Incremento</label>
                    <div className="input-group">
                      <div className="setting-exams-increment-field">
                      <input
                        className="form-control"
                        type="number"
                        min="0"
                        step="1"
                        defaultValue="0"
                        required
                        inputMode="numeric"
                        id={`automatic-increment-${number}`}
                        name={`increment${number}`}
                        aria-describedby={`automatic-percent-${number}`}
                        onKeyDown={(event) => {
                          if (['e', 'E', '+', '-', '.', ','].includes(event.key)) event.preventDefault();
                        }}
                        onInput={(event) => {
                          if (!/^\d*$/.test(event.currentTarget.value)) event.currentTarget.value = '0';
                        }}
                        onBlur={(event) => {
                          if (event.currentTarget.value === '') event.currentTarget.value = '0';
                        }}
                      />
                      <div className="setting-exams-increment-buttons">
                        {['up', 'down'].map((direction) => (
                          <button
                            key={direction}
                            type="button"
                            aria-label={`${direction === 'up' ? 'Aumentar' : 'Disminuir'} incremento de Costo ${number}`}
                            onClick={(event) => {
                              const input = event.currentTarget.closest('.setting-exams-increment-field').querySelector('input');
                              if (direction === 'up') input.stepUp();
                              else input.stepDown();
                              input.dispatchEvent(new Event('input', { bubbles: true }));
                            }}
                          >
                            <span className={`ico ico-chevron-${direction}`} aria-hidden="true" />
                          </button>
                        ))}
                      </div>
                      </div>
                      <span className="input-group-text" id={`automatic-percent-${number}`}>%</span>
                    </div>
                    {priceErrors[`increment${number}`] && <div className="text-warning small mt-1" role="alert">{priceErrors[`increment${number}`]}</div>}
                  </div>
                  <div className="col-6 col-sm-5">
                    <label className="form-label" htmlFor={`automatic-base-${number}`}>Sobre quien:</label>
                    <select className="form-select" id={`automatic-base-${number}`} name={`baseCost${number}`} defaultValue="">
                      <option value="" />
                      {[1, 2, 3, 4, 5, 6].map((cost) => (
                        <option key={cost} value={cost}>Costo {cost}</option>
                      ))}
                    </select>
                    {priceErrors[`base${number}`] && <div className="text-warning small mt-1" role="alert">{priceErrors[`base${number}`]}</div>}
                  </div>
                </div>
              ))}
              </fieldset>
            </div>
            <div className="modal-footer justify-content-end">
              <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" disabled={isSavingPrices}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={isSavingPrices}>{isSavingPrices ? 'Guardando...' : 'Aceptar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default SettingExams;
