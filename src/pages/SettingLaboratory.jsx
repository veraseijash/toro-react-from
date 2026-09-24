import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { getLaboratory, updateLaboratory, uploadLaboratoryLogo } from '../services/laboratoryService';
import { IMAGES_BASE_URL } from '../config/appConfig';
import LaboratoryInvoice from '../components/setting/LaboratoryInvoice';
import '../styles/SettingLaboratory.css';

const TABS = [
  { id: 'logo', title: 'Logo' },
  { id: 'general', title: 'General' },
  { id: 'invoice', title: 'Factura / Toma de muestra' },
  { id: 'email', title: 'Envío por correo' },
];

function SettingLaboratory() {
  const [activeTab, setActiveTab] = useState('logo');
  const [laboratory, setLaboratory] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const fileInputRef = useRef(null);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const savingRef = useRef(false);
  const uploadedLogoRef = useRef(null);
  const [logoVersion, setLogoVersion] = useState(null);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview('');
      return undefined;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Selecciona un archivo de imagen.');
      return;
    }
    setLogoError('');
    setLogoFile(file);
  };

  const logoUrl = logoPreview || (laboratory?.logo
    ? `${IMAGES_BASE_URL.replace(/\/+$/, '')}/${String(laboratory.logo).replace(/^\/+/, '')}${logoVersion ? `?v=${logoVersion}` : ''}`
    : '');

  const handleRegister = async () => {
    if (savingRef.current || isLoading || !laboratory) return;
    savingRef.current = true;
    setIsSaving(true);
    setSaveError('');
    const payload = { ...laboratory };
    delete payload.id;

    const assertSuccess = (response, message) => {
      if (response?.success === false || response?.ok === false || response?.error
        || Number(response?.statusCode) >= 400 || Number(response?.status) >= 400) {
        throw new Error(message);
      }
    };

    try {
      if (logoFile) {
        if (uploadedLogoRef.current?.file !== logoFile) {
          const uploaded = await uploadLaboratoryLogo(logoFile);
          assertSuccess(uploaded, 'No fue posible subir el logo.');
          const result = uploaded?.data ?? uploaded;
          const filename = typeof result === 'string' ? result
            : result?.filename ?? result?.fileName ?? result?.file?.filename ?? result?.logo
              ?? result?.laboratory?.logo ?? uploaded?.filename ?? uploaded?.logo;
          if (typeof filename !== 'string' || !filename.trim()) {
            throw new Error('El servidor no devolvió el nombre de la imagen.');
          }
          uploadedLogoRef.current = { file: logoFile, filename };
        }
        payload.logo = uploadedLogoRef.current.filename;
        setLaboratory((current) => ({ ...current, logo: payload.logo }));
      }

      const response = await updateLaboratory(1, payload);
      assertSuccess(response, 'No fue posible actualizar la información del laboratorio.');
      if (logoFile) {
        setLogoVersion(Date.now());
        setLogoFile(null);
        uploadedLogoRef.current = null;
      }
      toast.success('La información del laboratorio fue registrada satisfactoriamente.');
    } catch (error) {
      setSaveError(error?.message || 'No fue posible registrar la información del laboratorio.');
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  useEffect(() => {
    let isActive = true;

    const loadLaboratory = async () => {
      try {
        const response = await getLaboratory();
        const data = response?.laboratory ?? response?.data ?? response;
        if (response?.success === false || response?.error || !data || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('Respuesta de laboratorio inválida.');
        }
        if (isActive) setLaboratory(data);
      } catch {
        if (isActive) setLoadError('No fue posible cargar la información del laboratorio.');
      } finally {
        if (isActive) setIsLoading(false);
      }
    };

    loadLaboratory();
    return () => { isActive = false; };
  }, []);

  const handleTabKeyDown = (event, index) => {
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % TABS.length;
    else if (event.key === 'ArrowLeft') nextIndex = (index + TABS.length - 1) % TABS.length;
    else if (event.key === 'Home') nextIndex = 0;
    else if (event.key === 'End') nextIndex = TABS.length - 1;
    else return;
    event.preventDefault();
    setActiveTab(TABS[nextIndex].id);
    event.currentTarget.closest('[role="tablist"]').querySelectorAll('[role="tab"]')[nextIndex].focus();
  };

  const renderGeneralField = (field, label, type = 'text') => (
    <div key={field}>
      <label className="form-label" htmlFor={`laboratory-${field}`}>{label}</label>
      <input
        className="form-control"
        id={`laboratory-${field}`}
        name={field}
        type={type}
        value={laboratory[field] ?? ''}
        onChange={(event) => setLaboratory((current) => ({ ...current, [field]: event.target.value }))}
      />
    </div>
  );

  return (
    <div className="dashboard-content setting-laboratory-page">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3 flex-shrink-0">
        <h1 className="mb-0">Laboratorio</h1>
        <button type="button" className="btn btn-primary flex-shrink-0"
          disabled={isLoading || !laboratory || isSaving} onClick={handleRegister}>
          {isSaving ? 'Registrando...' : 'Registrar'}
        </button>
      </div>
      {saveError && <p className="text-danger flex-shrink-0" role="alert">{saveError}</p>}
      <ul className="nav nav-tabs flex-shrink-0" role="tablist" aria-label="Configuración del laboratorio">
        {TABS.map((tab, index) => (
          <li className="nav-item" role="presentation" key={tab.id}>
            <button
              type="button"
              className={`nav-link${activeTab === tab.id ? ' active' : ''}`}
              id={`laboratory-tab-${tab.id}`}
              role="tab"
              aria-controls={`laboratory-panel-${tab.id}`}
              aria-selected={activeTab === tab.id}
              tabIndex={activeTab === tab.id ? 0 : -1}
              onClick={() => setActiveTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
            >
              {tab.title}
            </button>
          </li>
        ))}
      </ul>
      <div className="tab-content setting-laboratory-body pt-3" aria-busy={isLoading || isSaving} inert={isSaving ? true : undefined}>
        {isLoading && <p role="status">Cargando información del laboratorio...</p>}
        {loadError && <p className="text-danger" role="alert">{loadError}</p>}
        {TABS.map((tab) => (
          <div
            key={tab.id}
            className={`tab-pane h-100${activeTab === tab.id ? ' active' : ''}`}
            id={`laboratory-panel-${tab.id}`}
            role="tabpanel"
            aria-labelledby={`laboratory-tab-${tab.id}`}
            tabIndex={0}
          >
            {tab.id === 'invoice' && laboratory && (
              <LaboratoryInvoice laboratory={laboratory} setLaboratory={setLaboratory} />
            )}
            {tab.id === 'general' && laboratory && (
              <div className="setting-laboratory-general">
                <div className="border rounded p-3 mb-3">
                  <div className="row g-4">
                    <div className="col-12 col-md-6 d-flex flex-column gap-4">
                      {renderGeneralField('business_name', 'Razón social')}
                      <div>
                        <label className="form-label" htmlFor="laboratory-address">Domicilio</label>
                        <textarea
                          className="form-control"
                          id="laboratory-address"
                          name="address"
                          rows={3}
                          maxLength={200}
                          aria-describedby="laboratory-address-count"
                          value={laboratory.address ?? ''}
                          onChange={(event) => setLaboratory((current) => ({ ...current, address: event.target.value }))}
                        />
                        <div id="laboratory-address-count" className="text-secondary small text-end mt-1">
                          {String(laboratory.address ?? '').length} / 200
                        </div>
                      </div>
                      {renderGeneralField('email', 'Dirección de correo', 'email')}
                      {renderGeneralField('url', 'Ubicación página web', 'url')}
                    </div>
                    <div className="col-12 col-md-6 d-flex flex-column gap-4">
                      {renderGeneralField('name', 'Nombre')}
                      {renderGeneralField('rif', 'Registro fiscal')}
                      {renderGeneralField('phone_1', 'Teléfono (1)', 'tel')}
                      {renderGeneralField('phone_2', 'Teléfono (2)', 'tel')}
                      <div className="bg-danger text-white rounded p-3 shadow-sm">
                        <div className="small mb-1">Licencia</div>
                        <div className="fw-semibold text-break">{laboratory.license ?? ''}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border rounded p-3">
                  <div className="row">
                    <div className="col-12 col-md-6">
                      {renderGeneralField('mask_phone', 'Máscara de teléfono')}
                    </div>
                  </div>
                </div>
              </div>
            )}
            {tab.id === 'logo' && laboratory && (
              <div className="setting-laboratory-logo">
                <div className="setting-laboratory-logo-preview border rounded p-2">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Logo del laboratorio" style={{
                      maxHeight: `${Number(laboratory.max_height_logo) || 200}px`,
                      maxWidth: `min(100%, ${Number(laboratory.max_width_logo) || 200}px)`,
                    }} />
                  ) : <span className="text-body-secondary">Sin logo</span>}
                </div>
                <div className="setting-laboratory-logo-controls">
                  {[
                    ['max_height_logo', 'Max altura'],
                    ['max_width_logo', 'Max ancho'],
                  ].map(([field, label]) => {
                    const value = Number(laboratory[field]) || 200;
                    const maximum = Math.max(300, value);
                    return (
                      <div className="setting-laboratory-logo-range" key={field}>
                        <label className="form-label mb-0" htmlFor={`laboratory-${field}`}>{label}</label>
                        <input
                          id={`laboratory-${field}`}
                          className="form-range"
                          type="range"
                          min="1"
                          max={maximum}
                          step="1"
                          value={value}
                          style={{ '--range-progress': `${((value - 1) / (maximum - 1)) * 100}%` }}
                          onChange={(event) => setLaboratory((current) => ({ ...current, [field]: Number(event.target.value) }))}
                        />
                        <output className="text-secondary" htmlFor={`laboratory-${field}`}>{value}</output>
                      </div>
                    );
                  })}
                  <input ref={fileInputRef} type="file" accept="image/*" className="d-none" onChange={handleLogoChange} />
                  <button type="button" className="btn btn-outline-primary d-inline-flex align-items-center gap-2"
                    onClick={() => fileInputRef.current?.click()}>
                    <span className="ico ico-edit1" aria-hidden="true"></span>
                    Buscar imagen
                  </button>
                  {logoError && <p className="text-danger mt-2 mb-0" role="alert">{logoError}</p>}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default SettingLaboratory;
