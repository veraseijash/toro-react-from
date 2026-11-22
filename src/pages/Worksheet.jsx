import { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'bootstrap';
import { getGroupHtListActive } from '../services/worksheetService';
import WorksheetPatients from '../components/WorksheetPatients';

export default function Worksheet() {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
  });
  const [groups, setGroups] = useState(null);
  const [groupError, setGroupError] = useState('');
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [searchRevision, setSearchRevision] = useState(0);
  const refreshButtonRef = useRef(null);

  useEffect(() => {
    const tooltip = new Tooltip(refreshButtonRef.current, {
      title: 'Reiniciar búsqueda',
      container: 'body',
    });
    return () => tooltip.dispose();
  }, []);

  useEffect(() => {
    let active = true;

    const loadGroups = async () => {
      try {
        const response = await getGroupHtListActive();
        const rows = Array.isArray(response) ? response : response?.groupHt ?? response?.groups ?? response?.data;
        if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
          throw new Error('Respuesta de grupos inválida.');
        }
        if (active) setGroups(rows);
      } catch {
        if (active) setGroupError('No se pudieron cargar los grupos activos.');
      }
    };

    loadGroups();
    return () => { active = false; };
  }, []);

  return (
    <div className="dashboard-content setting-exams-page">
      <div className="d-flex align-items-start justify-content-between gap-3">
        <h1>Hoja de trabajo</h1>
        <button type="button" className="btn btn-primary">Imprimir</button>
      </div>
      <div className="worksheet-columns">
        <div className="setting-exams-groups">
          <div className="worksheet-search-controls">
            <input
              type="date"
              className="form-control"
              aria-label="Fecha de la hoja de trabajo"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
            <button ref={refreshButtonRef} type="button" className="worksheet-reset" aria-label="Reiniciar búsqueda"
              disabled={!selectedGroup || !selectedDate}
              onClick={() => {
                Tooltip.getInstance(refreshButtonRef.current)?.hide();
                setSearchRevision((revision) => revision + 1);
              }}>
              <span className="ico ico-refresh1" aria-hidden="true" />
            </button>
          </div>
          {groupError && <p className="setting-exams-status text-danger" role="alert">{groupError}</p>}
          {!groupError && groups === null && <p className="setting-exams-status" role="status">Cargando grupos…</p>}
          {groups?.length === 0 && <p className="setting-exams-status">No hay grupos activos.</p>}
          {groups?.length > 0 && (
            <ul className="setting-exams-group-list worksheet-group-list scrollbar-thin" aria-label="Grupos activos">
              {groups.map((group, index) => (
                <li key={group.id ?? `${group.description}-${index}`} className={selectedGroup === group ? 'is-selected' : undefined}>
                  <button type="button" aria-pressed={selectedGroup === group} onClick={() => {
                    setSelectedGroup(group);
                    setSearchRevision((revision) => revision + 1);
                  }}>
                    <span className="setting-exams-group-description">{group.description}</span>
                    <span className="ico ico-list4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="setting-exams-detail">
          {selectedGroup && selectedDate && (
            <WorksheetPatients key={`${selectedDate}-${searchRevision}`} group={selectedGroup} date={selectedDate} />
          )}
        </div>
      </div>
    </div>
  );
}
