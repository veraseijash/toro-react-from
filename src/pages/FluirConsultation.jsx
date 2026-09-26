import { useEffect, useRef, useState } from 'react';
import { getVisibleUsers } from '../services/userService';
import { getClients } from '../services/patientsService';
import '../styles/FluirConsultation.css';
import ConsultationTable from '../components/flow/ConsultationTable';

const formatDate = (value) => value.split('-').reverse().join('/');

export default function FluirConsultation() {
  const [filtersExpanded, setFiltersExpanded] = useState(true);
  const [patientName, setPatientName] = useState('');
  const [identityDocument, setIdentityDocument] = useState('');
  const [attendedBy, setAttendedBy] = useState('');
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [usersRetry, setUsersRetry] = useState(0);
  const [clientId, setClientId] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('');
  const [clients, setClients] = useState([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [clientsError, setClientsError] = useState('');
  const [clientsRetry, setClientsRetry] = useState(0);
  const [rangeOpen, setRangeOpen] = useState(false);
  const rangeInput = useRef(null);
  const [dates, setDates] = useState(() => {
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    return {
      from: `${month}-01`,
      to: `${month}-${String(today.getDate()).padStart(2, '0')}`,
    };
  });

  useEffect(() => {
    let active = true;
    setUsersLoading(true);
    setUsersError('');

    getVisibleUsers()
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response) ? response : response?.users ?? response?.data;
        if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
          throw new Error('Respuesta de usuarios no válida');
        }
        setUsers(rows);
      })
      .catch(() => {
        if (active) setUsersError('No se pudieron cargar los usuarios.');
      })
      .finally(() => {
        if (active) setUsersLoading(false);
      });

    return () => { active = false; };
  }, [usersRetry]);

  useEffect(() => {
    let active = true;
    setClientsLoading(true);
    setClientsError('');

    getClients()
      .then((response) => {
        if (!active) return;
        const rows = Array.isArray(response) ? response : response?.clients ?? response?.data;
        if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
          throw new Error('Respuesta de clientes no válida');
        }
        setClients(rows);
      })
      .catch(() => {
        if (active) setClientsError('No se pudieron cargar los clientes.');
      })
      .finally(() => {
        if (active) setClientsLoading(false);
      });

    return () => { active = false; };
  }, [clientsRetry]);

  return (
    <div className="dashboard-content consultation-page">
      <h1>Consulta de movimientos</h1>
      <div className="card w-100 overflow-visible consultation-filters-card">
        <button
          type="button"
          className="consultation-collapse-toggle"
          aria-label={filtersExpanded ? 'Contraer filtros' : 'Expandir filtros'}
          title={filtersExpanded ? 'Contraer filtros' : 'Expandir filtros'}
          aria-expanded={filtersExpanded}
          aria-controls="consultation-filters"
          onClick={() => {
            setFiltersExpanded((expanded) => !expanded);
            setRangeOpen(false);
          }}
        >
          <span className={`ico ico-lg ${filtersExpanded ? 'ico-chevron-up1' : 'ico-chevron-down1'}`} aria-hidden="true" />
        </button>
        <div className="card-body pe-5" id="consultation-filters" hidden={!filtersExpanded}>
          <div className="row g-3">
            <div className="col-12 col-md-6 col-xl-3">
              <div
                className="position-relative"
                onBlur={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget)) setRangeOpen(false);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setRangeOpen(false);
                    rangeInput.current?.focus();
                  }
                }}
              >
                <label className="form-label" htmlFor="consultation-range">Período:</label>
                <div className="position-relative">
                <input
                  ref={rangeInput}
                  id="consultation-range"
                  type="text"
                  className="form-control pe-5"
                  readOnly
                  value={`${formatDate(dates.from)} – ${formatDate(dates.to)}`}
                  aria-haspopup="dialog"
                  aria-expanded={rangeOpen}
                  aria-controls={rangeOpen ? 'consultation-date-range' : undefined}
                  onClick={() => setRangeOpen((open) => !open)}
                  onKeyDown={(event) => {
                    if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
                      event.preventDefault();
                      setRangeOpen(true);
                    }
                  }}
                />
                <span
                  className="ico ico-calendar-o position-absolute top-50 end-0 translate-middle-y me-3 pe-none"
                  aria-hidden="true"
                />
                </div>
                {rangeOpen && (
                  <div
                    id="consultation-date-range"
                    role="dialog"
                    aria-label="Seleccionar rango de fechas"
                    className="card position-absolute start-0 top-100 w-100 mt-1 shadow z-3"
                  >
                    <div className="card-body">
                      <label className="form-label" htmlFor="consultation-from">Desde</label>
                      <input
                        id="consultation-from"
                        type="date"
                        className="form-control mb-3"
                        value={dates.from}
                        max={dates.to}
                        onChange={(event) => {
                          const from = event.target.value;
                          if (from && from <= dates.to) setDates((current) => ({ ...current, from }));
                        }}
                      />
                      <label className="form-label" htmlFor="consultation-to">Hasta</label>
                      <input
                        id="consultation-to"
                        type="date"
                        className="form-control mb-3"
                        value={dates.to}
                        min={dates.from}
                        onChange={(event) => {
                          const to = event.target.value;
                          if (to && to >= dates.from) setDates((current) => ({ ...current, to }));
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-primary w-100"
                        onClick={() => {
                          setRangeOpen(false);
                          rangeInput.current?.focus();
                        }}
                      >Listo</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="mb-3">
                <label className="form-label" htmlFor="consultation-patient-name">Nombre del paciente</label>
                <input
                  id="consultation-patient-name"
                  type="text"
                  className="form-control"
                  value={patientName}
                  onChange={(event) => setPatientName(event.target.value)}
                />
              </div>
              <div>
                <label className="form-label" htmlFor="consultation-identity-document">Documento de identidad</label>
                <input
                  id="consultation-identity-document"
                  type="text"
                  className="form-control"
                  value={identityDocument}
                  onChange={(event) => setIdentityDocument(event.target.value)}
                />
              </div>
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <label className="form-label" htmlFor="consultation-attended-by">Atendido por</label>
              <select
                id="consultation-attended-by"
                className="form-select"
                value={attendedBy}
                disabled={usersLoading || Boolean(usersError)}
                aria-busy={usersLoading}
                onChange={(event) => setAttendedBy(event.target.value)}
              >
                <option value="">{usersLoading ? 'Cargando usuarios...' : usersError ? 'Usuarios no disponibles' : 'Todos'}</option>
                {users.map((user) => (
                  <option key={user.id ?? user.userId} value={user.id ?? user.userId}>{user.name}</option>
                ))}
              </select>
              {usersError && (
                <div className="mt-2">
                  <p role="alert" className="mb-2">{usersError}</p>
                  <button type="button" className="btn btn-secondary" onClick={() => setUsersRetry((current) => current + 1)}>
                    Reintentar
                  </button>
                </div>
              )}
            </div>
            <div className="col-12 col-md-6 col-xl-3">
              <div className="mb-3">
                <label className="form-label" htmlFor="consultation-client">Cliente</label>
                <select
                  id="consultation-client"
                  className="form-select"
                  value={clientId}
                  disabled={clientsLoading || Boolean(clientsError)}
                  aria-busy={clientsLoading}
                  onChange={(event) => setClientId(event.target.value)}
                >
                  <option value="">{clientsLoading ? 'Cargando clientes...' : clientsError ? 'Clientes no disponibles' : 'Todos'}</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.business_name ?? client.name}</option>
                  ))}
                </select>
                {clientsError && (
                  <div className="mt-2">
                    <p role="alert" className="mb-2">{clientsError}</p>
                    <button type="button" className="btn btn-secondary" onClick={() => setClientsRetry((current) => current + 1)}>
                      Reintentar
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="form-label" htmlFor="consultation-payment-status">Estado</label>
                <select
                  id="consultation-payment-status"
                  className="form-select"
                  value={paymentStatus}
                  onChange={(event) => setPaymentStatus(event.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="cancelados">Cancelados</option>
                  <option value="pendientes">Pendientes</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConsultationTable filters={{
        firstDate: dates.from,
        lastDate: dates.to,
        namePatient: patientName.trim(),
        ciPatient: identityDocument.trim(),
        userSelection: attendedBy,
        clientSelection: clientId,
        clientSelectionStatus: paymentStatus === 'cancelados' ? 1 : paymentStatus === 'pendientes' ? 0 : '',
      }} />
    </div>
  );
}
