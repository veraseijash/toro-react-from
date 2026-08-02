import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import toroLogo from '../assets/images/toro.svg';
import useAuth from '../context/useAuth';

const menuItems = [
  { to: '/', label: 'Inicio', icon: 'ico-home6', end: true },
  { to: '/nosotros', label: 'Nosotros', icon: 'ico-users3' },
  {
    id: 'cuenta',
    label: 'Mi cuenta',
    icon: 'ico-user4',
    children: [
      { to: '/login', label: 'Iniciar sesión' },
      { to: '/content', label: 'Mi contenido' },
    ],
  },
];

function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { session, closeSession } = useAuth();
  const [openGroups, setOpenGroups] = useState({});
  const [photoError, setPhotoError] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const photoUrl = session?.user?.url_photo
    ? `http://localhost:3000/images/${session.user.url_photo.replace(/^\/+/, '')}`
    : null;
  const userInitials = session?.user?.name
    ?.trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((text) => text.charAt(0).toUpperCase())
    .join(' ') || 'U';

  const closeSidebar = () => {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) sidebarToggle.checked = false;
  };

  const toggleGroup = (groupId, isOpen) => {
    setOpenGroups((groups) => ({ ...groups, [groupId]: !isOpen }));
  };

  const handleLogout = () => {
    setIsProfileMenuOpen(false);
    closeSession();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <input className="sidebar-toggle" id="sidebar-toggle" type="checkbox" />

      <label className="sidebar-open" htmlFor="sidebar-toggle" aria-label="Abrir menú">
        <span />
        <span />
        <span />
      </label>

      <label className="sidebar-overlay" htmlFor="sidebar-toggle" aria-label="Cerrar menú" />

      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-logo-wrap">
            <img className="sidebar-logo" src={toroLogo} alt="Toro" />
          </div>
          <div>
            <strong>TORO</strong>
            <span>Laboratorio clínico</span>
          </div>
        </div>

        <div className="sidebar-section-title">MENÚ PRINCIPAL</div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {menuItems.map((item) => {
            if (!item.children) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={closeSidebar}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                >
                  <span className={`ico ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              );
            }

            const hasActiveChild = item.children.some((child) => pathname === child.to);
            const isOpen = openGroups[item.id] ?? hasActiveChild;

            return (
              <div className={`sidebar-group${isOpen ? ' open' : ''}`} key={item.id}>
                <button
                  type="button"
                  className={`sidebar-link sidebar-group-toggle${hasActiveChild ? ' active' : ''}`}
                  onClick={() => toggleGroup(item.id, isOpen)}
                  aria-expanded={isOpen}
                  aria-controls={`sidebar-group-${item.id}`}
                >
                  <span className={`ico ${item.icon}`} aria-hidden="true" />
                  <span>{item.label}</span>
                  <span className="sidebar-arrow" aria-hidden="true">›</span>
                </button>

                <div className="sidebar-submenu" id={`sidebar-group-${item.id}`}>
                  {item.children.map((child) => (
                    <NavLink
                      key={child.to}
                      to={child.to}
                      onClick={closeSidebar}
                      className={({ isActive }) => `sidebar-sublink${isActive ? ' active' : ''}`}
                    >
                      <span className="sidebar-submenu-dot" aria-hidden="true" />
                      <span>{child.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="sidebar-profile">
          {photoUrl && !photoError ? (
            <img
              className="sidebar-avatar"
              src={photoUrl}
              alt="Foto de perfil"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div className="sidebar-avatar" aria-label="Iniciales del usuario">
              {userInitials}
            </div>
          )}
          <div className="sidebar-profile-text">
            <strong>{session?.user?.name || 'Usuario Toro'}</strong>
            <span>{session?.user?.position || 'Sin cargo'}</span>
          </div>
          <div className="dropdown dropup sidebar-profile-dropdown">
            <button
              type="button"
              className="sidebar-more"
              onClick={() => setIsProfileMenuOpen((isOpen) => !isOpen)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              aria-label="Abrir menú de usuario"
            >
              •••
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end sidebar-profile-menu${isProfileMenuOpen ? ' show' : ''}`}
              role="menu"
            >
              <li>
                <button className="dropdown-item" type="button">
                  Mi perfil
                </button>
              </li>
              <li>
                <button className="dropdown-item" type="button">
                  Conversación
                </button>
              </li>
              <li><hr className="dropdown-divider" /></li>
              <li>
                <button className="dropdown-item" type="button" onClick={handleLogout}>
                  Cerrar sesión
                </button>
              </li>
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
