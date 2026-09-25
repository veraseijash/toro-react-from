import { useEffect, useRef, useState } from 'react';
import { IMAGES_BASE_URL } from '../config/appConfig';
import { getUsersWithPatientsByDate } from '../services/userService';
import { deleteCash_register } from '../services/wayPayService';
import FlowCash from '../components/flow/FlowCash';
import '../styles/CashClosing.css';

const hasCashRegister = (value) => Array.isArray(value)
  ? value.length > 0
  : Boolean(value && Object.keys(value).length > 0);

function CashClosing() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);
  const clearingRef = useRef(false);
  const [clearError, setClearError] = useState('');
  const [detailVersion, setDetailVersion] = useState(0);
  const busy = saving || clearing;
  const [notice, setNotice] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
  });

  const selectedRegister = Array.isArray(selectedUser?.cash_register)
    ? selectedUser.cash_register[0]
    : selectedUser?.cash_register;

  const clearRegister = async () => {
    if (busy || clearingRef.current || loading) return;
    setClearError('');
    setNotice('');
    if (selectedRegister?.id == null) {
      setClearError('No se encontró el identificador del cierre de caja.');
      return;
    }
    clearingRef.current = true;
    setClearing(true);
    try {
      const result = await deleteCash_register(selectedRegister.id);
      if (!(Number(result?.affected) > 0) || result?.error || result?.success === false
        || result?.ok === false || Number(result?.status) >= 400 || Number(result?.statusCode) >= 400) {
        throw new Error('No se confirmó la eliminación del cierre');
      }
      const updatedUser = { ...selectedUser, cash_register: [] };
      setUsers((current) => current.map((user) => user === selectedUser ? updatedUser : user));
      setSelectedUser(updatedUser);
      setDetailVersion((version) => version + 1);
      setNotice('Cierre de caja eliminado correctamente.');
    } catch {
      setClearError('No se pudo limpiar el cierre de caja. Intenta nuevamente.');
    } finally {
      clearingRef.current = false;
      setClearing(false);
    }
  };

  useEffect(() => {
    let active = true;
    setUsers([]);
    setSelectedUser(null);
    setError('');
    setClearError('');
    setLoading(Boolean(selectedDate));

    if (selectedDate) {
      getUsersWithPatientsByDate(selectedDate)
        .then((response) => {
          if (!active) return;
          const rows = Array.isArray(response) ? response : response?.users ?? response?.data;
          if (response?.success === false || response?.ok === false || response?.error || !Array.isArray(rows)) {
            throw new Error('Respuesta de usuarios no válida');
          }
          setUsers(rows);
        })
        .catch(() => {
          if (active) setError('No se pudieron cargar los usuarios. Intenta actualizar la lista.');
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    }

    return () => { active = false; };
  }, [selectedDate, refreshVersion]);

  return (
    <div className="dashboard-content">
      <div className="d-flex align-items-center justify-content-between gap-3 mb-3">
        <h1 className="mb-0">Cierre de caja</h1>
        <div className="d-flex gap-2 flex-shrink-0">
          <button type="submit" form="flow-cash-form" className="btn btn-primary" disabled={!selectedUser || loading || busy}>
            {saving ? 'Registrando...' : 'Registrar'}
          </button>
          {hasCashRegister(selectedUser?.cash_register) && (
            <button type="button" className="btn btn-secondary" disabled={busy || loading} onClick={clearRegister}>
              {clearing ? 'Limpiando...' : 'Limpiar cierre de caja'}
            </button>
          )}
          <button type="button" className="btn btn-secondary">Imprimir</button>
        </div>
      </div>
      {notice && <p role="status">{notice}</p>}
      {clearError && <p role="alert">{clearError}</p>}
      <div className="cash-closing-columns">
        <section aria-label="Lista de cierres de caja">
          <div className="d-flex align-items-center gap-2">
            <input
              type="date"
              className="form-control"
              aria-label="Fecha de cierre de caja"
              value={selectedDate}
              disabled={busy}
              onChange={(event) => { setNotice(''); setSelectedDate(event.target.value); }}
            />
            <button
              type="button"
              className="cash-closing-refresh"
              aria-label="Actualizar lista de cierres de caja"
              title="Actualizar lista de cierres de caja"
              onClick={() => setRefreshVersion((version) => version + 1)}
              disabled={loading || busy || !selectedDate}
            >
              <span className="ico ico-refresh1 ico-lg" aria-hidden="true" />
            </button>
          </div>
          <div className="cash-closing-users" aria-busy={loading}>
            {loading && <p role="status">Cargando usuarios...</p>}
            {error && <p role="alert">{error}</p>}
            {!loading && !error && selectedDate && users.length === 0 && (
              <p role="status">No hay usuarios con pacientes para esta fecha.</p>
            )}
            {users.map((user, index) => (
              <button
                key={user.id ?? user.userId ?? index}
                type="button"
                className={`card cash-closing-user${selectedUser === user ? ' card-primary' : ''}`}
                aria-pressed={selectedUser === user}
                disabled={busy}
                onClick={() => { setNotice(''); setClearError(''); setSelectedUser(user); }}
              >
                <span
                  className={`cash-closing-star ico ${hasCashRegister(user.cash_register) ? 'ico-star1' : 'ico-star-o'} ico-lg`}
                  role="img"
                  aria-label={hasCashRegister(user.cash_register) ? 'Con registros de caja' : 'Sin registros de caja'}
                />
                <span className="cash-closing-avatar">
                  {user.url_photo ? (
                    <img
                      src={`${IMAGES_BASE_URL.replace(/\/+$/, '')}/${String(user.url_photo).replace(/^\/+/, '')}`}
                      alt=""
                    />
                  ) : (
                    <span className="ico ico-user4" aria-hidden="true" />
                  )}
                </span>
                <span className="cash-closing-user-info">
                  <strong className="card-title mb-0">{user.name}</strong>
                  <small className="card-text">{user.position}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
        <section className="cash-closing-detail" aria-label="Detalle del cierre de caja">
          {selectedUser && (
            <FlowCash
              key={`${selectedDate}-${selectedUser.id ?? selectedUser.userId ?? users.indexOf(selectedUser)}-${detailVersion}`}
              user={selectedUser}
              date={selectedDate}
              saving={busy}
              onSavingChange={setSaving}
              onSaved={() => {
                setNotice('Cierre de caja registrado correctamente.');
                setRefreshVersion((version) => version + 1);
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

export default CashClosing;
