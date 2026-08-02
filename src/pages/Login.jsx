import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toroLogo from '../assets/images/toro.svg';
import useAuth from '../context/useAuth';
import { getUserSession } from '../services/userService';

function Login() {
  const navigate = useNavigate();
  const { createSession } = useAuth();

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

    if (!formData.user_name || !formData.password) {
      setErrorMessage('Completa todos los campos');
      return;
    }

    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const { user, token } = await getUserSession(formData);

      if (!user || !token) {
        throw new Error('La respuesta del servidor no contiene una sesión válida');
      }

      createSession({ user, token });
      navigate('/', { replace: true });
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message
          || error.response?.data?.error
          || error.message
          || 'No fue posible iniciar sesión',
      );
    } finally {
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
              Iniciar sesión
            </h1>

            <form onSubmit={handleSubmit}>
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
