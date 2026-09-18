import { useId } from 'react';

export default function RowPaddingControl({ label, value, onChange }) {
  const inputId = useId();
  const parsed = Number.parseFloat(value);
  const amount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;

  return (
    <div className="setting-row-padding-control">
      <label htmlFor={inputId}>{label}</label>
      <div className="setting-row-padding-stepper">
        <button type="button" aria-label={`Disminuir ${label.toLowerCase()}`} disabled={amount === 0}
          onClick={() => onChange(Math.max(0, amount - 1))}>−</button>
        <input
          id={inputId}
          type="number"
          min="0"
          step="1"
          value={amount}
          onChange={(event) => {
            const next = Number(event.target.value);
            onChange(Number.isFinite(next) ? Math.max(0, next) : 0);
          }}
          onBlur={(event) => {
            if (event.target.value === '') onChange(0);
          }}
        />
        <button type="button" aria-label={`Aumentar ${label.toLowerCase()}`}
          onClick={() => onChange(amount + 1)}>+</button>
      </div>
    </div>
  );
}
