import { useState } from "react";

export function NumericField({ field, value, onChange }) {
  const [touched, setTouched] = useState(false);
  const invalid = value === "" || Number.isNaN(Number(value)) || value < field.min || value > field.max;

  const commit = (raw) => {
    if (raw === "") { onChange(""); return; }
    onChange(Number(raw));
  };

  return (
    <div className="rounded-xl border border-[#22262f] bg-[#0F1118] p-4 transition-colors focus-within:border-cyan-500/50">
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={`field-${field.key}`}
          className="text-xs font-medium text-slate-300"
        >
          {field.label}
        </label>
        <div className="flex items-baseline gap-1.5">
          <input
            id={`field-${field.key}`}
            type="number"
            min={field.min}
            max={field.max}
            step={field.step}
            value={value}
            onBlur={() => setTouched(true)}
            onChange={(event) => commit(event.target.value)}
            className="w-20 rounded-lg border border-[#262A38] bg-[#0A0B10] px-2 py-1 text-right font-mono text-sm text-white transition-colors focus:border-cyan-500/70 focus:outline-none"
            data-testid={`${field.key}-input`}
            aria-invalid={invalid}
            aria-describedby={`hint-${field.key}`}
          />
          <span className="w-14 text-[11px] text-slate-500">{field.unit}</span>
        </div>
      </div>
      <input
        type="range"
        min={field.min}
        max={field.max}
        step={field.step}
        value={invalid ? field.min : value}
        onChange={(event) => commit(event.target.value)}
        className="mt-4 w-full"
        aria-label={`${field.label} slider`}
        data-testid={`${field.key}-slider`}
      />
      <div className="mt-2 flex items-center justify-between">
        <p id={`hint-${field.key}`} className="text-[11px] text-slate-500">
          {field.hint || `${field.min} – ${field.max} ${field.unit}`}
        </p>
        {touched && invalid && (
          <p className="text-[11px] text-red-400" role="alert" data-testid={`${field.key}-error`}>
            Enter {field.min}–{field.max}
          </p>
        )}
      </div>
    </div>
  );
}
