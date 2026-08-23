import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import useAuth from '../../context/useAuth';
import { getExam, updateExam } from '../../services/patientsService';

const RESULT_INLINE_STYLES = {
  'patient-exam-format-row': 'display:flex;width:100%;min-height:48px;align-items:center;gap:5px',
  'patient-exam-format-column': 'min-width:0',
  'patient-exam-format-text': 'margin:0;color:#292c33',
  'patient-exam-format-label': 'font-weight:600',
};

const appendInlineStyle = (element, style) => {
  if (!style) return;
  const currentStyle = element.getAttribute('style')?.replace(/;\s*$/, '') ?? '';
  element.setAttribute('style', currentStyle ? `${currentStyle};${style}` : style);
};

const firstValue = (source, keys) => {
  for (const key of keys) {
    if (source?.[key] != null && source[key] !== '') return source[key];
  }
  return '';
};

const getRows = (exam) => {
  const collection = ['results', 'items', 'details', 'values']
    .map((key) => exam?.[key])
    .find(Array.isArray);
  const entries = collection ?? (exam ? [exam] : []);

  return entries.map((item, index) => ({
    id: item?.id ?? index,
    description: firstValue(item, ['description', 'name', 'label', 'parameter']),
    reference: firstValue(item, [
      'reference_value',
      'referenceValue',
      'reference_range',
      'referenceRange',
      'reference',
    ]),
  }));
};

const parseFormat = (format) => {
  let parsedFormat = format;

  for (let attempt = 0; attempt < 2 && typeof parsedFormat === 'string'; attempt += 1) {
    if (!parsedFormat.trim()) return null;
    try {
      parsedFormat = JSON.parse(parsedFormat);
    } catch (error) {
      console.error('El formato del examen no contiene JSON válido:', error);
      return null;
    }
  }

  return parsedFormat && typeof parsedFormat === 'object' ? parsedFormat : null;
};

const findDeepValue = (source, key, visited = new Set()) => {
  if (!source || typeof source !== 'object' || visited.has(source)) return undefined;
  visited.add(source);

  if (Object.prototype.hasOwnProperty.call(source, key)) return source[key];

  for (const value of Object.values(source)) {
    const match = findDeepValue(value, key, visited);
    if (match !== undefined) return match;
  }

  return undefined;
};

const normalizeExam = (response) => {
  const candidate = response?.exam ?? response?.data ?? response;
  if (Array.isArray(candidate)) return candidate[0] ?? null;
  return candidate && typeof candidate === 'object' ? candidate : null;
};

const getColumnStyle = (column) => ({
  width: column?.style?.width || (column?.col ? `${(Number(column.col) / 12) * 100}%` : '100%'),
  textAlign: column?.style?.textAlign || 'left',
  paddingTop: column?.style?.paddingTop || 0,
  paddingRight: column?.style?.paddingRight || 0,
  paddingBottom: column?.style?.paddingBottom || 0,
  paddingLeft: column?.style?.paddingLeft || 0,
});

function FormatControl({ control, controlId }) {
  if (control?.type !== 'variable') {
    return (
      <div
        className={`patient-exam-format-text patient-exam-format-${control?.type ?? 'text'}`}
        dangerouslySetInnerHTML={{ __html: control?.text ?? '' }}
      />
    );
  }

  if (control.autocompletion && Array.isArray(control.autocompletionList)
    && control.autocompletionList.length > 0) {
    const autocompleteId = `${controlId}-options`;

    return (
      <>
        <input
          className="form-control"
          id={controlId}
          type="text"
          list={autocompleteId}
          autoComplete="off"
        />
        <datalist id={autocompleteId}>
          {(control.autocompletionList ?? []).map((option, index) => (
            <option value={option.text} key={`${option.text}-${index}`} />
          ))}
        </datalist>
      </>
    );
  }

  return (
    <input
      className="form-control"
      id={controlId}
      type={control.numeric ? 'number' : 'text'}
      step={control.numeric && control.allowDecimal ? 'any' : undefined}
    />
  );
}

