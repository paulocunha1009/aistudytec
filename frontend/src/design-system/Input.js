import React, { useId } from 'react';

const Input = React.forwardRef(({ label, hint, error, id, className = '', ...props }, ref) => {
  const generatedId = useId();
  const inputId = id || generatedId;
  const descriptionId = `${inputId}-description`;

  return (
    <div className={`w-full ${className}`}>
      {label && <label htmlFor={inputId} className="mb-1.5 block text-sm font-bold text-slate-700">{label}</label>}
      <input
        ref={ref}
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={(hint || error) ? descriptionId : undefined}
        className={`min-h-11 w-full rounded-xl border bg-white px-3 py-2.5 text-slate-900 placeholder:text-slate-400 ${error ? 'border-red-500' : 'border-slate-300 hover:border-slate-400'}`}
        {...props}
      />
      {(hint || error) && <p id={descriptionId} className={`mt-1 text-sm ${error ? 'text-red-600' : 'text-slate-500'}`}>{error || hint}</p>}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
