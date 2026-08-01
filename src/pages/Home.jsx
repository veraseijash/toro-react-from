import { useEffect, useRef } from 'react';
import { Tooltip } from 'bootstrap';
import { toast } from 'react-toastify';

function Home() {
  const homeRef = useRef(null);

  useEffect(() => {
    const tooltipElements = homeRef.current?.querySelectorAll('[data-bs-toggle="tooltip"]') ?? [];
    const tooltips = Array.from(tooltipElements, (element) => new Tooltip(element));

    return () => {
      tooltips.forEach((tooltip) => tooltip.dispose());
    };
  }, []);

  const showNotification = () => {
    toast.success('El proyecto funciona correctamente');
  };

  return (
    <div ref={homeRef}>
      <div className="card">
        <div className="card-body">
          <div className="container-fluid py-3">
            <h1 className="display-5 fw-bold">
              Proyecto React
            </h1>

            <p className="col-md-8 fs-5">
              Base creada con Vite, React Router, Axios,
              Bootstrap y React Toastify.
            </p>
            <button
              type="button"
              className="me-2 btn btn-sm"
              onClick={showNotification}
            >
              Cancelar
            </button>
            <button className="me-2 btn btn-danger">
              Eliminar
            </button>
            <button className="me-2 btn btn-success">
              Guardar
            </button>
            <button className="me-2 btn btn-warning">
              Advertencia
            </button>
            <button className="me-2 btn btn-info">
              Información
            </button>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={showNotification}
            >
              Probar notificación
            </button>
          </div>
          <div className="py-3">
            <div>
              <label className="form-label" htmlFor="name">Nombre</label>
              <input
                className="form-control form-control-sm"
                type="text"
                placeholder="Name"
              />
            </div>
            <div className="mt-2 input-group">
              <input className="form-control" placeholder="Usuario" />
              <button className="btn btn-primary">Buscar</button>
            </div>
            <div className="mt-2 input-group">
              <input className="form-control" placeholder="Usuario" />
              <span className="input-group-text" id="basic-addon1">@</span>
            </div>
            <div className="mt-2 form-check form-switch">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
              />
            </div>
            <div className="form-check">
              <input className="form-check-input" type="checkbox" value="" id="flexCheckDisabled" />
              <label className="form-check-label" htmlFor="flexCheckDisabled">
                Checkbox
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="option"
                id="radioOption1"
              />
              <label className="form-check-label" htmlFor="radioOption">
                Opción
              </label>
            </div>
            <div className="form-check">
              <input
                className="form-check-input"
                type="radio"
                name="option"
                id="radioOption2"
              />
              <label className="form-check-label" htmlFor="radioOption">
                Opción
              </label>
            </div>
            <div className="mt-2 progress">
              <div
                className="progress-bar"
                role="progressbar"
                style={{ width: '70%' }}
                aria-valuenow="70"
                aria-valuemin="0"
                aria-valuemax="100"
              />
            </div>
            <input
              type="range"
              className="mt-2 form-range"
              min="0"
              max="100"
              defaultValue="50"
              style={{ '--range-progress': '50%' }}
            />
          </div>
          <div className="card card-primary">
            <div className="card-header card-header-3d">
              Card Dialog
            </div>
            <div className="card-body">
              <div className="card-icon">
                <span className="ico ico-power-cord"></span>
              </div>

              <p className="card-text">
                Lorem ipsum va innen and outer message.
              </p>
              <button type="button" className="mt-4 btn btn-primary" data-bs-toggle="modal" data-bs-target="#exampleModal">
                Abrir modal
              </button>
            </div>
          </div>
          <ul className="mt-4 list-group list-group-flush">
            <li className="list-group-item">An item</li>
            <li className="list-group-item">A second item</li>
            <li className="list-group-item">A third item</li>
            <li className="list-group-item">A fourth item</li>
            <li className="list-group-item">And a fifth one</li>
          </ul>
          <div className="list-group">
            <button type="button" className="list-group-item list-group-item-action active" aria-current="true">
              The current button
            </button>
            <button type="button" className="list-group-item list-group-item-action">A second item</button>
            <button type="button" className="list-group-item list-group-item-action">A third button item</button>
            <button type="button" className="list-group-item list-group-item-action active">A fourth button item</button>
            <button type="button" className="list-group-item list-group-item-action" disabled="">
              A disabled button item
            </button>
          </div>
          <span className="mt-4 badge bg-success small me-2">
            <span className="badge-icon">✓</span>
            Success
          </span>

          <span className="badge bg-warning me-2">
            <span className="badge-icon ico ico-watch"></span>
            Pending
          </span>

          <span className="badge bg-primary me-2">
            <span className="badge-icon">→</span>
            Submitted
          </span>

          <span className="badge bg-danger me-2">
            <span className="badge-icon">×</span>
            Failed
          </span>
          <div className="mt-4 d-flex gap-2">
            <button type="button" className="btn btn-secondary" data-bs-toggle="tooltip" data-bs-placement="top" title="Tooltip on top">
              Tooltip on top
            </button>
            <button type="button" className="btn btn-secondary" data-bs-toggle="tooltip" data-bs-placement="right" title="Tooltip on right">
              Tooltip on right
            </button>
            <button type="button" className="btn btn-secondary" data-bs-toggle="tooltip" data-bs-placement="bottom" title="Tooltip on bottom">
              Tooltip on bottom
            </button>
            <button type="button" className="btn btn-secondary" data-bs-toggle="tooltip" data-bs-placement="left" title="Tooltip on left">
              Tooltip on left
            </button>
          </div>
          <div className="mt-4 d-flex flex-column">
            <div className="btn-group" role="group" aria-label="Basic mixed styles example">
              <button type="button" className="btn btn-primary">Left</button>
              <button type="button" className="btn btn-primary">Middle</button>
              <button type="button" className="btn btn-primary">Right</button>
            </div>
            <div className="mt-4 btn-group" role="group" aria-label="Basic radio toggle button group">
              <input type="radio" className="btn-check" name="btnradio" id="btnradio1" autoComplete="off" defaultChecked />
              <label className="btn btn-outline-primary" htmlFor="btnradio1">Radio 1</label>

              <input type="radio" className="btn-check" name="btnradio" id="btnradio2" autoComplete="off" />
              <label className="btn btn-outline-primary" htmlFor="btnradio2">Radio 2</label>

              <input type="radio" className="btn-check" name="btnradio" id="btnradio3" autoComplete="off" />
              <label className="btn btn-outline-primary" htmlFor="btnradio3">Radio 3</label>
            </div>
          </div>
        </div>
      </div>
      <div className="modal fade" id="exampleModal" tabIndex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Modal Dialog</h5>
              <button type="button" className="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>

            <div className="modal-body">
              Content...
            </div>

            <div className="modal-footer">
              <button className="btn" data-bs-dismiss="modal">Cancel</button>
              <button className="btn btn-primary">Aceptar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
