import { useEffect, useRef, useState } from 'react';
import { Modal } from 'bootstrap';
import { IMAGES_BASE_URL } from '../../config/appConfig';
import '../../styles/EditUser.css';

const ROLE_OPTIONS = ['admin', 'anular', 'user'];

const parseRoles = (value) => {
  if (typeof value === 'string') {
    try { return parseRoles(JSON.parse(value)); }
    catch { return value.split(',').map((role) => role.trim()).filter(Boolean); }
  }
  return Array.isArray(value)
    ? value.flatMap((role) => parseRoles(typeof role === 'string' ? role : role?.name ?? role?.description ?? ''))
    : [];
};

function ImageField({ label, path, circular, onChange }) {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!file) return undefined;
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const source = preview || (path ? `${IMAGES_BASE_URL}/${path}` : '');
  return (
    <div className="text-center">
      <div className="d-inline-flex align-items-end gap-2">
        <div className={`edit-user-image border border-warning ${circular ? 'rounded-circle' : 'edit-user-signature'}`}>
          {source ? <img src={source} alt={label} /> : <span className="small">{label}</span>}
        </div>
        <button type="button" data-edit-user-control aria-label={`Cambiar ${label.toLowerCase()}`}
          onClick={() => inputRef.current?.click()}>
          <span className="ico ico-edit text-primary fs-4" aria-hidden="true" />
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="d-none" aria-label={label}
          onChange={(event) => {
            const selected = event.target.files?.[0];
            event.target.value = '';
            if (!selected) return;
            if (!selected.type.startsWith('image/')) {
              setError('Selecciona un archivo de imagen.');
              return;
            }
            setError('');
            setFile(selected);
            onChange(selected);
          }} />
      </div>
      {error && <p className="text-danger small mt-2" role="alert">{error}</p>}
    </div>
  );
}

