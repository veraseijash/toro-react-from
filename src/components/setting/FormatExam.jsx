import { createElement, useEffect, useMemo, useRef, useState } from 'react';
import { Offcanvas, Tooltip } from 'bootstrap';
import { newRow } from '../../utils/examRowTemplates';
import { copyRowWithNewVariables } from '../../utils/rowVariables';
import { removeColumn } from '../../utils/rowColumns';
import RowPaddingControl from './RowPaddingControl';
import RowColumnsControl from './RowColumnsControl';
import ElementSettings from './ElementSettings';
import '../../styles/FormatVue.css';
const TEXT_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li']);
const STYLE_KEYS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'textAlign', 'border', 'backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'lineHeight'];

function pickStyles(style) {
  return Object.fromEntries(STYLE_KEYS
    .filter((key) => typeof style?.[key] === 'string' || typeof style?.[key] === 'number')
    .map((key) => [key, style[key]]));
}

function RowActionButton({ title, onClick, children, ...props }) {
  const buttonRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    const element = buttonRef.current;
    const panel = element.closest('.offcanvas');
    const tooltip = new Tooltip(element, { title, container: panel, placement: 'bottom' });
    tooltipRef.current = tooltip;
    const hideTooltip = () => tooltip.hide();
    panel?.addEventListener('hide.bs.offcanvas', hideTooltip);
    return () => {
      panel?.removeEventListener('hide.bs.offcanvas', hideTooltip);
      tooltip.dispose();
      tooltipRef.current = null;
    };
  }, [title]);

  return (
    <button {...props} ref={buttonRef} onClick={(event) => {
      tooltipRef.current?.hide();
      onClick(event);
    }}>
      {children}
    </button>
  );
}

// Render the format's rich text as React elements, without executable HTML attributes.
function renderText(text) {
  const document = new DOMParser().parseFromString(String(text ?? ''), 'text/html');
  const renderNode = (node, key) => {
    if (node.nodeType === 3) return node.textContent;
    if (node.nodeType !== 1) return null;
    const tag = node.tagName.toLowerCase();
    if (['script', 'style', 'iframe', 'object', 'embed'].includes(tag)) return null;
    const children = Array.from(node.childNodes, renderNode);
    if (!TEXT_TAGS.has(tag)) return children;
    return createElement(tag, { key, style: pickStyles(node.style) }, ...(tag === 'br' ? [] : children));
  };
  return Array.from(document.body.childNodes, renderNode);
}

