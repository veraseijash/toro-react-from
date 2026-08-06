import { useEffect, useRef } from 'react';
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

function List({ patients = [] }) {
  const listRef = useRef(null);

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

  if (patients.length === 0) {
    return <p className="patient-list-empty">No hay pacientes para esta fecha.</p>;
  }

  return (
    <div className="patient-list scrollbar-thin" ref={listRef}>
      {patients.map((patient, index) => {
        const isUrgent = Number(patient.urgent) === 1;
        const avatar = Number(patient.sex) === 1 ? maleAvatar : femaleAvatar;

        return (
          <article
            className="card patient-card"
            key={patient.id ?? patient.admission ?? `${patient.name}-${index}`}
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
                <div className={`patient-detail ${isUrgent ? 'text-warning' : 'text-gray-500'}`}>
                  <span
                    className={`ico ico-alert-triangle patient-urgent-icon${isUrgent ? '' : ' not-urgent'}`}
                    aria-hidden="true"
                  />
                  <span className={isUrgent ? '' : 'patient-urgent-label-not-active'}>
                    Urgente
                  </span>
                </div>
              </div>

              <span className="ico ico-more-horizontal patient-card-more" aria-hidden="true" />
            </div>
          </article>
        );
      })}
    </div>
  );
}

export default List;
