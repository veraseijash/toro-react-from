import { useEffect, useState } from 'react';
import { getExamgroupsAll } from '../services/examsService';

function SettingExams() {
  const [examGroups, setExamGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

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
            <ul className="setting-exams-group-list scrollbar-thin">
              {examGroups.map((group, index) => (
                <li key={group.id ?? `${group.description}-${index}`}>
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
        </section>

        <section className="setting-exams-detail" aria-label="Detalle de exámenes" />
      </div>
    </div>
  );
}

export default SettingExams;
