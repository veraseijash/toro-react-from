import { Link } from 'react-router-dom';

function NotFound() {
  return (
    <div className="container py-5 text-center">
      <h1 className="display-1 fw-bold">404</h1>

      <p className="fs-4">
        La página solicitada no existe.
      </p>

      <Link className="btn btn-primary" to="/">
        Volver al inicio
      </Link>
    </div>
  );
}

export default NotFound;