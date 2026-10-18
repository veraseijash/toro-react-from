import { useEffect, useRef, useState } from 'react';
import { getExamgroups, getExamByGroup, getExamListByDescription, getRoutinesList } from '../../services/admissionService';
import { getExamList } from '../../services/examsService';
import numericFormat from '../../utils/numericFormat';
import AdmissionTotals from './AdmissionTotals';

const MODES = [
  { id: 'groups', icon: 'ico-group-exams', label: 'Grupos de exámenes' },
  { id: 'routines', icon: 'ico-circle-r', label: 'Rutinas de exámenes' },
  { id: 'search', icon: 'ico-search1', label: 'Buscar exámenes' },
];

function ExamsList({ onExamSelect, onRoutineSelect, tariff = '1', onTariffChange, totals }) {
  const [mode, setMode] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [groupId, setGroupId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exams, setExams] = useState([]);
  const [loadingExams, setLoadingExams] = useState(false);
  const [examError, setExamError] = useState('');
  const [selectedExam, setSelectedExam] = useState(null);
  const [routines, setRoutines] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const items = mode === 'routines' ? routines : exams;
  const { selectedRows, setSelectedExams } = totals;
  const [loadingRoutine, setLoadingRoutine] = useState(false);
  const [routineError, setRoutineError] = useState('');
  const addingRoutineRef = useRef(false);

  const addExams = (examsToAdd) => {
    setSelectedExams((current) => examsToAdd.reduce((rows, exam) => {
      const exists = rows.some((row) => String(row.exam.id) === String(exam.id));
      return exists
        ? rows.map((row) => String(row.exam.id) === String(exam.id) ? { ...row, quantity: row.quantity + 1 } : row)
        : [...rows, { exam, quantity: 1 }];
    }, current));
  };

  const addRoutine = async (routine) => {
    if (addingRoutineRef.current) return;
    addingRoutineRef.current = true;
    setLoadingRoutine(true);
    setRoutineError('');
    setSelectedRoutine(routine);
    try {
      const registered = typeof routine.registered_exams === 'string'
        ? JSON.parse(routine.registered_exams) : routine.registered_exams ?? [];
      if (!Array.isArray(registered)) throw new Error('Rutina inválida');
      const ids = [...new Set(registered.map((exam) => String(exam.examId ?? exam.id)))];
      const routineExams = await Promise.all(ids.map(async (id) => {
        const response = await getExamList(id);
        const data = response?.examlist ?? response?.exam ?? response?.examlists ?? response?.data ?? response;
        const exam = Array.isArray(data) ? data.find((item) => String(item.id) === id) : data;
        if (response?.success === false || response?.error || exam?.id == null || String(exam.id) !== id) {
          throw new Error('Examen inválido');
        }
        return exam;
      }));
      addExams(routineExams);
      onRoutineSelect?.(routine);
    } catch {
      setRoutineError('No se pudieron agregar los exámenes de la rutina. Vuelve a intentarlo.');
    } finally {
      addingRoutineRef.current = false;
      setLoadingRoutine(false);
    }
  };


  useEffect(() => {
    setExams([]);
    setSelectedExam(null);
    setRoutines([]);
    setSelectedRoutine(null);
    setExamError('');
    if ((mode === 'groups' && !groupId) || (mode === 'search' && !query.trim())) {
      setLoadingExams(false);
      return;
    }
    setLoadingExams(true);
    let active = true;
    const loadExams = async () => {
      setLoadingExams(true);
      setExamError('');
      setExams([]);
      setSelectedExam(null);
      try {
        const response = mode === 'groups'
          ? await getExamByGroup(groupId)
          : mode === 'routines' ? await getRoutinesList() : await getExamListByDescription(query);
        const rows = Array.isArray(response) ? response : mode === 'routines'
          ? response?.routines ?? response?.data
          : response?.examlists ?? response?.exams ?? response?.data;
        if (response?.success === false || response?.error || !Array.isArray(rows)) throw new Error('Respuesta inválida');
        if (active) {
          if (mode === 'routines') setRoutines(rows);
          else setExams(rows);
        }
      } catch {
        if (active) setExamError(mode === 'groups' ? 'No se pudieron cargar los exámenes del grupo.' : mode === 'routines' ? 'No se pudieron cargar las rutinas.' : 'No se pudieron buscar los exámenes.');
      } finally {
        if (active) setLoadingExams(false);
      }
    };
    const timer = setTimeout(loadExams, mode === 'search' ? 300 : 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [mode, groupId, query]);

  useEffect(() => {
    let active = true;
    const loadGroups = async () => {
      try {
        const response = await getExamgroups();
        const rows = Array.isArray(response) ? response : response?.examGroups ?? response?.examgroups ?? response?.data;
        if (response?.success === false || response?.error || !Array.isArray(rows)) throw new Error('Respuesta inválida');
        if (active) {
          setGroups(rows);
          setGroupId(String(rows[0]?.id ?? ''));
        }
      } catch {
        if (active) setError('No se pudieron cargar los grupos de exámenes.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadGroups();
    return () => { active = false; };
  }, []);

  return (
    <div className="admission-exams-columns">
      <section aria-label="Lista de exámenes">
        <div className="admission-exams-toolbar">
          <div className="btn-group" role="group" aria-label="Modo de selección de exámenes">
            {MODES.map((item) => (
              <button key={item.id} type="button" className={`btn btn-primary${mode === item.id ? ' active' : ''}`}
                aria-label={item.label} title={item.label} aria-pressed={mode === item.id} onClick={() => setMode(item.id)}>
                <span className={`ico ${item.icon}`} aria-hidden="true" />
              </button>
            ))}
          </div>
          {mode === 'groups' && (
            <select className="form-select" aria-label="Grupo de exámenes" value={groupId}
              onChange={(event) => setGroupId(event.target.value)} disabled={loading || Boolean(error) || !groups.length}>
              {(loading || !groups.length) && <option value="">{loading ? 'Cargando...' : 'Sin grupos disponibles'}</option>}
              {groups.map((group) => <option key={group.id} value={group.id}>{group.description ?? group.name}</option>)}
            </select>
          )}
          {mode === 'search' && <input className="form-control" type="search" aria-label="Buscar exámenes" placeholder="Buscar..." value={query} onChange={(event) => setQuery(event.target.value)} />}
        </div>
        {mode === 'groups' && error && <p className="text-danger mt-2" role="alert">{error}</p>}
        {loadingRoutine && <p className="mt-2" role="status">Agregando exámenes de la rutina...</p>}
        {routineError && <p className="text-danger mt-2" role="alert">{routineError}</p>}
        {((mode === 'groups' && groupId) || mode === 'search' || mode === 'routines') && (
          <div className="card admission-exams-card" aria-busy={loadingExams}>
            {loadingExams && <p className="p-3 mb-0" role="status">{mode === 'routines' ? 'Cargando rutinas...' : 'Cargando exámenes...'}</p>}
            {examError && <p className="text-danger p-3 mb-0" role="alert">{examError}</p>}
            {!loadingExams && !examError && !items.length && <p className="p-3 mb-0" role="status">{mode === 'routines' ? 'No hay rutinas disponibles.' : mode === 'groups' ? 'No hay exámenes en este grupo.' : query.trim() ? 'No se encontraron exámenes.' : 'Escriba para buscar exámenes.'}</p>}
            {!loadingExams && !examError && (
              <ul className="list-group list-group-flush">
                {items.map((exam) => (
                  <li className="list-group-item p-0" key={exam.id}>
                    <button type="button" className={`list-group-item list-group-item-action border-0${(mode === 'routines' ? selectedRoutine : selectedExam) === exam ? ' active' : ''}`}
                      disabled={mode === 'routines' && loadingRoutine}
                      aria-pressed={(mode === 'routines' ? selectedRoutine : selectedExam) === exam} onClick={() => {
                        if (mode === 'routines') {
                          addRoutine(exam);
                        } else {
                          setSelectedExam(exam);
                          addExams([exam]);
                          onExamSelect?.(exam);
                        }
                      }}>
                      {exam.description}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
      <section className="admission-exams-selected" aria-label="Exámenes seleccionados">
        <div>
          <select className="form-select" style={{ width: '250px' }} aria-label="Tarifa" value={tariff} onChange={(event) => onTariffChange?.(event.target.value)}>
            {[1, 2, 3, 4, 5, 6].map((value) => <option key={value} value={value}>Tarifa {value}</option>)}
          </select>
        </div>
        <div className="card admission-exams-selected-content">
          <div className="table-responsive">
            <table className="table table-hover mb-0 admission-selected-table" aria-label="Detalle de exámenes seleccionados">
              <thead>
                <tr>
                  <th scope="col" aria-label="Eliminar" />
                  <th scope="col">Cant.</th>
                  <th scope="col">Descripción</th>
                  <th scope="col">Impuesto</th>
                  <th scope="col">%</th>
                  <th scope="col">Precio u.</th>
                  <th scope="col">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {selectedRows.map(({ exam, quantity, tax, taxRate, unitPrice, total }) => (
                  <tr key={exam.id}>
                    <td>
                      <button type="button" className="border-0 bg-transparent p-0 text-warning"
                        aria-label={`Eliminar ${exam.description}`} title="Eliminar"
                        onClick={() => setSelectedExams((current) => current.filter((row) => String(row.exam.id) !== String(exam.id)))}>
                        <span className="ico ico-trash-2" aria-hidden="true" />
                      </button>
                    </td>
                    <td>{quantity}</td>
                    <td>{exam.description}</td>
                    <td>{tax?.description ?? ''}</td>
                    <td>{numericFormat(taxRate, 2)}</td>
                    <td>{numericFormat(unitPrice, 2)}</td>
                    <td>{numericFormat(total, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <AdmissionTotals totals={totals} />
      </section>
    </div>
  );
}

export default ExamsList;
