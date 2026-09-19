import { useEffect, useRef, useState } from 'react';
import { Tooltip } from 'bootstrap';
import { getUsersOrder, updateUser } from '../services/userService';
import '../styles/RegisteredUsers.css';

function VisibilityUserButton({ user, disabled, onClick }) {
  const buttonRef = useRef(null);
  const hidden = Number(user.hide_user) === 1;
  const title = hidden ? 'Mostrar' : 'Ocultar';

  useEffect(() => {
    const tooltip = new Tooltip(buttonRef.current, { title, container: 'body', animation: false });
    return () => tooltip.dispose();
  }, [title]);

  return (
    <button ref={buttonRef} type="button" className="setting-exams-action registered-users-hide-button"
      aria-label={`${title} ${user.name ?? user.user_name ?? 'usuario'}`} disabled={disabled}
      onClick={() => {
        Tooltip.getInstance(buttonRef.current)?.hide();
        onClick();
      }}>
      {hidden
        ? <span className="ico ico-eye-off text-warning" role="img" aria-label="Inactivo" />
        : <span className="ico ico-eye4 text-primary" role="img" aria-label="Activo" />}
    </button>
  );
}

function EditUserButton({ user }) {
  const buttonRef = useRef(null);

  useEffect(() => {
    const tooltip = new Tooltip(buttonRef.current, { title: 'Editar', container: 'body' });
    return () => tooltip.dispose();
  }, []);

  return (
    <button ref={buttonRef} type="button" className="setting-exams-action registered-users-edit-button"
      aria-label={`Editar ${user.name ?? user.user_name ?? 'usuario'}`}>
      <span className="ico ico-pencil text-primary" aria-hidden="true" />
    </button>
  );
}

const readRoles = (value) => {
  if (typeof value === 'string') {
    try {
      return readRoles(JSON.parse(value));
    } catch {
      return value.split(',').map((role) => role.trim()).filter(Boolean);
    }
  }
  if (!Array.isArray(value)) return [];
  return value.flatMap((role) => {
    const label = typeof role === 'string' ? role : role?.name ?? role?.description ?? '';
    return String(label).split(',').map((item) => item.trim()).filter(Boolean);
  });
};

export default function RegisteredUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [hidingId, setHidingId] = useState(null);
  const [updateError, setUpdateError] = useState('');
  const hidingRef = useRef(false);

  const hideUser = async (user) => {
    if (hidingRef.current || user.id == null) return;
    hidingRef.current = true;
    setHidingId(user.id);
    setUpdateError('');
    try {
      const hide_user = Number(user.hide_user) === 1 ? 0 : 1;
      const response = await updateUser(user.id, { hide_user });
      if (response?.success === false || response?.ok === false || response?.error) {
        throw new Error('No se pudo ocultar el usuario.');
      }
      setUsers((current) => current.map((item) => (
        String(item.id) === String(user.id) ? { ...item, hide_user } : item
      )));
    } catch {
      setUpdateError('No fue posible actualizar el usuario. Vuelve a intentarlo.');
    } finally {
      hidingRef.current = false;
      setHidingId(null);
    }
  };

  useEffect(() => {
    let active = true;
    const loadUsers = async () => {
      try {
        const response = await getUsersOrder();
        const rows = Array.isArray(response) ? response : response?.users ?? response?.data;
        if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
          throw new Error('No se pudo cargar la lista de usuarios.');
        }
        if (active) setUsers(rows);
      } catch {
        if (active) setError('No fue posible cargar los usuarios registrados.');
      } finally {
        if (active) setLoading(false);
      }
    };
    loadUsers();
    return () => { active = false; };
  }, []);

  return (
    <div className="dashboard-content setting-exams-page registered-users-page">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h1 className="m-0">Usuarios registrados</h1>
        <button type="button" className="btn btn-primary flex-shrink-0">Nuevo usuario</button>
      </div>
      {updateError && <p className="text-danger" role="alert">{updateError}</p>}
      {hidingId != null && <p className="small" role="status">Actualizando usuario...</p>}
      <div className="card setting-exams-table-panel">
        <div className="card-body setting-exams-table-body">
          <div className="setting-exams-table-scroll scrollbar-thin">
            <table className="setting-exams-table" aria-label="Usuarios registrados" aria-busy={loading}>
              <thead>
                <tr>
                  <th scope="col"><span className="visually-hidden">Estado</span></th>
                  <th scope="col">Nombre completo</th>
                  <th scope="col">Nombre de usuario</th>
                  <th scope="col">Teléfono</th>
                  <th scope="col">Email</th>
                  <th scope="col">Dirección</th>
                  <th scope="col">Cargo</th>
                  <th scope="col">N° colegiatura</th>
                  <th scope="col">Roles</th>
                  <th scope="col" className="setting-exams-center">Acción</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={10} className="setting-exams-table-message" role="status">Cargando...</td></tr>}
                {error && <tr><td colSpan={10} className="setting-exams-table-message text-danger" role="alert">{error}</td></tr>}
                {!loading && !error && users.length === 0 && (
                  <tr><td colSpan={10} className="setting-exams-table-message">No hay usuarios registrados.</td></tr>
                )}
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="setting-exams-center">
                      <VisibilityUserButton user={user}
                        disabled={hidingId != null || user.id == null}
                        onClick={() => hideUser(user)} />
                    </td>
                    <td>{user.name ?? ''}</td>
                    <td>{user.user_name ?? ''}</td>
                    <td>{user.telephone ?? ''}</td>
                    <td>{user.email ?? ''}</td>
                    <td className="registered-users-address">{user.direction ?? ''}</td>
                    <td className="registered-users-position">{user.position ?? ''}</td>
                    <td>{user.college_number ?? ''}</td>
                    <td>
                      <div className="d-flex flex-wrap gap-2">
                        {readRoles(user.roles).map((role, index) => (
                          <span key={`${role}-${index}`} className="badge bg-success small me-2">
                            <span className="badge-icon">✓</span>{role}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="setting-exams-center">
                      <EditUserButton user={user} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
