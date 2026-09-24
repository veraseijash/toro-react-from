import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toroLogo from '../assets/images/toro.svg';
import useAuth from '../context/useAuth';
import { getUserSession, updateUser } from '../services/userService';

function Login() {
  const navigate = useNavigate();
  const { createSession, closeSession } = useAuth();
  const submittingRef = useRef(false);
  const [passwordUser, setPasswordUser] = useState(null);
  const [newPasswords, setNewPasswords] = useState({ password: '', repeat: '' });
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');

  const [formData, setFormData] = useState({
    user_name: '',
    password: '',
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
    setErrorMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current) return;

    if (!formData.user_name || !formData.password) {
      setErrorMessage('Completa todos los campos');
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      const { user, token } = await getUserSession(formData);
      if (!user || !token) {
        throw new Error('La respuesta del servidor no contiene una sesión válida');
      }

      if (Number(user.request_password) === 1) {
        setPasswordUser({ id: user.id, user_name: user.user_name });
        setNewPasswords({ password: '', repeat: '' });
        setPasswordErrors({});
        setFormData({ user_name: '', password: '' });
        return;
      }
      await createSession({ user, token });
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message
          || error.response?.data?.error
          || error.message
          || 'No fue posible iniciar sesión',
      );
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event) => {
    event.preventDefault();
    if (submittingRef.current || !passwordUser) return;
    const errors = {};
    if (!newPasswords.password.trim()) errors.password = 'Introduce la nueva contraseña.';
    if (!newPasswords.repeat) errors.repeat = 'Repite la nueva contraseña.';
    else if (newPasswords.password !== newPasswords.repeat) errors.repeat = 'Las contraseñas deben coincidir.';
    setPasswordErrors(errors);
    setErrorMessage('');
    if (Object.keys(errors).length) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    try {
      const updated = await updateUser(passwordUser.id, {
        user_name: passwordUser.user_name,
        password: newPasswords.password,
        request_password: false,
      });
      if (!updated || String(updated.id) !== String(passwordUser.id) || Number(updated.request_password) !== 0) {
        throw new Error('El servidor no confirmó el cambio de contraseña.');
      }
      closeSession();
      setPasswordUser(null);
      setNewPasswords({ password: '', repeat: '' });
      setPasswordErrors({});
      setFormData({ user_name: '', password: '' });
      setSuccessMessage('Contraseña actualizada. Inicia sesión con tu nueva contraseña.');
      navigate('/login', { replace: true });
    } catch (error) {
      setErrorMessage(error.response?.data?.message || error.message || 'No fue posible cambiar la contraseña.');
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container min-vh-100 d-flex justify-content-center align-items-center py-5">
      <div>
        <div className="card shadow" style={{ width: '400px', maxWidth: '100%' }}>
          <div className="card-body p-4">
            <div className="sidebar-brand">
              <div className="sidebar-logo-wrap">
                <img className="sidebar-logo" src={toroLogo} alt="Toro" />
              </div>
              <div>
                <strong>TORO</strong>
                <span>Laboratorio clínico</span>
              </div>
            </div>

            <h1 className="h3 text-center mb-4">
              {passwordUser ? 'Cambiar contraseña' : 'Iniciar sesión'}
            </h1>

            {successMessage && <p className="text-success small" role="status">{successMessage}</p>}
            {passwordUser ? (
              <form onSubmit={handlePasswordSubmit} noValidate>
                {[['password', 'Nueva contraseña'], ['repeat', 'Repita la nueva contraseña']].map(([name, label]) => (
                  <div className="mb-3" key={name}>
                    <label htmlFor={`login-new-${name}`} className="form-label">{label}</label>
                    <input id={`login-new-${name}`} name={name} type="password" autoComplete="new-password"
                      className={`form-control${passwordErrors[name] ? ' is-invalid' : ''}`}
                      value={newPasswords[name]} disabled={isSubmitting}
                      aria-invalid={Boolean(passwordErrors[name])}
                      aria-describedby={passwordErrors[name] ? `login-new-${name}-error` : undefined}
                      onChange={(event) => {
                        setNewPasswords((current) => ({ ...current, [name]: event.target.value }));
                        setPasswordErrors({});
                        setErrorMessage('');
                      }} />
                    {passwordErrors[name] && <label htmlFor={`login-new-${name}`} id={`login-new-${name}-error`}
                      className="text-danger small d-block mt-1">{passwordErrors[name]}</label>}
                  </div>
                ))}
                {errorMessage && <p className="login-error text-danger small" role="alert">{errorMessage}</p>}
                <button type="submit" className={`btn btn-primary w-100${isSubmitting ? ' btn-loading' : ''}`} disabled={isSubmitting}>
                  {isSubmitting ? 'Registrando' : 'Registrar'}
                </button>
              </form>
            ) : <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="user_name" className="form-label">
                  Nombre de usuario
                </label>

                <input
                  id="user_name"
                  name="user_name"
                  type="text"
                  className="form-control"
                  value={formData.user_name}
                  onChange={handleChange}
                  autoComplete="username"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="password" className="form-label">
                  Contraseña
                </label>

                <input
                  id="password"
                  name="password"
                  type="password"
                  className="form-control"
                  value={formData.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </div>

              {errorMessage && (
                <p className="login-error text-warning" role="alert">
                  {errorMessage}
                </p>
              )}

              <button
                type="submit"
                className={`btn btn-primary w-100${isSubmitting ? ' btn-loading' : ''}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Ingresando' : 'Entrar'}
              </button>
            </form>}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
