import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Tooltip } from 'bootstrap';
import femaleAvatar from '../../assets/images/patient-female.svg';
import maleAvatar from '../../assets/images/patient-male.svg';

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
  selectedPatientId,
}) {
  const listRef = useRef(null);
  const [openExamsId, setOpenExamsId] = useState(null);
  const [examsMenuPosition, setExamsMenuPosition] = useState(null);
  const [openActionsId, setOpenActionsId] = useState(null);
  const [actionsMenuPosition, setActionsMenuPosition] = useState(null);

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
        const avatar = Number(patient.sex) === 1 ? maleAvatar : femaleAvatar;
        const patientId = patient.id;
        const examsDropdownId = patientId ?? `patient-${index}`;
        const isSelected = String(patientId) === String(selectedPatientId);
        const isExamsOpen = openExamsId === examsDropdownId;
        const isActionsOpen = openActionsId === examsDropdownId;

        const selectPatient = () => {
          if (patientId != null) onSelectPatient?.(patientId);
        };

        return (
          <article
            className={`card patient-card${isSelected ? ' patient-card-selected' : ''}`}
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
                            className="patient-exam-item"
                            key={exam.id ?? `${exam.description}-${examIndex}`}
                            onClick={() => {
                              selectPatient();
                              if (exam.id != null) onSelectExam?.(exam.id, exam.processed_id);
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

              <div
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
                    className="dropdown-menu dropdown-menu-end patient-actions-menu show"
                    style={{
                      position: 'fixed',
                      inset: 'auto',
                      right: actionsMenuPosition.right,
                      top: actionsMenuPosition.top,
                    }}
                  >
                    <li><button type="button" className="dropdown-item">Imprimir resultados</button></li>
                    <li><button type="button" className="dropdown-item">Imprimir comprobante</button></li>
                    <li><button type="button" className="dropdown-item">Imprimir toma de muestra</button></li>
                    <li><hr className="dropdown-divider" /></li>
                    <li><button type="button" className="dropdown-item">Factura</button></li>
                    <li><button type="button" className="dropdown-item">Crear PDF</button></li>
                  </ul>,
                  document.body,
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default List;
