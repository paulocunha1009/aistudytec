import React from 'react';

const Progress = ({ value, max = 100, label = 'Progresso', className = '' }) => {
  const safeMax = max > 0 ? max : 100;
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), safeMax);
  const percentage = Math.round((safeValue / safeMax) * 100);
  return (
    <div className={className}>
      <div className="mb-1 flex justify-between gap-4 text-sm font-medium text-slate-700"><span>{label}</span><span>{percentage}%</span></div>
      <div className="h-2.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={label} aria-valuemin="0" aria-valuemax={safeMax} aria-valuenow={safeValue}>
        <div className="h-full rounded-full bg-blue-600 transition-[width]" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
};

export default Progress;
