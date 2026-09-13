import { createElement, useMemo } from 'react';
import '../../styles/FormatVue.css';
const TEXT_TAGS = new Set(['p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li']);
const STYLE_KEYS = ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'textAlign', 'border', 'backgroundColor', 'color', 'fontSize', 'fontWeight', 'fontStyle', 'textDecoration', 'lineHeight'];

function pickStyles(style) {
  return Object.fromEntries(STYLE_KEYS
    .filter((key) => typeof style?.[key] === 'string' || typeof style?.[key] === 'number')
    .map((key) => [key, style[key]]));
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

export default function FormatVue({ format }) {
  const { rows, error } = useMemo(() => {
    if (format == null || format === '') return { rows: [] };
    try {
      const parsed = typeof format === 'string' ? JSON.parse(format) : format;
      if (!Array.isArray(parsed?.rowContainer)) throw new Error('Formato inválido');
      return { rows: parsed.rowContainer };
    } catch {
      return { rows: [], error: 'No se pudo mostrar el formato del examen.' };
    }
  }, [format]);

  return (
    <div className="setting-format-vue">
      <section className="setting-format-vue-canvas" aria-label="Formato del examen">
        {error ? <p className="text-danger" role="alert">{error}</p> : rows.length === 0 ? (
          <p>Este examen no tiene un formato definido.</p>
        ) : rows.map((row, rowIndex) => (
          <div className="setting-format-vue-row" key={row?.id ?? rowIndex} style={pickStyles(row?.style)}>
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
                      paddingTop: '5px',
                      paddingBottom: '5px',
                      paddingLeft: '10px',
                      paddingRight: '10px',
                      fontSize: '12px',
                    } : {}),
                  }}>
                  {(Array.isArray(column?.content) ? column.content : []).map((item, itemIndex) => (
                    <div className="setting-format-vue-text" key={itemIndex}>
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
        <div className="card-body" />
      </aside>
    </div>
  );
}
