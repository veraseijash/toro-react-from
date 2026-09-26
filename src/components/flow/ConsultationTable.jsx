import { useEffect, useState } from 'react';
import { getPatientsPaginated } from '../../services/patientsService';

const amountFormat = new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatAmount = (value) => amountFormat.format(Number(value) || 0);
const formatTime = (value) => {
  const match = String(value ?? '').match(/(?:T|^)(\d{2}):(\d{2})/);
  if (!match) return value || '—';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
};

function StatusMark({ active, label }) {
  return active ? <span className="ico ico-check consultation-status" role="img" aria-label={label} title={label} /> : null;
}

export default function ConsultationTable({ filters }) {
  const filterKey = JSON.stringify(filters);
  const [pagination, setPagination] = useState({ filterKey, page: 1, itemsPerPage: 20 });
  const page = pagination.filterKey === filterKey ? pagination.page : 1;
  const { itemsPerPage } = pagination;
  const [result, setResult] = useState({ items: [], total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [loadedQuery, setLoadedQuery] = useState('');
  const queryKey = JSON.stringify([filterKey, page, itemsPerPage, retry]);
  const pending = loading || loadedQuery !== queryKey;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    const timer = setTimeout(async () => {
      try {
        const response = await getPatientsPaginated(itemsPerPage, page, JSON.parse(filterKey), { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Array.isArray(response?.items) || !Number.isInteger(response.total) || !Number.isInteger(response.totalPages)
          || response.total < 0 || response.totalPages < 0 || response.error || response.success === false) {
          throw new Error('Respuesta de pacientes no válida');
        }
        if (page > Math.max(1, response.totalPages)) {
          setPagination({ filterKey, page: Math.max(1, response.totalPages), itemsPerPage });
          return;
        }
        setResult(response);
      } catch {
        if (!controller.signal.aborted) setError('No se pudieron cargar los movimientos.');
      } finally {
        if (!controller.signal.aborted) {
          setLoadedQuery(queryKey);
          setLoading(false);
        }
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [filterKey, page, itemsPerPage, queryKey]);

  const totalPages = Math.max(1, result.totalPages);
  const goToPage = (nextPage) => setPagination({ filterKey, page: nextPage, itemsPerPage });

  return (
    <section className="consultation-results" aria-label="Movimientos de pacientes" aria-busy={pending}>
      <div className="consultation-table-scroll">
        <table className="table consultation-table align-middle mb-0">
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Anulado</span></th>
              {['Fecha', 'Hora', '#', 'Secuencia', 'Nombre', 'CI', 'Edad', 'Sexo', 'Teléfono', 'Total Bs.', 'Total $.', 'Cancelado', 'Entregado', 'En crédito'].map((label) => <th scope="col" key={label}>{label}</th>)}
            </tr>
          </thead>
          <tbody>
            {pending ? (
              <tr><td colSpan={15} className="text-center py-4" role="status">Cargando movimientos...</td></tr>
            ) : error ? (
              <tr><td colSpan={15} className="text-center py-4">
                <p role="alert">{error}</p>
                <button type="button" className="btn btn-secondary" onClick={() => setRetry((value) => value + 1)}>Reintentar</button>
              </td></tr>
            ) : result.items.length === 0 ? (
              <tr><td colSpan={15} className="text-center py-4" role="status">No hay movimientos para los filtros seleccionados.</td></tr>
            ) : result.items.map((patient) => (
              <tr key={patient.id} className={Number(patient.canceled) === 1 ? 'consultation-row-annulled' : undefined}>
                <td>{Number(patient.canceled) === 1 && <span className="ico ico-lg ico-times-circle" role="img" aria-label="Anulado" title="Anulado" />}</td>
                <td>{String(patient.admission_date ?? '').slice(0, 10)}</td>
                <td>{formatTime(patient.admission_time)}</td>
                <td>{patient.id}</td>
                <td>{patient.patient_position}</td>
                <td className="consultation-patient-name">{patient.name}</td>
                <td>{patient.document_number}</td>
                <td>{patient.age} {patient.month_year}</td>
                <td><span className={`ico ${Number(patient.sex) === 1 ? 'ico-male' : 'ico-female'} consultation-sex`} role="img" aria-label={Number(patient.sex) === 1 ? 'Masculino' : 'Femenino'} /></td>
                <td>{patient.phone}</td>
                <td className="text-end">{formatAmount(patient.total)}</td>
                <td className="text-end">{formatAmount(patient.total_dollars)}</td>
                <td><StatusMark active={Number(patient.total_canceled) > 0} label="Cancelado" /></td>
                <td><StatusMark active={Boolean(patient.deliver_date)} label="Entregado" /></td>
                <td><StatusMark active={Number(patient.client?.credit) === 1} label="En crédito" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="consultation-pagination">
        <label className="d-flex align-items-center gap-2">
          <span>Elementos por página</span>
          <select className="form-select form-select-sm w-auto" value={itemsPerPage}
            onChange={(event) => setPagination({ filterKey, page: 1, itemsPerPage: Number(event.target.value) })}>
            {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
          </select>
        </label>
        <span>{pending || error ? '—' : `${result.total ? (page - 1) * itemsPerPage + 1 : 0}-${Math.min(page * itemsPerPage, result.total)} de ${result.total}`}</span>
        <div className="d-flex align-items-center gap-2">
          {[
            ['Primera página', 'ico-angle-double-left', 1, page <= 1],
            ['Página anterior', 'ico-chevron-left1', page - 1, page <= 1],
          ].map(([label, icon, target, disabled]) => (
            <button type="button" className="consultation-page-button" key={label} aria-label={label} title={label} disabled={pending || Boolean(error) || disabled} onClick={() => goToPage(target)}><span className={`ico ${icon}`} aria-hidden="true" /></button>
          ))}
          <span aria-label={`Página ${page} de ${totalPages}`}>{page}</span>
          {[
            ['Página siguiente', 'ico-chevron-right1', page + 1, page >= totalPages],
            ['Última página', 'ico-angle-double-right', totalPages, page >= totalPages],
          ].map(([label, icon, target, disabled]) => (
            <button type="button" className="consultation-page-button" key={label} aria-label={label} title={label} disabled={pending || Boolean(error) || disabled} onClick={() => goToPage(target)}><span className={`ico ${icon}`} aria-hidden="true" /></button>
          ))}
        </div>
      </div>
    </section>
  );
}