export default function FormatVue({ format, onChange }) {
  const { initialFormat, error } = useMemo(() => {
    if (format == null || format === '') return { initialFormat: { rowContainer: [] } };
    try {
      const parsed = typeof format === 'string' ? JSON.parse(format) : format;
      if (!Array.isArray(parsed?.rowContainer)) throw new Error('Formato inválido');
      return { initialFormat: parsed };
    } catch {
      return { initialFormat: { rowContainer: [] }, error: 'No se pudo mostrar el formato del examen.' };
    }
  }, [format]);
  const [rows, setRows] = useState(initialFormat.rowContainer);
  const [dragOverRow, setDragOverRow] = useState(null);
  const [selectedRow, setSelectedRow] = useState(null);
  const [settingsMode, setSettingsMode] = useState('row');
  const [selectedElementIndex, setSelectedElementIndex] = useState(null);
  const [isElementHighlighted, setIsElementHighlighted] = useState(false);
  const [selectedColumnIndex, setSelectedColumnIndex] = useState(null);
  const [isRowHighlighted, setIsRowHighlighted] = useState(false);
  const canvasRef = useRef(null);
  const draggedTemplateRef = useRef(null);
  const rowOffcanvasRef = useRef(null);
  const rowOffcanvasInstanceRef = useRef(null);
  const rowTriggerRef = useRef(null);

  useEffect(() => {
    const element = rowOffcanvasRef.current;
    const offcanvas = new Offcanvas(element, { backdrop: false, scroll: true });
    rowOffcanvasInstanceRef.current = offcanvas;
    const focusPanel = () => element.focus();
    const restoreFocus = () => {
      if (rowTriggerRef.current?.isConnected) rowTriggerRef.current.focus();
      else canvasRef.current?.focus();
      setSelectedRow(null);
    };
    const closePanel = () => offcanvas.hide();
    const clearHighlight = () => setIsRowHighlighted(false);
    const clearElementHighlight = () => setIsElementHighlighted(false);
    const handleOutsideClick = (event) => {
      if (!rowTriggerRef.current?.contains(event.target)) clearHighlight();
    };
    const modal = element.closest('.modal');
    element.addEventListener('shown.bs.offcanvas', focusPanel);
    element.addEventListener('hidden.bs.offcanvas', restoreFocus);
    element.addEventListener('hide.bs.offcanvas', clearHighlight);
    element.addEventListener('hide.bs.offcanvas', clearElementHighlight);
    document.addEventListener('click', handleOutsideClick, true);
    modal?.addEventListener('hide.bs.modal', closePanel);
    return () => {
      element.removeEventListener('shown.bs.offcanvas', focusPanel);
      element.removeEventListener('hidden.bs.offcanvas', restoreFocus);
      element.removeEventListener('hide.bs.offcanvas', clearHighlight);
      element.removeEventListener('hide.bs.offcanvas', clearElementHighlight);
      document.removeEventListener('click', handleOutsideClick, true);
      modal?.removeEventListener('hide.bs.modal', closePanel);
      offcanvas.dispose();
      rowOffcanvasInstanceRef.current = null;
    };
  }, []);

  const openRowSettings = (event, row) => {
    setIsElementHighlighted(false);
    setSettingsMode('row');
    if (row !== selectedRow) setSelectedColumnIndex(null);
    setSelectedRow(row);
    setIsRowHighlighted(true);
    rowTriggerRef.current = event.currentTarget;
    rowOffcanvasInstanceRef.current?.show();
  };

  const openElementSettings = (event, row, columnIndex, itemIndex) => {
    event.stopPropagation();
    setIsElementHighlighted(true);
    setSelectedRow(row);
    setSelectedColumnIndex(columnIndex);
    setSelectedElementIndex(itemIndex);
    setSettingsMode('element');
    setIsRowHighlighted(false);
    rowTriggerRef.current = event.currentTarget;
    rowOffcanvasInstanceRef.current?.show();
  };

  const cloneSelectedRow = () => {
    const rowIndex = rows.indexOf(selectedRow);
    if (rowIndex === -1) return;
    const clonedRow = { ...copyRowWithNewVariables(selectedRow, rows), id: crypto.randomUUID() };
    const nextRows = [...rows.slice(0, rowIndex + 1), clonedRow, ...rows.slice(rowIndex + 1)];
    setRows(nextRows);
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  const updateRowPadding = (field, value) => {
    if (!selectedRow || !rows.includes(selectedRow)) return;
    const updatedRow = {
      ...selectedRow,
      style: { ...selectedRow.style, [field]: `${value}px` },
    };
    const nextRows = rows.map((row) => row === selectedRow ? updatedRow : row);
    setRows(nextRows);
    setSelectedRow(updatedRow);
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  const updateColumnWidths = (index, left, right) => {
    if (!selectedRow || !rows.includes(selectedRow)) return;
    const columns = selectedRow.content?.stageColumns;
    if (!Array.isArray(columns) || !columns[index + 1]) return;
    const updatedRow = {
      ...selectedRow,
      content: {
        ...selectedRow.content,
        stageColumns: columns.map((column, columnIndex) => (
          columnIndex === index || columnIndex === index + 1
            ? { ...column, style: { ...column.style, width: `${columnIndex === index ? left : right}%` } }
            : column
        )),
      },
    };
    const nextRows = rows.map((row) => row === selectedRow ? updatedRow : row);
    setRows(nextRows);
    setSelectedRow(updatedRow);
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  const selectedColumn = selectedRow?.content?.stageColumns?.[selectedColumnIndex];
  const selectedElement = selectedColumn?.content?.[selectedElementIndex];

  const updateElement = (changes) => {
    if (!selectedElement || !rows.includes(selectedRow)) return;
    const updatedRow = {
      ...selectedRow,
      content: {
        ...selectedRow.content,
        stageColumns: selectedRow.content.stageColumns.map((column, index) => (
          index === selectedColumnIndex ? {
            ...column,
            content: column.content.map((item, itemIndex) => (
              itemIndex === selectedElementIndex ? { ...item, ...changes } : item
            )),
          } : column
        )),
      },
    };
    const nextRows = rows.map((row) => row === selectedRow ? updatedRow : row);
    setRows(nextRows);
    setSelectedRow(updatedRow);
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  const deleteSelectedColumn = () => {
    if (!selectedColumn || !rows.includes(selectedRow)) return;
    const columns = selectedRow.content.stageColumns;
    const nextColumns = removeColumn(columns, selectedColumnIndex);
    if (nextColumns === columns) return;
    const updatedRow = {
      ...selectedRow,
      content: { ...selectedRow.content, cols: nextColumns.length, stageColumns: nextColumns },
    };
    const nextRows = rows.map((row) => row === selectedRow ? updatedRow : row);
    setRows(nextRows);
    setSelectedRow(updatedRow);
    setSelectedColumnIndex(Math.min(selectedColumnIndex, nextColumns.length - 1));
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  const updateColumnStyle = (field, value) => {
    if (!selectedColumn || !rows.includes(selectedRow)) return;
    const updatedRow = {
      ...selectedRow,
      content: {
        ...selectedRow.content,
        stageColumns: selectedRow.content.stageColumns.map((column, index) => (
          index === selectedColumnIndex
            ? { ...column, style: { ...column.style, [field]: value } }
            : column
        )),
      },
    };
    const nextRows = rows.map((row) => row === selectedRow ? updatedRow : row);
    setRows(nextRows);
    setSelectedRow(updatedRow);
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  const deleteSelectedRow = () => {
    if (!selectedRow || !rows.includes(selectedRow)) return;
    const nextRows = rows.filter((row) => row !== selectedRow);
    setRows(nextRows);
    setSelectedRow(null);
    rowTriggerRef.current = null;
    rowOffcanvasInstanceRef.current?.hide();
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  useEffect(() => {
    setRows(initialFormat.rowContainer);
    setSelectedRow(null);
    rowOffcanvasInstanceRef.current?.hide();
    setDragOverRow(null);
    draggedTemplateRef.current = null;
  }, [initialFormat]);

  const clearDrag = () => {
    draggedTemplateRef.current = null;
    setDragOverRow(null);
  };

  const handleDragOver = (event, rowIndex) => {
    if (error || draggedTemplateRef.current == null) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'copy';
    setDragOverRow(rowIndex);
  };

  const handleDrop = (event, rowIndex) => {
    if (error || draggedTemplateRef.current == null) return;
    event.preventDefault();
    event.stopPropagation();
    const row = {
      id: crypto.randomUUID(),
      hover: false,
      active: false,
      style: { paddingTop: '0px', paddingRight: '0px', paddingBottom: '0px', paddingLeft: '0px' },
      content: copyRowWithNewVariables(newRow[draggedTemplateRef.current], rows),
    };
    const nextRows = [...rows.slice(0, rowIndex + 1), row, ...rows.slice(rowIndex + 1)];
    setRows(nextRows);
    clearDrag();
    onChange?.({ ...initialFormat, rowContainer: nextRows });
  };

  return (
    <div className="setting-format-vue">
      <section
        ref={canvasRef}
        tabIndex={-1}
        className="setting-format-vue-canvas"
        aria-label="Formato del examen"
        onDragOver={(event) => handleDragOver(event, null)}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setDragOverRow(null);
        }}
        onDrop={(event) => handleDrop(event, rows.length - 1)}
      >
        {error ? <p className="text-danger" role="alert">{error}</p> : rows.length === 0 ? (
          <p>Este examen no tiene un formato definido.</p>
        ) : rows.map((row, rowIndex) => (
          <div
            className={`setting-format-vue-row${isRowHighlighted && selectedRow === row ? ' is-selected' : ''}`}
            key={row?.id ?? rowIndex}
            role="button"
            tabIndex={0}
            aria-label={`Configurar fila ${rowIndex + 1}`}
            aria-controls="setting-format-row-offcanvas"
            onClick={(event) => openRowSettings(event, row)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                openRowSettings(event, row);
              }
            }}
            style={{
              ...pickStyles(row?.style),
              ...(dragOverRow === rowIndex ? { border: '2px solid var(--text-primary)' } : {}),
            }}
            onDragOver={(event) => handleDragOver(event, rowIndex)}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) setDragOverRow(null);
            }}
            onDrop={(event) => handleDrop(event, rowIndex)}
          >
            <div className="setting-format-vue-row-content">
            {(Array.isArray(row?.content?.stageColumns) ? row.content.stageColumns : []).map((column, columnIndex) => {
              const span = Number(column?.col);
              const width = column?.style?.width || (span > 0 && span <= 12 ? `${span / 12 * 100}%` : undefined);
              const hasVariable = Array.isArray(column?.content)
                && column.content.some((item) => item?.type === 'variable');
              return (
                <div className="setting-format-vue-column" key={column?.id ?? columnIndex}
                  style={{
                    ...pickStyles(column?.style), width, flex: width ? '0 0 auto' : '1 1 0',
                    ...(hasVariable ? {
                      background: 'transparent',
                      border: '1px solid gray',
                      borderRadius: '4px',
                      paddingTop: column?.style?.paddingTop ?? '5px',
                      paddingBottom: column?.style?.paddingBottom ?? '5px',
                      paddingLeft: column?.style?.paddingLeft ?? '10px',
                      paddingRight: column?.style?.paddingRight ?? '10px',
                      fontSize: '12px',
                    } : {}),
                  }}>
                  {(Array.isArray(column?.content) ? column.content : []).map((item, itemIndex) => (
                    <div
                      className={`setting-format-vue-text${isElementHighlighted && settingsMode === 'element' && selectedRow === row && selectedColumnIndex === columnIndex && selectedElementIndex === itemIndex ? ' is-selected' : ''}`}
                      key={itemIndex}
                      role="button"
                      tabIndex={0}
                      aria-label="Configurar elemento"
                      aria-controls="setting-format-row-offcanvas"
                      onClick={(event) => openElementSettings(event, row, columnIndex, itemIndex)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          openElementSettings(event, row, columnIndex, itemIndex);
                        }
                      }}
                    >
                      {renderText(item?.text ?? item?.value ?? '')}
                    </div>
                  ))}
                </div>
              );
            })}
            </div>
          </div>
        ))}
      </section>
      <aside className="card setting-format-vue-sidebar" aria-label="Panel del formato">
        <div className="card-body">
          <p className="setting-format-template-heading">Seleccione presionando y arrastrando</p>
          <ul className="setting-format-template-list" aria-label="Modelos de fila">
            {newRow.map((row, index) => (
              <li
                key={index}
                className="setting-format-template"
                draggable
                onDragStart={(event) => {
                  draggedTemplateRef.current = index;
                  event.dataTransfer.effectAllowed = 'copy';
                  event.dataTransfer.setData('application/json', JSON.stringify(row));
                }}
                onDragEnd={clearDrag}
                aria-label={row.rowTitle || `Modelo ${index + 1}: ${row.cols} columnas`}
              >
                {row.rowTitle && <span className="setting-format-template-title">{row.rowTitle}</span>}
                <div className="setting-format-template-columns" aria-hidden="true">
                  {row.stageColumns.map((column) => (
                    <div
                      key={column.id}
                      className="setting-format-template-column"
                      style={{ ...column.style, border: '1px dashed #007c9f' }}
                    />
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div
        ref={rowOffcanvasRef}
        className="offcanvas offcanvas-end setting-format-row-offcanvas"
        tabIndex={-1}
        id="setting-format-row-offcanvas"
        aria-labelledby="setting-format-row-offcanvas-title"
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.stopPropagation();
        }}
      >
        <div className="offcanvas-header">
          <h5 className="offcanvas-title" id="setting-format-row-offcanvas-title">
            {settingsMode === 'element' ? 'Configuración de elemento' : 'Configuración de fila'}
          </h5>
          <div className="d-flex align-items-center gap-3 ms-auto ps-3">
            {settingsMode === 'row' && <>
            <RowActionButton
              type="button"
              className="setting-format-clone-row"
              aria-label="Clonar fila"
              title="Clonar la fila"
              disabled={!selectedRow}
              onClick={cloneSelectedRow}
            >
              <span className="ico ico-clone" aria-hidden="true" />
            </RowActionButton>
            <RowActionButton
              type="button"
              className="setting-format-delete-row"
              aria-label="Eliminar fila"
              title="Eliminar la fila"
              disabled={!selectedRow}
              onClick={deleteSelectedRow}
            >
              <span className="ico ico-trash1" aria-hidden="true" />
            </RowActionButton>
            </>}
            <button type="button" className="btn-close text-reset m-0" data-bs-dismiss="offcanvas" aria-label="Cerrar" />
          </div>
        </div>
        <div className="offcanvas-body">
          {settingsMode === 'element' && selectedElement && (
            <ElementSettings
              key={`${rows.indexOf(selectedRow)}-${selectedColumnIndex}-${selectedElementIndex}`}
              element={selectedElement}
              onChange={updateElement}
            />
          )}
          {settingsMode === 'row' && <>
          {selectedRow && (
            <fieldset className="setting-row-padding">
              <legend>Márgenes</legend>
              <div className="setting-row-padding-grid">
                {[
                  ['paddingLeft', 'Izquierdo'], ['paddingRight', 'Derecha'],
                  ['paddingTop', 'Arriba'], ['paddingBottom', 'Abajo'],
                ].map(([field, label]) => (
                  <RowPaddingControl
                    key={field}
                    label={label}
                    value={selectedRow.style?.[field] ?? 0}
                    onChange={(value) => updateRowPadding(field, value)}
                  />
                ))}
              </div>
            </fieldset>
          )}
          <hr className="setting-row-settings-divider" />
          {Array.isArray(selectedRow?.content?.stageColumns) && (
            <RowColumnsControl
              columns={selectedRow.content.stageColumns}
              selectedColumnIndex={selectedColumnIndex}
              onSelectColumn={setSelectedColumnIndex}
              onChange={updateColumnWidths}
            />
          )}
          {selectedColumn && (
            <fieldset className="setting-row-padding mt-4" aria-label="Márgenes de la columna seleccionada">
              <legend className="d-flex align-items-center justify-content-between">
                <span>Márgenes de columna</span>
                <RowActionButton
                  type="button"
                  className="setting-format-delete-row"
                  aria-label="Eliminar columna seleccionada"
                  title="Eliminar columna seleccionada"
                  disabled={selectedRow.content.stageColumns.length <= 1}
                  onClick={deleteSelectedColumn}
                >
                  <span className="ico ico-trash1" aria-hidden="true" />
                </RowActionButton>
              </legend>
              <div className="setting-row-padding-grid">
                {[
                  ['paddingLeft', 'Izquierdo'], ['paddingRight', 'Derecha'],
                  ['paddingTop', 'Arriba'], ['paddingBottom', 'Abajo'],
                ].map(([field, label]) => (
                  <RowPaddingControl
                    key={field}
                    label={label}
                    value={selectedColumn.style?.[field] ?? 0}
                    onChange={(value) => updateColumnStyle(field, `${value}px`)}
                  />
                ))}
              </div>
            </fieldset>
          )}
          {selectedColumn && (
            <div className="d-flex align-items-center justify-content-between mt-3">
              <span>Alinear:</span>
              <div className="btn-group setting-column-alignment" role="group" aria-label="Alineación de la columna">
                {[
                  ['left', 'Izquierda', 'ico-paragraph-left'],
                  ['center', 'Centro', 'ico-paragraph-center'],
                  ['right', 'Derecha', 'ico-paragraph-right'],
                ].map(([alignment, label, icon]) => (
                  <button
                    key={alignment}
                    type="button"
                    className={`btn${(selectedColumn.style?.textAlign ?? 'left') === alignment ? ' active' : ''}`}
                    aria-label={label}
                    aria-pressed={(selectedColumn.style?.textAlign ?? 'left') === alignment}
                    onClick={() => updateColumnStyle('textAlign', alignment)}
                  >
                    <span className={`ico ${icon}`} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </div>
          )}
          </>}
        </div>
      </div>
    </div>
  );
}
