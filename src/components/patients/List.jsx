import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'bootstrap';
import { toast } from 'react-toastify';
import femaleAvatar from '../../assets/images/patient-female.svg';
import maleAvatar from '../../assets/images/patient-male.svg';
import useAuth from '../../context/useAuth';
import { hasPermission } from '../../utils/permissions';
import { getUserSession } from '../../services/userService';
import { updatePatient } from '../../services/patientsService';

const formatAdmissionTime = (admissionTime) => {
  if (!admissionTime) return '';

  const match = String(admissionTime).match(/(?:T|^)(\d{1,2}):(\d{2})/);
  if (!match) return admissionTime;

  const hours = Number(match[1]);
  if (hours > 23) return admissionTime;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours % 12 || 12;
  return `${hours12}:${match[2]} ${period}`;
};

const getExamStatusClass = (exam) => {
  if (exam.result == null) return 'patient-exam-status-pending';
  if (Number(exam.approved_id) > 0) return 'patient-exam-status-approved';
  if (Number(exam.processed_id) > 0 && Number(exam.approved_id) === 0) {
    return 'patient-exam-status-processed';
  }
  return 'patient-exam-status-pending';
};

function List({
  patients = [],
  onSelectPatient,
  onSelectExam,
  onClearExam,
  onPrintResults,
  onPatientAnnulled,
  selectedPatientId,
}) {
  const { session } = useAuth();
  const listRef = useRef(null);
  const actionsMenuRef = useRef(null);
  const [openExamsId, setOpenExamsId] = useState(null);
  const [examsMenuPosition, setExamsMenuPosition] = useState(null);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState(null);
  const [annulPatientId, setAnnulPatientId] = useState(null);
  const [annulCredentials, setAnnulCredentials] = useState({
    userName: '',
    password: '',
  });
  const [annulErrors, setAnnulErrors] = useState({});
  const [isAnnullingPatient, setIsAnnullingPatient] = useState(false);

  useLayoutEffect(() => {
    if (!openActionsId || !actionsMenuPosition || !actionsMenuRef.current) return;

    const menuHeight = actionsMenuRef.current.getBoundingClientRect().height;
    const wouldOverflowBelow = actionsMenuPosition.buttonBottom + menuHeight > window.innerHeight - 8;

    setActionsMenuPosition((position) => {
      const shouldOpenAbove = wouldOverflowBelow && position.buttonTop > menuHeight;
      const nextTop = shouldOpenAbove ? undefined : position.buttonBottom + 4;
      const nextBottom = shouldOpenAbove
        ? window.innerHeight - position.buttonTop + 4
        : undefined;

      if (position.top === nextTop && position.bottom === nextBottom) return position;
      return { ...position, top: nextTop, bottom: nextBottom };
    });
  }, [openActionsId, actionsMenuPosition]);

  const closeAnnulModal = () => {
    setAnnulPatientId(null);
    setAnnulCredentials({ userName: '', password: '' });
    setAnnulErrors({});
    setIsAnnullingPatient(false);
  };

  const openAnnulModal = (patientId) => {
    const canAnnulPatient = hasPermission(
      session?.user?.permissions,
      'annul-patient',
    );

    setAnnulPatientId(patientId);
    setAnnulCredentials({
      userName: canAnnulPatient
        ? session?.user?.user_name ?? session?.user?.username ?? ''
        : '',
      password: '',
    });
    setAnnulErrors({});
    setOpenActionsId(null);
  };

  const handleAnnulPatient = async (event) => {
    event.preventDefault();

    const userName = annulCredentials.userName.trim();
    const password = annulCredentials.password;
    const validationErrors = {};

    if (!userName) validationErrors.userName = 'Ingresa el nombre de usuario.';
    if (!password.trim()) validationErrors.password = 'Ingresa la contraseña.';

    if (Object.keys(validationErrors).length > 0) {
      setAnnulErrors(validationErrors);
      return;
    }

    setAnnulErrors({});
    setIsAnnullingPatient(true);

    try {
      const sessionResponse = await getUserSession({
        user_name: userName,
        password,
      });
      const authenticatedUser = sessionResponse?.user;
      const authenticatedUserId = authenticatedUser?.id ?? authenticatedUser?.user_id;

      if (authenticatedUserId == null) {
        setAnnulErrors({ form: 'No fue posible validar la información del usuario.' });
        return;
      }

      if (!hasPermission(authenticatedUser.permissions, 'annul-patient')) {
        setAnnulErrors({ form: 'El usuario no tiene permisos para anular pacientes.' });
        return;
      }

      const cancellationData = {
        canceled: 1,
        cancellation_date: new Date().toISOString(),
        user_id_canceled: authenticatedUserId,
      };
      const response = await updatePatient(annulPatientId, cancellationData);
      const updatedPatient = response?.patient ?? response?.data ?? response;

      onPatientAnnulled?.(
        annulPatientId,
        updatedPatient && typeof updatedPatient === 'object'
          ? { ...cancellationData, ...updatedPatient }
          : cancellationData,
      );
      toast.success('Paciente anulado correctamente.');
      closeAnnulModal();
    } catch (error) {
      const message = error.response?.data?.message
        ?? error.response?.data?.error
        ?? (error.response?.status === 401
          ? 'El nombre de usuario o la contraseña no son válidos.'
          : 'No fue posible anular el paciente. Intenta nuevamente.');
      setAnnulErrors({ form: message });
    } finally {
      setIsAnnullingPatient(false);
    }
  };

  useEffect(() => {
    const nameElements = listRef.current?.querySelectorAll('.patient-name') ?? [];
    const tooltips = Array.from(nameElements)
      .filter((element) => element.scrollWidth > element.clientWidth)
      .map((element) => {
        element.setAttribute('data-bs-toggle', 'tooltip');
        return new Tooltip(element, { placement: 'top' });
      });

    return () => tooltips.forEach((tooltip) => tooltip.dispose());
  }, [patients]);

  useEffect(() => {
    const closeExamsMenu = (event) => {
      if (!event.target.closest('.patient-exams-dropdown, .patient-exams-menu')) {
        setOpenExamsId(null);
      }
      if (!event.target.closest('.patient-card-actions, .patient-actions-menu')) {
        setOpenActionsId(null);
      }
    };

    document.addEventListener('mousedown', closeExamsMenu);
    return () => document.removeEventListener('mousedown', closeExamsMenu);
  }, []);

  if (patients.length === 0) {
    return <p className="patient-list-empty">No hay pacientes para esta fecha.</p>;
  }

  return (
    <div
      className="patient-list scrollbar-thin"
      ref={listRef}
      onScroll={() => {
        setOpenExamsId(null);
        setOpenActionsId(null);
      }}
    >
      {patients.map((patient, index) => {
        const isUrgent = Number(patient.urgent) === 1;
        const isCanceled = patient.canceled === true || Number(patient.canceled) === 1;
        const avatar = Number(patient.sex) === 1 ? maleAvatar : femaleAvatar;
        const patientId = patient.id ?? patient.patient_id ?? patient.patientId;
        const examsDropdownId = patientId ?? `patient-${index}`;
        const isSelected = String(patientId) === String(selectedPatientId);
        const isExamsOpen = openExamsId === examsDropdownId;
        const isActionsOpen = openActionsId === examsDropdownId;

        const selectPatient = () => {
          if (patientId != null) onSelectPatient?.(patientId);
        };

        return (
          <article
            className={`card patient-card${isSelected ? ' patient-card-selected' : ''}${isCanceled ? ' patient-card-canceled' : ''}`}
            key={patient.id ?? patient.admission ?? `${patient.name}-${index}`}
            role="button"
            tabIndex={0}
            aria-pressed={isSelected}
            onClick={(event) => {
              if (!event.target.closest('.patient-exams-dropdown, .patient-card-actions')) {
                if (!isSelected) onClearExam?.();
                selectPatient();
              }
            }}
            onKeyDown={(event) => {
              if (event.target.closest('.patient-exams-dropdown, .patient-card-actions')) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                if (!isSelected) onClearExam?.();
                selectPatient();
              }
            }}
          >
            <div className="card-body patient-card-body">
              {isCanceled && (
                <span
                  className="patient-canceled-icon text-warning"
                  aria-label="Paciente anulado"
                  title="Paciente anulado"
                >
                  <span className="ico ico-user-times" aria-hidden="true" />
                </span>
              )}
              <img
                className="patient-avatar"
                src={avatar}
                alt={Number(patient.sex) === 1 ? 'Paciente hombre' : 'Paciente mujer'}
              />

              <div className="patient-card-info">
                <strong className="patient-name" title={patient.name}>
                  {patient.name}
                </strong>
                <span className="patient-arrival-label">
                  Orden de llegada
                  <strong>{patient.patient_position}</strong>
                </span>
                <div className="patient-detail">
                  <span className="ico ico-clock" aria-hidden="true" />
                  <span>{formatAdmissionTime(patient.admission_time)}</span>
                </div>
                <div className="patient-urgent-row">
                  <div className={`patient-detail ${isUrgent ? 'text-warning' : 'text-gray-500'}`}>
                    <span
                      className={`ico ico-alert-triangle patient-urgent-icon${isUrgent ? '' : ' not-urgent'}`}
                      aria-hidden="true"
                    />
                    <span className={isUrgent ? '' : 'patient-urgent-label-not-active'}>
                      Urgente
                    </span>
                  </div>
                  <div
                    className="dropdown patient-exams-dropdown"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <button
                      className="btn btn-sm dropdown-toggle patient-exams-button"
                      type="button"
                      aria-expanded={isExamsOpen}
                      onClick={(event) => {
                        const buttonRect = event.currentTarget.getBoundingClientRect();
                        setExamsMenuPosition({
                          right: window.innerWidth - buttonRect.right,
                          bottom: window.innerHeight - buttonRect.top + 4,
                          maxHeight: Math.max(buttonRect.top - 12, 80),
                        });
                        setOpenExamsId((currentId) =>
                          currentId === examsDropdownId ? null : examsDropdownId,
                        );
                        setOpenActionsId(null);
                      }}
                    >
                      Exámenes
                    </button>
                    {isExamsOpen && examsMenuPosition && createPortal(
                      <ul
                        className="dropdown-menu dropdown-menu-end patient-exams-menu show"
                        style={{
                          position: 'fixed',
                          inset: 'auto',
                          right: examsMenuPosition.right,
                          bottom: examsMenuPosition.bottom,
                          maxHeight: examsMenuPosition.maxHeight,
                        }}
                      >
                        {(patient.exams ?? []).map((exam, examIndex) => (
                          <li
                            className={`patient-exam-item${isCanceled ? ' patient-exam-item-disabled' : ''}`}
                            key={exam.id ?? `${exam.description}-${examIndex}`}
                            aria-disabled={isCanceled}
                            onClick={() => {
                              if (isCanceled) return;
                              if (exam.id != null) onSelectExam?.(patient, exam);
                              setOpenExamsId(null);
                            }}
                          >
                            <span className="patient-exam-description">{exam.description}</span>
                            <span
                              className={`patient-exam-status ${getExamStatusClass(exam)}`}
                              aria-hidden="true"
                            />
                          </li>
                        ))}
                        {(patient.exams ?? []).length === 0 && (
                          <li className="patient-exam-item patient-exam-item-empty">Sin exámenes</li>
                        )}
                      </ul>,
                      document.body,
                    )}
                  </div>
                </div>
              </div>

              {!isCanceled && <div
                className="patient-card-actions"
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="patient-card-more"
                  aria-label="Opciones del paciente"
                  aria-expanded={isActionsOpen}
                  onClick={(event) => {
                    const buttonRect = event.currentTarget.getBoundingClientRect();
                    setActionsMenuPosition({
                      right: window.innerWidth - buttonRect.right,
                      top: buttonRect.bottom + 4,
                      bottom: undefined,
                      buttonTop: buttonRect.top,
                      buttonBottom: buttonRect.bottom,
                    });
                    setOpenActionsId((currentId) =>
                      currentId === examsDropdownId ? null : examsDropdownId,
                    );
                    setOpenExamsId(null);
                  }}
                >
                  <span className="ico ico-more-horizontal" aria-hidden="true" />
                </button>
                {isActionsOpen && actionsMenuPosition && createPortal(
                  <ul
                    ref={actionsMenuRef}
                    className="dropdown-menu dropdown-menu-end patient-actions-menu show"
                    style={{
                      position: 'fixed',
                      inset: 'auto',
                      right: actionsMenuPosition.right,
                      top: actionsMenuPosition.top,
                      bottom: actionsMenuPosition.bottom,
                    }}
                  >
                    <li><button
                      type="button"
                      className="dropdown-item"
                      onClick={() => {
                        if (patientId == null) {
                          toast.warning('Los exámenes reportados deben haber sido aprobados.');
                        } else {
                          onPrintResults?.(patientId);
                        }
                        setOpenActionsId(null);
                      }}
                    >
                      <span className="ico ico-printer2 me-2" aria-hidden="true" />
                      Imprimir resultados
                    </button></li>
                    <li><button type="button" className="dropdown-item">Imprimir comprobante</button></li>
                    <li><button type="button" className="dropdown-item">Imprimir toma de muestra</button></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button type="button" className="dropdown-item">Factura</button></li>
                    <li><button type="button" className="dropdown-item">Crear PDF</button></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button
                        type="button"
                        className="dropdown-item text-warning"
                        onClick={() => openAnnulModal(patientId)}
                      >
                        <span className="ico ico-user-times me-2" aria-hidden="true" />
                        Anular paciente
                      </button>
                    </li>
                  </ul>,
                  document.body,
                )}
              </div>}
            </div>
          </article>
        );
      })}

      {annulPatientId != null && createPortal(
        <>
          <div
            className="modal fade show"
            role="dialog"
            aria-modal="true"
            aria-labelledby="annul-patient-modal-title"
            style={{ display: 'block' }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h2 className="modal-title fs-5" id="annul-patient-modal-title">
                    Anular paciente por
                  </h2>
                  <button
                    type="button"
                    className="btn-close"
                    aria-label="Cerrar"
                    onClick={closeAnnulModal}
                  />
                </div>

                <form onSubmit={handleAnnulPatient} noValidate>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label" htmlFor="annul-patient-user-name">
                        Nombre de usuario
                      </label>
                      <input
                        className={`form-control${annulErrors.userName ? ' is-invalid' : ''}`}
                        id="annul-patient-user-name"
                        type="text"
                        autoComplete="username"
                        value={annulCredentials.userName}
                        onChange={(event) => {
                          setAnnulCredentials((credentials) => ({
                            ...credentials,
                            userName: event.target.value,
                          }));
                          setAnnulErrors((errors) => ({ ...errors, userName: undefined }));
                        }}
                      />
                      {annulErrors.userName && (
                        <label className="invalid-feedback d-block text-danger" htmlFor="annul-patient-user-name">
                          {annulErrors.userName}
                        </label>
                      )}
                    </div>

                    <div>
                      <label className="form-label" htmlFor="annul-patient-password">
                        Contraseña
                      </label>
                      <input
                        className={`form-control${annulErrors.password ? ' is-invalid' : ''}`}
                        id="annul-patient-password"
                        type="password"
                        autoComplete="current-password"
                        value={annulCredentials.password}
                        onChange={(event) => {
                          setAnnulCredentials((credentials) => ({
                            ...credentials,
                            password: event.target.value,
                          }));
                          setAnnulErrors((errors) => ({ ...errors, password: undefined }));
                        }}
                      />
                      {annulErrors.password && (
                        <label className="invalid-feedback d-block text-danger" htmlFor="annul-patient-password">
                          {annulErrors.password}
                        </label>
                      )}
                      {annulErrors.form && (
                        <label className="text-danger d-block mt-2" role="alert">
                          {annulErrors.form}
                        </label>
                      )}
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={closeAnnulModal}
                      disabled={isAnnullingPatient}
                    >
                      Cancelar
                    </button>
                    <button type="submit" className="btn btn-warning" disabled={isAnnullingPatient}>
                      {isAnnullingPatient ? 'Anulando...' : 'Anular'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
          <div className="modal-backdrop fade show" onClick={closeAnnulModal} />
        </>,
        document.body,
      )}
    </div>
  );
}

export default List;
