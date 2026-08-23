import { useEffect, useRef, useState } from 'react';
import List from '../components/patients/List';
import Examen from '../components/patients/Examen';
import { getPatient, getPatientsDateOrder } from '../services/patientsService';

const formatDeliveryDate = (value) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = String(hours % 12 || 12).padStart(2, '0');

  return `${day}-${month}-${year} ${hours12}:${minutes} ${period}`;
};

const formatAmount = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return '';

  return new Intl.NumberFormat('es-CL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

function History() {
  const now = new Date();
  const currentDate = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
  const [selectedDate, setSelectedDate] = useState(currentDate);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedExam, setSelectedExam] = useState(null);
  const [isObservationOpen, setIsObservationOpen] = useState(false);
  const [isLoadingPatient, setIsLoadingPatient] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const requestId = useRef(0);
  const patientRequestId = useRef(0);
  const observationDropdownRef = useRef(null);

  const handleSelectPatient = async (id) => {
    const currentRequestId = patientRequestId.current + 1;
    patientRequestId.current = currentRequestId;
    setIsLoadingPatient(true);
    setIsObservationOpen(false);

    try {
      const response = await getPatient(id);
      const patient = response?.patient ?? response?.data ?? response;

      if (patientRequestId.current === currentRequestId) {
        setSelectedPatient(patient && typeof patient === 'object' ? patient : null);
      }
    } catch (error) {
      console.error('No fue posible obtener el paciente:', error);
      if (patientRequestId.current === currentRequestId) setSelectedPatient(null);
    } finally {
      if (patientRequestId.current === currentRequestId) setIsLoadingPatient(false);
    }
  };

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

  useEffect(() => {
    patientRequestId.current += 1;
    setSelectedPatient(null);
    setSelectedExam(null);
    setIsObservationOpen(false);
    setIsLoadingPatient(false);
  }, [selectedDate]);

  useEffect(() => {
    if (!isObservationOpen) return undefined;

    const closeObservation = (event) => {
      if (!observationDropdownRef.current?.contains(event.target)) {
        setIsObservationOpen(false);
      }
    };

    document.addEventListener('mousedown', closeObservation);
    return () => document.removeEventListener('mousedown', closeObservation);
  }, [isObservationOpen]);

  const hasObservation = Boolean(String(selectedPatient?.observation ?? '').trim());

  const handleExamRegistered = async (examId, data) => {
    try {
      const response = await getPatientsDateOrder(selectedDate);
      const patientList = Array.isArray(response)
        ? response
        : response?.patients ?? response?.data ?? [];

      if (Array.isArray(patientList)) setPatients(patientList);
      setSelectedExam({ id: examId, processedId: data.processed_id });
    } catch (error) {
      console.error('No fue posible actualizar la lista de exámenes:', error);
    }
  };

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
          {!isRefreshing && (
            <List
              patients={patients}
              onSelectPatient={handleSelectPatient}
              onSelectExam={(id, processedId) => setSelectedExam({ id, processedId })}
              onClearExam={() => setSelectedExam(null)}
              selectedPatientId={selectedPatient?.id}
            />
          )}
        </section>
        <section className="history-detail-column" aria-label="Detalle del paciente">
          {isLoadingPatient && <p className="patient-detail-status">Cargando paciente...</p>}
          {!isLoadingPatient && selectedPatient && (
            <>
            <article className="card patient-summary-card">
              <div className="card-body patient-summary-body">
                <div className="patient-summary-column">
                  <div className="patient-summary-name">
                    <span className="patient-summary-id">#{selectedPatient.id}</span>{' '}
                    {selectedPatient.name}
                  </div>
                  <div className="patient-summary-row">
                    <span><strong>Edad:</strong> {selectedPatient.age} {selectedPatient.month_year}</span>
                    <span>{Number(selectedPatient.sex) === 1 ? 'Masculino' : 'Femenino'}</span>
                  </div>
                  <div className="patient-summary-row">
                    <span><strong>Teléfono:</strong> {selectedPatient.phone}</span>
                  </div>
                  <div className="patient-summary-row">
                    <span>
                      <strong>C.I.:</strong> {selectedPatient.verification_code}{' '}
                      {selectedPatient.document_number}
                    </span>
                  </div>
                  <div className="patient-summary-row">
                    <span><strong>Email:</strong> {selectedPatient.email}</span>
                  </div>
                </div>
                <div className="patient-summary-column">
                  <div className="patient-summary-row">
                    <span><strong>Muestra:</strong> {selectedPatient.sample}</span>
                  </div>
                  <div className="patient-summary-row">
                    <span><strong>Tipo de muestra:</strong> {selectedPatient.sample_type}</span>
                  </div>
                  <div className="patient-summary-row">
                    <span><strong>Atendido:</strong> {selectedPatient.user?.name}</span>
                  </div>
                  <div
                    className="patient-summary-row patient-observation-dropdown"
                    ref={observationDropdownRef}
                  >
                    <button
                      type="button"
                      className={`patient-observation-button ${hasObservation ? 'text-warning' : 'text-gray-500'}`}
                      disabled={!hasObservation}
                      aria-expanded={hasObservation ? isObservationOpen : false}
                      aria-controls="patient-observation-card"
                      onClick={() => setIsObservationOpen((isOpen) => !isOpen)}
                    >
                      <span
                        className={`ico ico-commenting-o patient-observation-icon${hasObservation ? '' : ' no-observation'}`}
                        aria-hidden="true"
                      />
                      <span className={hasObservation ? '' : 'patient-observation-label-empty'}>
                        Observaciones
                      </span>
                    </button>
                    {hasObservation && isObservationOpen && (
                      <article className="card patient-observation-card" id="patient-observation-card">
                        <div className="card-body patient-observation-body">
                          <h2 className="patient-observation-title">Observación</h2>
                          <p className="patient-observation-text">{selectedPatient.observation}</p>
                        </div>
                      </article>
                    )}
                  </div>
                  {selectedPatient.delivery_id != null && Number(selectedPatient.delivery_id) !== 0 && (
                    <>
                      <div className="patient-summary-row">
                        <span>
                          <strong>Entregado por:</strong> {selectedPatient.deliveryUser?.name}
                        </span>
                      </div>
                      <div className="patient-summary-row">
                        <span>
                          <strong>Fecha:</strong> {formatDeliveryDate(selectedPatient.deliver_date)}
                        </span>
                      </div>
                      <div className="patient-summary-row">
                        <span><strong>Recibido:</strong> {selectedPatient.receive}</span>
                      </div>
                    </>
                  )}
                </div>
                <div className="patient-summary-column">
                  <div className="patient-summary-row">
                    <span>
                      <strong>Referido:</strong>{' '}
                      {Number(selectedPatient.client_id) === 1
                        ? 'Ambulatorio'
                        : selectedPatient.client?.business_name}
                    </span>
                  </div>
                  <div className="patient-summary-row">
                    <span><strong>Factura: #</strong> {selectedPatient.invoice}</span>
                  </div>
                  <div className="patient-summary-row">
                    <span><strong>Total:</strong> {formatAmount(selectedPatient.total)}</span>
                  </div>
                  <div className="patient-summary-row">
                    <span>
                      <strong>Pagado:</strong> {formatAmount(selectedPatient.total_canceled)}
                    </span>
                  </div>
                </div>
              </div>
            </article>
            <Examen
              examId={selectedExam?.id}
              processedId={selectedExam?.processedId}
              onRegistered={handleExamRegistered}
            />
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export default History;
