import { Fragment, useEffect, useState } from 'react';
import { getPatientsByDateAndExamIds } from '../services/worksheetService';

const PAGE_SIZES = [5, 10, 15, 25, 50, 100];

function getExamIds(group) {
  let items = group.grouphtitems;
  if (typeof items === 'string') items = JSON.parse(items);
  return [...new Set((Array.isArray(items) ? items : [])
    .map((item) => String(item?.examId ?? '').trim()).filter(Boolean))];
}

export default function WorksheetPatients({ group, date }) {
  const [patients, setPatients] = useState(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(() => new Set());
  const [expanded, setExpanded] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  useEffect(() => {
    let active = true;
    const loadPatients = async () => {
      try {
        const examIds = getExamIds(group);
        if (!examIds.length) {
          if (active) setPatients([]);
          return;
        }
        const response = await getPatientsByDateAndExamIds({ date, examIds });
        const rows = Array.isArray(response) ? response : response?.patients ?? response?.data?.patients ?? response?.data;
        if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
          throw new Error('Respuesta de pacientes inválida.');
        }
        if (active) setPatients(rows);
      } catch {
        if (active) setError('No se pudieron cargar los pacientes del grupo.');
      }
    };
    loadPatients();
    return () => { active = false; };
  }, [date, group]);

  if (error) return <p className="text-danger" role="alert">{error}</p>;
  if (!patients) return <p role="status">Cargando pacientes…</p>;

  const start = (page - 1) * pageSize;
  const lastPage = Math.max(1, Math.ceil(patients.length / pageSize));
  const visiblePatients = patients.slice(start, start + pageSize);
  const patientIds = visiblePatients.map((patient, index) => patient.id ?? patient.patient_id ?? patient.patientId ?? start + index);
  const allSelected = patientIds.length > 0 && patientIds.every((id) => selected.has(id));
  const updateSelection = (ids, checked) => {
    setSelected((current) => {
      const next = new Set(current);
      ids.forEach((id) => { if (checked) next.add(id); else next.delete(id); });
      return next;
    });
  };

  return (
    <div className="card setting-exams-table-panel">
      <div className="card-body setting-exams-table-body">
        <div className="setting-exams-table-scroll scrollbar-thin">
          <table className="setting-exams-table worksheet-patients-table" aria-label="Pacientes del grupo">
            <thead>
              <tr>
                <th scope="col"><input type="checkbox" className="form-check-input" aria-label="Seleccionar pacientes de esta página"
                  disabled={!patientIds.length} checked={allSelected} onChange={(event) => updateSelection(patientIds, event.target.checked)} /></th>
                <th scope="col">Sec. / #</th>
                <th scope="col">Paciente</th>
                <th scope="col">Edad</th>
                <th scope="col">Sexo</th>
                <th scope="col">Hora ingreso</th>
                <th scope="col">Teléfono</th>
                <th scope="col"><span className="visually-hidden">Exámenes</span></th>
              </tr>
            </thead>
            <tbody>
              {!visiblePatients.length && <tr><td colSpan={8} className="setting-exams-table-message">No hay pacientes para este grupo y fecha.</td></tr>}
              {visiblePatients.map((patient, index) => {
                const id = patientIds[index];
                const open = expanded === id;
                const linkedExams = patient.exams ?? patient.examlists;
                const exams = Array.isArray(linkedExams) ? linkedExams : [];
                return (
                  <Fragment key={id}>
                    <tr>
                      <td><input type="checkbox" className="form-check-input" aria-label={`Seleccionar a ${patient.name}`}
                        checked={selected.has(id)} onChange={(event) => updateSelection([id], event.target.checked)} /></td>
                      <td>{patient.patient_position ?? '—'} / {patient.id ?? patient.patient_id ?? patient.patientId ?? '—'}</td>
                      <td>{patient.name}</td>
                      <td>{patient.age} {patient.month_year}</td>
                      <td>{patient.sex == null ? '—' : Number(patient.sex) === 1 ? 'Masculino' : Number(patient.sex) === 0 ? 'Femenino' : patient.sex}</td>
                      <td>{String(patient.admission_time ?? '').match(/\d{2}:\d{2}(?::\d{2})?/)?.[0] ?? '—'}</td>
                      <td>{patient.phone}</td>
                      <td>
                        <button type="button" className="btn rounded-circle worksheet-exams-toggle" aria-expanded={open}
                          aria-label={`${open ? 'Ocultar' : 'Mostrar'} exámenes de ${patient.name}`}
                          onClick={() => setExpanded(open ? null : id)}>
                          <span className={`ico ico-chevron-${open ? 'up' : 'down'}1`} aria-hidden="true" />
                        </button>
                      </td>
                    </tr>
                    {open && <tr><td colSpan={8}>
                      {exams.length ? <ul className="list-unstyled mb-0">
                        {exams.map((exam, examIndex) => (
                          <li key={exam.id ?? examIndex}>{exam.description ?? exam.examlist?.description ?? exam.examlists?.description}</li>
                        ))}
                      </ul> : 'Sin exámenes vinculados.'}
                    </td></tr>}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="setting-exams-pagination worksheet-pagination">
          <label><span>Elementos por página</span>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}>
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <span>{patients.length ? `${start + 1}-${Math.min(start + pageSize, patients.length)}` : '0'} de {patients.length}</span>
          <div className="setting-exams-page-buttons">
            <button type="button" aria-label="Primera página" disabled={page === 1} onClick={() => setPage(1)}><span className="ico ico-chevrons-left" aria-hidden="true" /></button>
            <button type="button" aria-label="Página anterior" disabled={page === 1} onClick={() => setPage(page - 1)}><span className="ico ico-chevron-left1" aria-hidden="true" /></button>
            <span>{page}</span>
            <button type="button" aria-label="Página siguiente" disabled={page === lastPage} onClick={() => setPage(page + 1)}><span className="ico ico-chevron-right1" aria-hidden="true" /></button>
            <button type="button" aria-label="Última página" disabled={page === lastPage} onClick={() => setPage(lastPage)}><span className="ico ico-chevrons-right" aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    </div>
  );
}
