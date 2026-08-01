import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import toroLogo from '../assets/images/toro.svg';

const menuItems = [
  { to: '/', label: 'Inicio', icon: 'ico-home6', end: true },
  { to: '/nosotros', label: 'Nosotros', icon: 'ico-users3' },
  {
    id: 'cuenta',
    label: 'Mi cuenta',
    icon: 'ico-user4',
    children: [
      { to: '/login', label: 'Iniciar sesión' },
      { to: '/perfil', label: 'Mi perfil' },
    ],
  },
];

function Sidebar() {
  const { pathname } = useLocation();
  const [openGroups, setOpenGroups] = useState({});

  const closeSidebar = () => {
    const sidebarToggle = document.getElementById('sidebar-toggle');
    if (sidebarToggle) sidebarToggle.checked = false;
  };

  const toggleGroup = (groupId, isOpen) => {
    setOpenGroups((groups) => ({ ...groups, [groupId]: !isOpen }));
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
            <span>Panel de control</span>
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
          <div className="sidebar-avatar">VS</div>
          <div className="sidebar-profile-text">
            <strong>Usuario Toro</strong>
            <span>Administrador</span>
          </div>
          <span className="sidebar-more" aria-hidden="true">•••</span>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
