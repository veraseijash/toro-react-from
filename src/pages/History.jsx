import { useEffect, useRef, useState } from 'react';
import List from '../components/patients/List';
import { getPatientsDateOrder } from '../services/patientsService';

function History() {
  const now = new Date();
  const currentDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [patients, setPatients] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;

    if (!selectedDate) {
      setIsRefreshing(false);
      return undefined;
    }

    const loadPatients = async () => {
      setIsRefreshing(true);

      try {
        const patients = await getPatientsDateOrder(selectedDate);
        console.log('Pacientes por fecha:', patients);
        const patientList = Array.isArray(patients)
          ? patients
          : patients?.patients ?? patients?.data ?? [];

        if (requestId.current === currentRequestId) {
          setPatients(Array.isArray(patientList) ? patientList : []);
        }
      } catch (error) {
        console.error('No fue posible obtener los pacientes por fecha:', error);
        if (requestId.current === currentRequestId) setPatients([]);
      } finally {
        if (requestId.current === currentRequestId) {
          setIsRefreshing(false);
        }
      }
    };

    loadPatients();
    return undefined;
  }, [selectedDate]);

  return (
    <div className="dashboard-content">
      <span
        className={`ico ico-refresh-cw home-refresh-icon${isRefreshing ? ' refreshing' : ''}`}
        aria-hidden="true"
      />
      <div className="d-flex align-items-center gap-4 w-50">
        <h1>Historia</h1>
        <input
          type="date"
          className="form-control"
          value={selectedDate}
          onChange={(event) => setSelectedDate(event.target.value)}
        />
      </div>
      <div className="history-columns">
        <section className="history-list-column" aria-label="Lista de pacientes">
          {!isRefreshing && <List patients={patients} />}
        </section>
        <section className="history-detail-column" aria-label="Detalle del paciente" />
      </div>
    </div>
  );
}

export default History;
