import { NavLink } from 'react-router-dom';

function Navbar() {
  const getLinkClass = ({ isActive }) => {
    return `nav-link ${isActive ? 'active fw-bold' : ''}`;
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container">
        <NavLink className="navbar-brand" to="/">
          Mi Proyecto
        </NavLink>

        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#mainNavbar"
          aria-controls="mainNavbar"
          aria-expanded="false"
          aria-label="Mostrar navegación"
        >
          <span className="navbar-toggler-icon" />
        </button>

        <div className="collapse navbar-collapse" id="mainNavbar">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <NavLink className={getLinkClass} to="/">
                Inicio
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink className={getLinkClass} to="/nosotros">
                Nosotros
              </NavLink>
            </li>

            <li className="nav-item">
              <NavLink className={getLinkClass} to="/login">
                Iniciar sesión
              </NavLink>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;