export default function EditUser({ user, onClose, onSave }) {
  const modalRef = useRef(null);
  const modalInstanceRef = useRef(null);
  const savingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [draft, setDraft] = useState(() => ({
    ...user,
    roles: [...new Set(parseRoles(user.roles))],
    password: '', passwordRepeat: '', passwordSignature: '', passwordSignatureRepeat: '',
    changePassword: false, changeSignaturePassword: false,
    request_password: Number(user.request_password) === 1,
    photoChanged: false, signatureChanged: false, photoFile: null, signatureFile: null,
  }));
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const update = (name, value) => {
    setDraft((current) => ({ ...current, [name]: value }));
    setErrors((current) => ({ ...current, [name]: '' }));
    setNotice('');
  };

  useEffect(() => {
    const element = modalRef.current;
    const modal = new Modal(element);
    modalInstanceRef.current = modal;
    const hidden = () => closeRef.current();
    const preventClose = (event) => { if (savingRef.current) event.preventDefault(); };
    element.addEventListener('hide.bs.modal', preventClose);
    element.addEventListener('hidden.bs.modal', hidden);
    modal.show();
    return () => {
      element.removeEventListener('hidden.bs.modal', hidden);
      element.removeEventListener('hide.bs.modal', preventClose);
      modal.hide();
      modal.dispose();
    };
  }, []);

  const field = (name, label, maxLength, type = 'text', multiline = false) => {
    const Control = multiline ? 'textarea' : 'input';
    return (
      <div>
        <label className="form-label" htmlFor={`edit-user-${name}`}>{label}</label>
        <Control id={`edit-user-${name}`} name={name} className={`form-control${errors[name] ? ' is-invalid' : ''}`}
          type={multiline ? undefined : type} rows={multiline ? 3 : undefined}
          autoComplete={type === 'password' ? 'new-password' : undefined}
          maxLength={maxLength} value={draft[name] ?? ''}
          aria-invalid={Boolean(errors[name])} aria-describedby={errors[name] ? `edit-user-${name}-error` : undefined}
          onChange={(event) => update(name, event.target.value)} />
        {maxLength && <div className="small text-end mt-1">{String(draft[name] ?? '').length} / {maxLength}</div>}
        {errors[name] && <label htmlFor={`edit-user-${name}`} id={`edit-user-${name}-error`} className="edit-user-error">{errors[name]}</label>}
      </div>
    );
  };

  const passwordFields = (toggle, name, label, firstLabel, repeatLabel) => (
    <div>
      <div className="d-flex flex-wrap align-items-start gap-3">
      <div className="form-check form-switch mb-3">
        <input className="form-check-input" type="checkbox" role="switch" id={`edit-user-${toggle}`}
          checked={draft[toggle]} onChange={(event) => {
            setDraft((current) => ({ ...current, [toggle]: event.target.checked, [name]: '', [`${name}Repeat`]: '' }));
            setErrors((current) => ({ ...current, [name]: '', [`${name}Repeat`]: '' }));
            setNotice('');
          }} />
        <label className="form-check-label" htmlFor={`edit-user-${toggle}`}>{label}</label>
      </div>
      {toggle === 'changePassword' && (
        <div className="form-check form-switch mb-3">
          <input className="form-check-input" type="checkbox" role="switch" id="edit-user-request-password"
            checked={draft.request_password}
            onChange={(event) => update('request_password', event.target.checked)} />
          <label className="form-check-label" htmlFor="edit-user-request-password">
            Solicitar cambio de contraseña al iniciar sesión
          </label>
        </div>
      )}
      </div>
      {draft[toggle] && <div className="d-grid gap-3 mb-3">
        {field(name, firstLabel, undefined, 'password')}
        {field(`${name}Repeat`, repeatLabel, undefined, 'password')}
      </div>}
    </div>
  );

  const validate = async (event) => {
    event.preventDefault();
    if (savingRef.current) return;
    const nextErrors = {};
    const limits = { name: 100, user_name: 20, email: 100, direction: 100, position: 50, college_number: 50 };
    for (const name of ['name', 'user_name', 'email']) {
      if (!String(draft[name] ?? '').trim()) nextErrors[name] = 'Este campo es obligatorio.';
    }
    for (const [name, limit] of Object.entries(limits)) {
      if (String(draft[name] ?? '').length > limit) nextErrors[name] = `Admite hasta ${limit} caracteres.`;
    }
    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(draft.email).trim())) {
      nextErrors.email = 'Introduce un e-mail válido.';
    }
    if (draft.telephone && !/^[+\d\s().-]+$/.test(draft.telephone)) {
      nextErrors.telephone = 'Introduce un teléfono válido.';
    }
    if (!draft.roles.length || draft.roles.some((role) => !ROLE_OPTIONS.includes(role))) {
      nextErrors.roles = 'Selecciona al menos un rol válido: admin, anular o user.';
    }
    for (const [toggle, name] of [['changePassword', 'password'], ['changeSignaturePassword', 'passwordSignature']]) {
      if (!draft[toggle]) continue;
      if (!draft[name]) nextErrors[name] = 'Este campo es obligatorio.';
      if (!draft[`${name}Repeat`]) nextErrors[`${name}Repeat`] = 'Debes confirmar la clave.';
      else if (draft[name] !== draft[`${name}Repeat`]) nextErrors[`${name}Repeat`] = 'Las claves deben coincidir.';
    }
    setErrors(nextErrors);
    setNotice('');
    if (Object.keys(nextErrors).length) {
      const name = Object.keys(nextErrors)[0];
      modalRef.current.querySelector(name === 'roles' ? 'summary' : `#edit-user-${name}`)?.focus();
      return;
    }
    const changes = {};
    if (draft.request_password !== (Number(user.request_password) === 1)) {
      changes.request_password = draft.request_password;
    }
    for (const name of [...Object.keys(limits), 'telephone']) {
      const value = String(draft[name] ?? '').trim();
      if (value !== String(user[name] ?? '')) changes[name] = value;
    }
    const originalRoles = parseRoles(user.roles);
    if (draft.roles.length !== originalRoles.length || draft.roles.some((role) => !originalRoles.includes(role))) {
      changes.roles = draft.roles.join(',');
    }
    if (draft.changePassword) changes.password = draft.password;
    if (draft.changeSignaturePassword) changes.passwordSignature = draft.passwordSignature;
    savingRef.current = true;
    setSaving(true);
    try {
      await onSave(user.id, changes, {
        photoChanged: draft.photoChanged, photoFile: draft.photoFile,
        signatureChanged: draft.signatureChanged, signatureFile: draft.signatureFile,
      });
      savingRef.current = false;
      modalInstanceRef.current?.hide();
    } catch (error) {
      setNotice(error.response?.data?.message || error.message || 'No fue posible guardar los cambios. Revisa los datos e inténtalo de nuevo.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <div ref={modalRef} className="modal setting-exams-prices-modal edit-user-modal" tabIndex={-1}
      aria-labelledby="edit-user-title" aria-hidden="true">
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          <div className="modal-header gap-3">
            <button type="button" data-edit-user-control disabled={saving}
              data-bs-dismiss="modal"><span className="ico ico-arrow-left4 text-white" aria-hidden="true" /><span className="text-white">Volver</span></button>
            <h2 className="modal-title fs-5" id="edit-user-title">Usuario {user.name ?? ''}</h2>
            <button type="submit" form="edit-user-form" disabled={saving} className="btn btn-primary ms-auto flex-shrink-0">{saving ? 'Registrando...' : 'Registrar'}</button>
          </div>
          <div className="modal-body scrollbar-thin">
            <form id="edit-user-form" onSubmit={validate} noValidate aria-busy={saving}>
              {notice && <p className="edit-user-error" role="alert">{notice}</p>}
              <fieldset disabled={saving}>
              <div className="row g-3">
                <div className="col-12">{field('name', 'Nombre completo', 100)}</div>
                <div className="col-md-6">{field('user_name', 'Nombre usuario', 20)}</div>
                <div className="col-md-6">{field('telephone', 'Teléfono', undefined, 'tel')}</div>
                <div className="col-md-6">{field('email', 'E-mail', 100, 'email')}</div>
                <div className="col-md-6">
                  <label className="form-label" id="edit-user-roles-label">Roles</label>
                  <details className="edit-user-roles">
                    <summary className={`form-select${errors.roles ? ' is-invalid' : ''}`} aria-labelledby="edit-user-roles-label"
                      aria-invalid={Boolean(errors.roles)} aria-describedby={errors.roles ? 'edit-user-roles-error' : undefined}>
                      {draft.roles.length ? draft.roles.map((role) => (
                        <span key={role} className="badge bg-success small me-2"><span className="badge-icon">✓</span>{role}</span>
                      )) : 'Selecciona roles'}
                    </summary>
                    <div className="edit-user-role-options form-control" role="group" aria-labelledby="edit-user-roles-label">
                      {ROLE_OPTIONS.map((role, index) => <div className="form-check" key={role}>
                        <input type="checkbox" className="form-check-input" id={`edit-user-role-${index}`}
                          checked={draft.roles.includes(role)} onChange={(event) => update('roles', event.target.checked
                            ? [...draft.roles, role] : draft.roles.filter((item) => item !== role))} />
                        <label className="form-check-label" htmlFor={`edit-user-role-${index}`}>{role}</label>
                      </div>)}
                    </div>
                  </details>
                  {errors.roles && <div id="edit-user-roles-error" className="edit-user-error">{errors.roles}</div>}
                </div>
                <div className="col-12">{field('direction', 'Dirección', 100, 'text', true)}</div>
                <div className="col-md-6">{field('position', 'Cargo', 50)}</div>
                <div className="col-md-6 pt-md-4">{passwordFields('changePassword', 'password', 'Cambiar contraseña', 'Contraseña', 'Repita contraseña')}</div>
              </div>
              <hr />
              <div className="row g-4">
                <div className="col-md-6">
                  <ImageField label="Foto de usuario" path={user.url_photo} circular onChange={(file) => {
                    setDraft((current) => ({ ...current, photoFile: file, photoChanged: true }));
                    setNotice('');
                  }} />
                </div>
                <div className="col-md-6">
                  {field('college_number', 'N° de colegiatura', 50)}
                  <div className="mt-3">{passwordFields('changeSignaturePassword', 'passwordSignature', 'Cambiar clave de firma', 'Clave de firma', 'Repita clave de firma')}</div>
                  <ImageField label="Firma" path={user.url_signature} onChange={(file) => {
                    setDraft((current) => ({ ...current, signatureFile: file, signatureChanged: true }));
                    setNotice('');
                  }} />
                </div>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
