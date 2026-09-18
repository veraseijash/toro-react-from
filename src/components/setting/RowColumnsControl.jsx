import { Fragment, useRef } from 'react';
import { getColumnWidth } from '../../utils/rowColumns';

export default function RowColumnsControl({ columns, onChange, selectedColumnIndex, onSelectColumn }) {
  const dragRef = useRef(null);
  const widths = columns.map(getColumnWidth);

  const resize = (index, left, right, delta) => {
    const total = left + right;
    const minimum = Math.min(1, total / 2);
    const nextLeft = Math.max(minimum, Math.min(total - minimum, left + delta));
    onChange(index, Number(nextLeft.toFixed(4)), Number((total - nextLeft).toFixed(4)));
  };

  return (
    <section className="setting-row-columns" aria-label="Columnas">
      <h6>Columnas</h6>
      <div className="setting-row-columns-preview">
        {columns.map((column, index) => (
          <Fragment key={column.id ?? index}>
            <div
              className={`setting-row-column-preview${selectedColumnIndex === index ? ' patient-card-selected' : ''}`}
              style={{ flex: `${widths[index]} 1 0`, cursor: 'pointer' }}
              role="button"
              tabIndex={0}
              aria-pressed={selectedColumnIndex === index}
              onClick={() => onSelectColumn(index)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelectColumn(index);
                }
              }}
              title={`Columna ${index + 1}: ${widths[index]}%`}>
              {index + 1}
            </div>
            {index < columns.length - 1 && (
              <div
                className="setting-row-column-resizer"
                role="separator"
                tabIndex={0}
                aria-label={`Cambiar ancho entre columnas ${index + 1} y ${index + 2}`}
                aria-orientation="vertical"
                aria-valuemin={Math.min(1, (widths[index] + widths[index + 1]) / 2)}
                aria-valuemax={widths[index] + widths[index + 1] - Math.min(1, (widths[index] + widths[index + 1]) / 2)}
                aria-valuenow={widths[index]}
                onPointerDown={(event) => {
                  if (event.button !== 0) return;
                  event.preventDefault();
                  const element = event.currentTarget;
                  const pixels = element.previousElementSibling.getBoundingClientRect().width
                    + element.nextElementSibling.getBoundingClientRect().width;
                  if (!pixels) return;
                  element.focus();
                  element.setPointerCapture(event.pointerId);
                  dragRef.current = {
                    pointerId: event.pointerId, x: event.clientX, pixels,
                    left: widths[index], right: widths[index + 1],
                  };
                }}
                onPointerMove={(event) => {
                  const drag = dragRef.current;
                  if (!drag || drag.pointerId !== event.pointerId) return;
                  resize(index, drag.left, drag.right,
                    (event.clientX - drag.x) / drag.pixels * (drag.left + drag.right));
                }}
                onPointerUp={(event) => {
                  dragRef.current = null;
                  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                    event.currentTarget.releasePointerCapture(event.pointerId);
                  }
                }}
                onPointerCancel={() => { dragRef.current = null; }}
                onLostPointerCapture={() => { dragRef.current = null; }}
                onKeyDown={(event) => {
                  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
                  event.preventDefault();
                  resize(index, widths[index], widths[index + 1], event.key === 'ArrowRight' ? 1 : -1);
                }}
              >
                <span aria-hidden="true">{'<>'}</span>
              </div>
            )}
          </Fragment>
        ))}
      </div>
    </section>
  );
}
