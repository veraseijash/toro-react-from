import { useEffect, useState } from 'react';
import { getClient } from '../services/admissionService';
import Information from '../components/admission/Information';
import ExamsList from '../components/admission/ExamsList';
import MethodPayment from '../components/admission/MethodPayment';
import useAdmissionTotals from '../components/admission/useAdmissionTotals';
import '../styles/Admission.css';

const TABS = [
  { id: 'patient', label: 'Información del paciente' },
  { id: 'exams', label: 'Seleccionar exámenes' },
  { id: 'payment', label: 'Forma de pago' },
  { id: 'register', label: 'Registrar' },
];

function Admission() {
  const [activeTab, setActiveTab] = useState(TABS[0].id);
  const [tariff, setTariff] = useState('1');
  const totals = useAdmissionTotals(tariff);
  const [clientId, setClientId] = useState('');
  const [tariffError, setTariffError] = useState('');

  useEffect(() => {
    if (!clientId) return;
    let active = true;
    const loadTariff = async () => {
      setTariffError('');
      try {
        const response = await getClient(clientId);
        const client = response?.client ?? response?.data ?? response;
        const value = Number(client?.tariff);
        if (response?.success === false || response?.error || !Number.isInteger(value) || value < 1 || value > 6) throw new Error('Tarifa inválida');
        if (active) setTariff(String(value));
      } catch {
        if (active) setTariffError('No se pudo cargar la tarifa del cliente.');
      }
    };
    loadTariff();
    return () => { active = false; };
  }, [clientId]);

  const handleTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    document.getElementById(`admission-tab-${TABS[nextIndex].id}`)?.focus();
  };

  return (
    <div className="dashboard-content admission-page">
      <h1>Admisión de paciente</h1>
      <ul className="nav nav-pills" role="tablist" aria-label="Admisión de paciente">
        {TABS.map((tab, index) => (
          <li className="nav-item" role="presentation" key={tab.id}>
            <button
              type="button"
              className={`nav-link${activeTab === tab.id ? ' active' : ''}`}
              id={`admission-tab-${tab.id}`}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`admission-panel-${tab.id}`}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.label}
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-content">
        {TABS.map((tab) => (
          <div
            key={tab.id}
            id={`admission-panel-${tab.id}`}
            className={`tab-pane${activeTab === tab.id ? ' active' : ''}${tab.id === 'exams' ? ' admission-exams-panel' : ''}`}
            role="tabpanel"
            aria-labelledby={`admission-tab-${tab.id}`}
            hidden={activeTab !== tab.id}
            tabIndex={0}
          >
            {tab.id === 'patient' && <Information onClientChange={setClientId} tariffError={tariffError} />}
            {tab.id === 'exams' && <ExamsList tariff={tariff} onTariffChange={setTariff} totals={totals} />}
            {tab.id === 'payment' && <MethodPayment totals={totals} />}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Admission;
