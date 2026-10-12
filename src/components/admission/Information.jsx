import { useEffect, useState } from 'react';
import { getSampletypes, getClients, getLaboratory, getPatientsCI } from '../../services/admissionService';

const getRows = (response, key) => {
  const rows = Array.isArray(response) ? response : response?.[key] ?? response?.data;
  if (response?.success === false || response?.error || !Array.isArray(rows)) throw new Error('Respuesta inválida');
  return rows;
};

const getPhoneDigits = (value, mask) => {
  const phone = String(value ?? '').trim();
  const capacity = [...mask].filter((char) => char === '#').length;
  if (!capacity) return '';
  const pattern = [...mask].map((char) => char === '#'
    ? '(\\d|_)'
    : char.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('');
  const match = phone.match(new RegExp(`^${pattern}$`));
  if (match) return match.slice(1).join('').replace(/\D/g, '').slice(0, capacity);

  const firstSlot = mask.indexOf('#');
  const lastSlot = mask.lastIndexOf('#');
  const fixedPrefix = mask.slice(0, firstSlot).trim();
  const fixedSuffix = mask.slice(lastSlot + 1).trim();
  let editable = phone;
  if (fixedPrefix && editable.startsWith(fixedPrefix)) editable = editable.slice(fixedPrefix.length).trimStart();
  if (fixedSuffix && editable.endsWith(fixedSuffix)) editable = editable.slice(0, -fixedSuffix.length).trimEnd();
  let digits = editable.replace(/\D/g, '');
  const prefix = mask.slice(0, firstSlot).replace(/\D/g, '');
  const suffix = mask.slice(lastSlot + 1).replace(/\D/g, '');
  if (editable === phone && digits.length > capacity && prefix && digits.startsWith(prefix)) digits = digits.slice(prefix.length);
  if (editable === phone && digits.length > capacity && suffix && digits.endsWith(suffix)) digits = digits.slice(0, -suffix.length);
  return digits.slice(0, capacity);
};

function Information({ onClientChange, tariffError }) {
  const [fields, setFields] = useState({ name: '', email: '', suggested: '', address: '', observation: '' });
  const [sendEmail, setSendEmail] = useState(true);
  const [ageUnit, setAgeUnit] = useState('Años');
  const [age, setAge] = useState(1);
  const [birthdate, setBirthdate] = useState('');
  const [ageMenuOpen, setAgeMenuOpen] = useState(false);
  const [sampletypes, setSampletypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState({});
  const [identity, setIdentity] = useState('');
  const [documentType, setDocumentType] = useState('V');
  const [sex, setSex] = useState('Femenino');
  const [sample, setSample] = useState('Tomada aquí');
  const [sampletypeId, setSampletypeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMessage, setSearchMessage] = useState('');
  const [searchError, setSearchError] = useState('');

  const searchPatient = async () => {
    if (!identity || searching || loading) return;
    setSearching(true);
    setSearchMessage('');
    setSearchError('');
    try {
      const response = await getPatientsCI(identity.replace(/\B(?=(\d{3})+(?!\d))/g, '.'));
      if (response?.success === false || response?.error) throw new Error('Búsqueda fallida');
      const data = response?.patient ?? response?.patients ?? response?.data ?? response;
      const patient = Array.isArray(data) ? data[0] : data;
      if (!patient || typeof patient !== 'object' || !('name' in patient)) {
        setSearchMessage('No se encontró un paciente con ese documento.');
        return;
      }
      setFields({
        name: String(patient.name ?? ''),
        email: String(patient.email ?? ''),
        suggested: String(patient.suggested ?? patient.suggested_by ?? ''),
        address: String(patient.address ?? ''),
        observation: String(patient.observation ?? ''),
      });
      setDocumentType(patient.verification_code === 'E' ? 'E' : 'V');
      setIdentity(String(patient.document_number ?? identity).replace(/\D/g, ''));
      setSex(Number(patient.sex) === 1 || patient.sex === 'Masculino' ? 'Masculino' : 'Femenino');
      setSample(patient.sample === 'Referida' ? 'Referida' : 'Tomada aquí');
      const sampletype = sampletypes.find((item) => (item.description ?? item.name) === patient.sample_type);
      setSampletypeId(String(patient.sample_type_id ?? patient.sampletype_id ?? sampletype?.id ?? sampletypes[0]?.id ?? ''));
      const patientClientId = String(patient.client_id ?? patient.client?.id ?? clients[0]?.id ?? '');
      setClientId(patientClientId);
      onClientChange?.(patientClientId);
      const emailFlag = patient.send_email ?? patient.send_results_email;
      setSendEmail(emailFlag == null ? Boolean(patient.email) : emailFlag === true || Number(emailFlag) === 1);
      setPhoneDigits(getPhoneDigits(patient.phone, phoneMask));
      const date = String(patient.birthdate ?? patient.birth_date ?? patient.date_birth ?? '').slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && date <= maxBirthdate) {
        updateBirthdate({ target: { value: date, validity: { valid: true } } });
      } else {
        setBirthdate('');
        setAge(patient.age ?? '');
        setAgeUnit(['Años', 'Meses', 'Días'].find((unit) => unit.toLowerCase() === String(patient.month_year ?? '').toLowerCase()) ?? 'Años');
      }
    } catch {
      setSearchError('No se pudo consultar el paciente. Intenta nuevamente.');
    } finally {
      setSearching(false);
    }
  };
  const [phoneMask, setPhoneMask] = useState('');
  const [phoneDigits, setPhoneDigits] = useState('');
  const phoneSlots = [...phoneMask].flatMap((char, index) => char === '#' ? [index] : []);
  let phoneIndex = 0;
  const phoneValue = [...phoneMask].map((char) => char === '#' ? phoneDigits[phoneIndex++] ?? '_' : char).join('');

  const editPhone = (input, inserted = '', deletion = '') => {
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? start;
    let from = phoneSlots.filter((position) => position < start).length;
    let to = phoneSlots.filter((position) => position < end).length;
    if (start === end && deletion === 'backward') from = Math.max(0, from - 1);
    if (start === end && deletion === 'forward') to = Math.min(phoneSlots.length, to + 1);
    const digits = inserted.replace(/\D/g, '');
    const next = (phoneDigits.slice(0, from) + digits + phoneDigits.slice(to)).slice(0, phoneSlots.length);
    setPhoneDigits(next);
    const caret = phoneSlots[Math.min(from + digits.length, next.length)] ?? phoneMask.length;
    requestAnimationFrame(() => input.setSelectionRange(caret, caret));
  };

  const updateBirthdate = (event) => {
    const value = event.target.value;
    setBirthdate(value);
    if (!value || !event.target.validity.valid) {
      setAge('');
      return;
    }
    const [year, month, day] = value.split('-').map(Number);
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1;
    const currentDay = today.getDate();
    const months = (currentYear - year) * 12 + currentMonth - month - (currentDay < day ? 1 : 0);
    if (months >= 12) {
      setAge(Math.floor(months / 12));
      setAgeUnit('Años');
    } else if (months >= 1) {
      setAge(months);
      setAgeUnit('Meses');
    } else {
      const days = Math.round((Date.UTC(currentYear, currentMonth - 1, currentDay) - Date.UTC(year, month - 1, day)) / 86400000);
      setAge(days);
      setAgeUnit('Días');
    }
    setAgeMenuOpen(false);
  };

  const today = new Date();
  const maxBirthdate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([getSampletypes(), getClients(), getLaboratory()]);
      if (!active) return;
      const failures = {};
      results.forEach((result, index) => {
        const key = ['sampletypes', 'clients', 'laboratory'][index];
        try {
          if (result.status === 'rejected') throw result.reason;
          if (index === 2) {
            const data = result.value?.laboratory ?? result.value?.data ?? result.value;
            if (result.value?.success === false || result.value?.error || typeof data?.mask_phone !== 'string' || !data.mask_phone.includes('#')) throw new Error('Máscara inválida');
            setPhoneMask(data.mask_phone);
            return;
          }
          const rows = getRows(result.value, key);
          if (index === 0) {
            setSampletypes(rows);
            setSampletypeId(String(rows[0]?.id ?? ''));
          } else {
            setClients(rows);
            setClientId(String(rows[0]?.id ?? ''));
          }
        } catch {
          failures[key] = ['No se pudieron cargar los tipos de muestra.', 'No se pudieron cargar los referidos.', 'No se pudo cargar la plantilla de teléfono.'][index];
        }
      });
      setErrors(failures);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const textField = (name, label, maxLength, multiline = false, type = 'text') => {
    const Control = multiline ? 'textarea' : 'input';
    return (
      <div>
        {(name === 'name' || name === 'suggested' || multiline) && <label className="form-label" htmlFor={`admission-${name}`}>{label}</label>}
        <Control className="form-control" id={`admission-${name}`} name={name}
          aria-label={label} placeholder={name === 'name' || name === 'suggested' || multiline ? 'Escriba...' : label} type={multiline ? undefined : type}
          rows={multiline ? 5 : undefined} maxLength={maxLength} value={fields[name]}
          onChange={(event) => setFields((current) => ({ ...current, [name]: event.target.value }))} />
        <small className="admission-counter">{fields[name].length} / {maxLength}</small>
      </div>
    );
  };

  return (
    <div className="admission-patient-grid">
      <div className="admission-patient-column">
        {textField('name', 'Nombre y apellidos del paciente', 100)}
        <div className="input-group">
          <select className="form-select admission-document-type" aria-label="Tipo de documento" value={documentType} onChange={(event) => setDocumentType(event.target.value)}>
            <option>V</option><option>E</option>
          </select>
          <input className="form-control" name="identity" aria-label="Documento de identidad" placeholder="Documento de identidad"
            inputMode="numeric" value={identity.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
            disabled={searching}
            onChange={(event) => {
              setIdentity(event.target.value.replace(/\D/g, ''));
              setSearchMessage('');
              setSearchError('');
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                searchPatient();
              }
            }} />
          <button className="btn btn-primary" type="button" aria-label="Buscar paciente" disabled={!identity || searching || loading} onClick={searchPatient}>
            {searching ? <span className="spinner-border spinner-border-sm" aria-hidden="true" /> : <span className="ico ico-search1" aria-hidden="true"></span>}
          </button>
        </div>
        {searching && <small role="status">Buscando paciente...</small>}
        {searchMessage && <small role="status">{searchMessage}</small>}
        {searchError && <small className="text-danger" role="alert">{searchError}</small>}
        <div className="admission-demographics">
          <div>
            <label className="form-label" htmlFor="admission-birthdate">Fecha nacimiento</label>
            <input className="form-control" id="admission-birthdate" name="birthdate" type="date" max={maxBirthdate} value={birthdate} onChange={updateBirthdate} />
          </div>
          <div>
            <label className="form-label" htmlFor="admission-age">Edad</label>
            <div className="input-group admission-age-group"
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setAgeMenuOpen(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setAgeMenuOpen(false);
                  event.currentTarget.querySelector('.dropdown-toggle')?.focus();
                }
              }}>
              <input className="form-control" id="admission-age" name="age" type="number" min={1} step={1} value={age} onChange={(event) => setAge(event.target.value)} />
              <button className="btn btn-primary dropdown-toggle" type="button" aria-expanded={ageMenuOpen} aria-controls="admission-age-options" aria-label={`Unidad de edad: ${ageUnit}`} onClick={() => setAgeMenuOpen((open) => !open)}>{ageUnit}</button>
              <ul id="admission-age-options" className={`dropdown-menu${ageMenuOpen ? ' show' : ''}`}>
                {['Años', 'Meses', 'Días'].map((unit) => <li key={unit}><button type="button" className={`dropdown-item${ageUnit === unit ? ' active' : ''}`} onClick={(event) => {
                  setAgeUnit(unit);
                  setAgeMenuOpen(false);
                  event.currentTarget.closest('.input-group').querySelector('.dropdown-toggle')?.focus();
                }}>{unit}</button></li>)}
              </ul>
            </div>
          </div>
          <div>
            <label className="form-label" htmlFor="admission-sex">Sexo</label>
            <select className="form-select" id="admission-sex" name="sex" value={sex} onChange={(event) => setSex(event.target.value)}><option>Femenino</option><option>Masculino</option></select>
          </div>
        </div>
        <div className="admission-phone">
          <label className="form-label" htmlFor="admission-phone">Teléfono</label>
          <input className="form-control" id="admission-phone" name="phone" type="tel" inputMode="numeric"
            value={phoneValue} disabled={loading || !phoneMask} placeholder={loading ? 'Cargando...' : 'Escriba...'}
            onBeforeInput={(event) => {
              const native = event.nativeEvent;
              if (native.inputType === 'insertText' && native.data) {
                event.preventDefault();
                editPhone(event.currentTarget, native.data);
              }
            }}
            onKeyDown={(event) => {
              if (event.ctrlKey || event.metaKey || event.altKey) return;
              if (event.key === 'Backspace' || event.key === 'Delete') {
                event.preventDefault();
                editPhone(event.currentTarget, '', event.key === 'Backspace' ? 'backward' : 'forward');
              } else if (event.key.length === 1) {
                event.preventDefault();
                if (/\d/.test(event.key)) editPhone(event.currentTarget, event.key);
              }
            }}
            onPaste={(event) => {
              event.preventDefault();
              editPhone(event.currentTarget, event.clipboardData.getData('text'));
            }}
            onChange={(event) => {
              setPhoneDigits(phoneSlots.map((position) => event.target.value[position]).filter((char) => /\d/.test(char ?? '')).join(''));
            }} />
          {errors.laboratory && <small className="text-danger" role="alert">{errors.laboratory}</small>}
        </div>
        <div className="admission-samples">
          <div>
            <label className="form-label" htmlFor="admission-sample">Muestra</label>
            <select className="form-select" id="admission-sample" name="sample" value={sample} onChange={(event) => setSample(event.target.value)}><option>Tomada aquí</option><option>Referida</option></select>
          </div>
          <div>
            <label className="form-label" htmlFor="admission-sampletype">Tipo de muestra</label>
            <select className="form-select" id="admission-sampletype" name="sampletype" value={sampletypeId} onChange={(event) => setSampletypeId(event.target.value)} disabled={loading || Boolean(errors.sampletypes) || !sampletypes.length}>
              {(loading || !sampletypes.length) && <option>{loading ? 'Cargando...' : 'Sin tipos de muestra disponibles'}</option>}
              {sampletypes.map((sample) => <option key={sample.id} value={sample.id}>{sample.description ?? sample.name}</option>)}
            </select>
            {errors.sampletypes && <small className="text-danger" role="alert">{errors.sampletypes}</small>}
          </div>
        </div>
        {textField('address', 'Domicilio', 250, true)}
      </div>
      <div className="admission-patient-column">
        <div>
        <div className="form-check mb-2">
          <input className="form-check-input" type="checkbox" id="admission-send-email" checked={sendEmail} onChange={(event) => setSendEmail(event.target.checked)} />
          <label className="form-check-label" htmlFor="admission-send-email">Enviar resultados por Email</label>
        </div>
        {sendEmail && textField('email', 'Escriba...', 100, false, 'email')}
        </div>
        {textField('suggested', 'Sugerido por', 60)}
        <div>
          <label className="form-label" htmlFor="admission-client">Referido por</label>
          <select className="form-select" id="admission-client" name="client" value={clientId} onChange={(event) => {
            setClientId(event.target.value);
            onClientChange?.(event.target.value);
          }} disabled={loading || Boolean(errors.clients) || !clients.length}>
            {(loading || !clients.length) && <option>{loading ? 'Cargando...' : 'Sin referidos disponibles'}</option>}
            {clients.map((client) => <option key={client.id} value={client.id}>{client.business_name ?? client.name ?? client.description}</option>)}
          </select>
          {errors.clients && <small className="text-danger" role="alert">{errors.clients}</small>}
          {tariffError && <small className="text-danger" role="alert">{tariffError}</small>}
        </div>
        {textField('observation', 'Observación', 100, true)}
      </div>
    </div>
  );
}

export default Information;
