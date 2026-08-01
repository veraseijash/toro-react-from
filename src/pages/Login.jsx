import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

function Login() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previousData) => ({
      ...previousData,
      [name]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!formData.email || !formData.password) {
      toast.warning('Completa todos los campos');
      return;
    }

    toast.success('Formulario enviado');
    navigate('/');
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body p-4">
              <h1 className="h3 text-center mb-4">
                Iniciar sesión
              </h1>

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Correo electrónico
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
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

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                >
                  Entrar
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;