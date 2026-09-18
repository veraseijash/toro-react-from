import { useId, useRef, useState } from 'react';
import WorksheetEditor from './WorksheetEditor';

export default function ElementSettings({ element, onChange }) {
  const id = useId();
  const initialText = useRef(element.text ?? '');
  const [editingOption, setEditingOption] = useState(null);
  const kind = element.isFormula ? 'formula' : element.numeric ? 'numeric'
    : element.autocompletion ? 'autocomplete' : 'text';
  const decimals = Math.max(0, Number(element.decimalLimit) || 0);
  const options = Array.isArray(element.autocompletionList) ? element.autocompletionList : [];
  const changeKind = (value) => onChange({
    numeric: value === 'numeric', isFormula: value === 'formula',
    autocompletion: value === 'autocomplete',
  });

  return (
    <div className="setting-element-settings">
      <div className="mb-3">
        <label className="form-label" htmlFor={`${id}-type`}>Tipo</label>
        <select id={`${id}-type`} className="form-select" value={element.type ?? 'label'}
          onChange={(event) => onChange({ type: event.target.value })}>
          {Object.entries({ label: 'Título', description: 'Descripción', variable: 'Variable', units: 'Unidades', vr: 'VR' })
            .map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>
      <div className="mb-3">
        <WorksheetEditor compact initialValue={initialText.current} onChange={(text) => onChange({ text })} />
      </div>
      <div className="mb-4">
        <label className="form-label" htmlFor={`${id}-value`}>Etiqueta</label>
        <input id={`${id}-value`} className="form-control" value={element.value ?? ''}
          onChange={(event) => onChange({ value: event.target.value })} />
      </div>
      {element.type === 'variable' && <>
        <fieldset className="mb-4">
          <legend className="fs-6">Tipo de variable</legend>
          {Object.entries({ text: 'Texto', numeric: 'Numérico', formula: 'Fórmula', autocomplete: 'Autocompletación' })
            .map(([value, label]) => (
              <div className="form-check mb-2" key={value}>
                <input className="form-check-input" type="radio" name={`${id}-kind`} id={`${id}-${value}`}
                  checked={kind === value} onChange={() => changeKind(value)} />
                <label className="form-check-label" htmlFor={`${id}-${value}`}>{label}</label>
              </div>
            ))}
        </fieldset>
        {(kind === 'numeric' || kind === 'formula') && <>
          <div className="form-check mb-3">
            <input className="form-check-input" type="checkbox" id={`${id}-decimals`} checked={decimals > 0}
              onChange={(event) => onChange({ decimalLimit: event.target.checked ? 1 : 0, allowDecimal: event.target.checked })} />
            <label className="form-check-label" htmlFor={`${id}-decimals`}>Tiene decimales</label>
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor={`${id}-limit`}>Número de decimales</label>
            <input className="form-control" type="number" min="0" step="1" id={`${id}-limit`}
              value={decimals} disabled={decimals === 0} onChange={(event) => {
                const value = Number(event.target.value);
                if (Number.isInteger(value) && value >= 0) onChange({ decimalLimit: value, allowDecimal: value > 0 });
              }} />
          </div>
        </>}
        {kind === 'formula' && <div className="mb-3">
          <label className="form-label" htmlFor={`${id}-formula`}>Escriba la fórmula</label>
          <input className="form-control" id={`${id}-formula`} value={element.formula ?? ''}
            onChange={(event) => onChange({ formula: event.target.value })} />
        </div>}
        {kind === 'autocomplete' && <>
          <div className="form-label">Lista de opciones</div>
          <ul className="list-group mb-3">
            {options.map((option, index) => (
              <li className="list-group-item d-flex align-items-center gap-2" key={index}>
                {editingOption === index ? (
                  <input className="form-control form-control-sm" aria-label={`Autocompletación ${index + 1}`}
                    autoFocus value={option.text ?? ''}
                    onChange={(event) => onChange({ autocompletionList: options.map((entry, i) => i === index ? { ...entry, text: event.target.value } : entry) })}
                    onKeyDown={(event) => { if (event.key === 'Enter') setEditingOption(null); }} />
                ) : <span className="flex-grow-1 text-break">{option.text}</span>}
                <button className="btn btn-sm btn-primary" type="button" aria-label={editingOption === index ? 'Terminar edición' : `Editar opción ${index + 1}`}
                  onClick={() => setEditingOption(editingOption === index ? null : index)}>
                  {editingOption === index ? 'Listo' : 'Editar'}
                </button>
                <button className="btn btn-sm btn-danger" type="button" aria-label={`Eliminar opción ${index + 1}`}
                  onClick={() => {
                    onChange({ autocompletionList: options.filter((_, i) => i !== index) });
                    setEditingOption(null);
                  }}><span className="ico ico-trash1" aria-hidden="true" /></button>
              </li>
            ))}
          </ul>
          <button type="button" className="btn btn-primary" onClick={() => onChange({
            autocompletionList: [...options, { text: 'Nueva autocompletación' }],
          })}>AGREGAR</button>
        </>}
      </>}
    </div>
  );
}
