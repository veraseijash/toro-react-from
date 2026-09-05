import { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'bootstrap';
import { getExamByGroupPaginated, getExamgroupsAll, updateExamgroup } from '../services/examsService';

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
  const [exams, setExams] = useState([]);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [page, setPage] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingExams, setIsLoadingExams] = useState(false);
  const [examsError, setExamsError] = useState('');
  const [openActionsId, setOpenActionsId] = useState(null);
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const draggedIndexRef = useRef(null);
  const pricesButtonRef = useRef(null);

  useEffect(() => {
    let isActive = true;

    const loadExamGroups = async () => {
      try {
        const response = await getExamgroupsAll();
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
  }, []);

  useEffect(() => {
    if (selectedGroupId == null) return undefined;
    let isActive = true;

    const loadExams = async () => {
      setIsLoadingExams(true);
      setExamsError('');
      try {
        const response = await getExamByGroupPaginated({
          groupId: selectedGroupId,
          itemsPerPage,
          page,
        });
        const pageData = response?.data && !Array.isArray(response.data) ? response.data : response;
        const pagination = response?.pagination ?? response?.meta
          ?? pageData?.pagination ?? pageData?.meta ?? pageData ?? {};
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
            ? response.data
            : pageData?.data ?? pageData?.exams ?? pageData?.items ?? pageData?.results ?? [];
        const total = Number(pagination.total ?? pagination.totalItems ?? response?.total ?? rows.length);
        const lastPage = Number(
          pagination.last_page ?? pagination.totalPages ?? response?.last_page
            ?? Math.max(1, Math.ceil(total / itemsPerPage)),
        );

        if (isActive) {
          setExams(Array.isArray(rows) ? rows : []);
          setTotalItems(Number.isFinite(total) ? total : 0);
          setTotalPages(Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1);
        }
      } catch {
        if (isActive) {
          setExams([]);
          setTotalItems(0);
          setTotalPages(1);
          setExamsError('No fue posible cargar los exámenes del grupo.');
        }
      } finally {
        if (isActive) setIsLoadingExams(false);
      }
    };

    loadExams();
    return () => { isActive = false; };
  }, [selectedGroupId, itemsPerPage, page]);

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

  const selectGroup = (groupId) => {
    setSelectedGroupId(groupId);
    setPage(1);
  };

  const selectedGroup = examGroups.find((group) => String(group.id) === String(selectedGroupId));

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
                    <button type="button" className="btn btn-primary">Nuevo grupo</button>
                    <button
                      ref={pricesButtonRef}
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
                          <li><button type="button" role="menuitem" onClick={() => setIsGroupMenuOpen(false)}>Editar grupo</button></li>
                          <li><button type="button" role="menuitem" onClick={() => setIsGroupMenuOpen(false)}>Ocultar grupo</button></li>
                          <li className="setting-exams-menu-separator" role="separator" />
                          <li><button type="button" role="menuitem" onClick={() => setIsGroupMenuOpen(false)}>Nuevo examen</button></li>
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
                      {[1, 2, 3, 4, 5, 6].map((number) => <th key={number}>Precio {number}</th>)}
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingExams && <tr><td colSpan="11" className="setting-exams-table-message">Cargando...</td></tr>}
                    {!isLoadingExams && examsError && <tr><td colSpan="11" className="setting-exams-table-message text-danger">{examsError}</td></tr>}
                    {!isLoadingExams && !examsError && exams.length === 0 && <tr><td colSpan="11" className="setting-exams-table-message">No hay exámenes en este grupo.</td></tr>}
                    {!isLoadingExams && !examsError && exams.map((exam, index) => {
                      const isActive = !(exam.active === false || Number(exam.active) === 0);
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
                              <span className="ico ico-close text-warning" aria-label="No es prueba especial" />
                            ) : (
                              <span className="ico ico-check text-primary" aria-label="Es prueba especial" />
                            )}
                          </td>
                          {[1, 2, 3, 4, 5, 6].map((number) => (
                            <td key={number} className="setting-exams-price">{formatPrice(exam[`price_${number}`] ?? exam[`price${number}`])}</td>
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
                                <li><button type="button" role="menuitem" onClick={() => setOpenActionsId(null)}>Editar</button></li>
                                <li><button type="button" role="menuitem" onClick={() => setOpenActionsId(null)}>Oculta</button></li>
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
                <span>{totalItems === 0 ? '0-0' : `${(page - 1) * itemsPerPage + 1}-${Math.min(page * itemsPerPage, totalItems)}`} de {totalItems}</span>
                <div className="setting-exams-page-buttons">
                  <button type="button" onClick={() => setPage(1)} disabled={page <= 1} aria-label="Primera página"><span className="ico ico-chevrons-left" /></button>
                  <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} aria-label="Página anterior"><span className="ico ico-chevron-left1" /></button>
                  <span>{page}</span>
                  <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} aria-label="Página siguiente"><span className="ico ico-chevron-right1" /></button>
                  <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} aria-label="Última página"><span className="ico ico-chevrons-right" /></button>
                </div>
                </div>
              </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default SettingExams;
