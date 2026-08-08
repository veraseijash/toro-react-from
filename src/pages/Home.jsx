import { useEffect, useState } from 'react';
import useAuth from '../context/useAuth';
import { getGroupHtListActiveWithTotals } from '../services/groupHtService';
import { getLaboratory } from '../services/userService';

function GroupCard({ group }) {
  const [photoError, setPhotoError] = useState(false);
  const total = Number(group.total);
  const totalProcessed = Number(group.total_processed);
  const totalApproved = Number(group.total_approved);
  const allTotalsAreZero = total === 0 && totalProcessed === 0 && totalApproved === 0;
  const cardVariant = allTotalsAreZero
    ? ''
    : totalProcessed !== totalApproved
      ? ' card-warning'
      : ' card-primary';
  const photoUrl = group.user?.url_photo
    ? `http://localhost:3000/images/${group.user.url_photo.replace(/^\/+/, '')}`
    : null;
  return (
    <article className={`card group-card${cardVariant}`}>
      <div className="card-body">
        <div className="group-card-heading">
          <span className="group-card-label">Área de trabajo</span>
          <strong>{group.description}</strong>
          <span>{group.details || '\u00a0'}</span>
        </div>

        <div className="d-flex gap-2 mt-4">
          <div className="group-stat">
            <span>Total exámenes</span>
            <strong>{group.total}</strong>
          </div>
          <div className="group-stat">
            <span>Procesados</span>
            <strong>{group.total_processed}</strong>
          </div>
          <div className="group-stat">
            <span>Aprobados</span>
            <strong>{group.total_approved}</strong>
          </div>
        </div>

        <div className="group-user mt-4">
          {photoUrl && !photoError ? (
            <img
              className="sidebar-avatar"
              src={photoUrl}
              alt='...'
              onError={() => setPhotoError(true)}
            />
          ) : (
            <span className="ico ico-user4" aria-label="Usuario sin foto"></span>
          )}
          <div className="sidebar-profile-text">
            <span>Acargo:</span>
            <strong>{group.user?.name || 'Sin usuario asignado'}</strong>
          </div>
        </div>
      </div>
    </article>
  );
}

function Home() {
  const { session } = useAuth();
  const [groups, setGroups] = useState([]);
  const [laboratoryName, setLaboratoryName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const laboratoryId = 1;
  
  useEffect(() => {
    let isMounted = true;

    if (!laboratoryId) {
      setLaboratoryName('');
      return () => {
        isMounted = false;
      };
    }

    const loadLaboratory = async () => {
      try {
        const laboratory = await getLaboratory(laboratoryId);
        if (isMounted) setLaboratoryName(laboratory?.name || '');
      } catch {
        if (isMounted) setLaboratoryName('');
      }
    };

    loadLaboratory();

    return () => {
      isMounted = false;
    };
  }, [laboratoryId]);

  useEffect(() => {
    let isMounted = true;

    const loadGroups = async () => {
      if (isMounted) setIsRefreshing(true);

      try {
        const data = await getGroupHtListActiveWithTotals();
        if (isMounted) {
          setGroups(Array.isArray(data) ? data : []);
          setErrorMessage('');
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error.response?.data?.message
              || error.response?.data?.error
              || error.message
              || 'No fue posible cargar los grupos',
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    loadGroups();
    const refreshInterval = window.setInterval(loadGroups, 60_000);

    return () => {
      isMounted = false;
      window.clearInterval(refreshInterval);
    };
  }, []);

  return (
    <div className="home-dashboard">
      <span
        className={`ico ico-refresh-cw home-refresh-icon${isRefreshing ? ' refreshing' : ''}`}
        aria-hidden="true"
      />

      {isLoading && <p className="text-light">Cargando grupos...</p>}
      {!isLoading && errorMessage && <p className="text-warning">{errorMessage}</p>}
      {!isLoading && !errorMessage && (
        <>
          {laboratoryName && <h3 className="home-laboratory-name">{laboratoryName}</h3>}
          <div className="group-card-list">
            {groups.map((group) => (
              <GroupCard key={group.id} group={group} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default Home;