function FormatVue({ format }) {
  const rows = format?.rowContainer ?? [];

  return (
    <div className="v-card__text patient-exam-format">
      {rows.map((row, rowIndex) => (
        <div
          className="patient-exam-format-row"
          key={row.id ?? rowIndex}
          style={{
            paddingTop: row?.style?.paddingTop || 0,
            paddingRight: row?.style?.paddingRight || 0,
            paddingBottom: row?.style?.paddingBottom || 0,
            paddingLeft: row?.style?.paddingLeft || 0,
          }}
        >
          {(row?.content?.stageColumns ?? []).map((column, columnIndex) => (
            <div
              className="patient-exam-format-column"
              key={column.id ?? columnIndex}
              style={getColumnStyle(column)}
            >
              {(column.content ?? []).map((control, controlIndex) => (
                <FormatControl
                  control={control}
                  controlId={`exam-field-${row.id ?? rowIndex}-${column.id ?? columnIndex}-${controlIndex}`}
                  key={`${control.type ?? 'content'}-${controlIndex}`}
                />
              ))}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

const createResultHTML = (source) => {
  const clone = source.cloneNode(true);

  const originalInputs = source.querySelectorAll('input');
  clone.querySelectorAll('input').forEach((input, index) => {
    const value = originalInputs[index]?.value ?? '';
    const span = document.createElement('span');
    span.setAttribute(
      'style',
      'display:block;width:100%;min-height:40px;padding:.375rem .75rem;color:#212529;'
      + 'background:#fff;border:1px solid #dee2e6;border-radius:.375rem',
    );
    span.textContent = value;
    input.replaceWith(span);
  });

  clone.querySelectorAll('datalist').forEach((list) => list.remove());
  clone.querySelectorAll('*').forEach((element) => {
    element.classList.forEach((className) => {
      appendInlineStyle(element, RESULT_INLINE_STYLES[className]);
    });

    if (element.tagName === 'P') appendInlineStyle(element, 'margin:0;color:#292c33');

    element.removeAttribute('class');
    element.removeAttribute('id');
    element.removeAttribute('list');
    element.removeAttribute('autocomplete');
  });

  return clone.innerHTML
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim();
};

function Examen({ examId, processedId: selectedProcessedId, onRegistered }) {
  const { session } = useAuth();
  const [exam, setExam] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const requestId = useRef(0);
  const formatRef = useRef(null);

  useEffect(() => {
    const currentRequestId = requestId.current + 1;
    requestId.current = currentRequestId;

    if (examId == null) {
      setExam(null);
      setIsLoading(false);
      return undefined;
    }

    const loadExam = async () => {
      setExam(null);
      setIsLoading(true);

      try {
        const response = await getExam(examId);
        const loadedExam = normalizeExam(response);
        if (requestId.current === currentRequestId) {
          setExam(loadedExam);
        }
      } catch (error) {
        console.error('No fue posible obtener el examen:', error);
        if (requestId.current === currentRequestId) setExam(null);
      } finally {
        if (requestId.current === currentRequestId) setIsLoading(false);
      }
    };

    loadExam();
    return undefined;
  }, [examId]);

  if (examId == null) return null;

  const rows = getRows(exam);
  const responseProcessedId = findDeepValue(exam, 'processed_id');
  const processedId = responseProcessedId ?? selectedProcessedId;
  const formatVue = findDeepValue(exam, 'format_vue');
  const pendingFormat = Number(processedId) === 0
    ? parseFormat(formatVue)
    : null;
  const result = findDeepValue(exam, 'result');

  const handleRegister = async () => {
    const formatContent = formatRef.current?.querySelector('.v-card__text');
    const userId = session?.user?.id;
    if (!formatContent || !pendingFormat || !userId || isSaving) return;

    const resultHTML = createResultHTML(formatContent);
    const data = {
      result: resultHTML,
      processed_id: userId,
      status: 1,
      size: Number(pendingFormat.rowCount) || (pendingFormat.rowContainer ?? []).length,
    };

    setIsSaving(true);
    try {
      const response = await updateExam(examId, data);
      const updatedExam = normalizeExam(response);
      setExam(updatedExam ?? { ...exam, ...data });
      await onRegistered?.(examId, data);
      toast.success('Examen registrado correctamente.');
    } catch (error) {
      console.error('No fue posible registrar el examen:', error);
      toast.error('No fue posible registrar el examen.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <article className="card card-white patient-exam-card" aria-busy={isLoading}>
      <div className="card-header patient-exam-card-header">
        <span>DESCRIPCION</span>
        <span>VALOR DE REFERENCIA</span>
      </div>
      <div className="card-body patient-exam-card-body" ref={formatRef}>
        {isLoading && <p className="patient-exam-card-message">Cargando examen...</p>}
        {!isLoading && pendingFormat && <FormatVue format={pendingFormat} />}
        {!isLoading && !pendingFormat && typeof result === 'string' && result.trim() && (
          <div dangerouslySetInnerHTML={{ __html: result }} />
        )}
        {!isLoading && !pendingFormat && !(typeof result === 'string' && result.trim()) && rows.map((row) => (
          <div className="patient-exam-card-row" key={row.id}>
            <span>{row.description}</span>
            <span>{row.reference}</span>
          </div>
        ))}
        {!isLoading && !pendingFormat && rows.length === 0 && (
          <p className="patient-exam-card-message">No hay información para este examen.</p>
        )}
      </div>
      <div className="card-footer patient-exam-card-footer">
        {pendingFormat && (
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSaving || !session?.user?.id}
            onClick={handleRegister}
          >
            {isSaving ? 'REGISTRANDO...' : 'REGISTRAR'}
          </button>
        )}
      </div>
    </article>
  );
}

export default Examen;
