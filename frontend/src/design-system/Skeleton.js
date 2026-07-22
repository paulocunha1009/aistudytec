import React from 'react';

const Skeleton = ({ lines = 3, label = 'Carregando conteúdo', className = '' }) => (
  <div role="status" aria-label={label} className={`animate-pulse space-y-3 ${className}`}>
    {Array.from({ length: lines }, (_, index) => <div key={index} aria-hidden="true" className={`h-4 rounded bg-slate-200 ${index === lines - 1 ? 'w-2/3' : 'w-full'}`} />)}
    <span className="sr-only">{label}</span>
  </div>
);

export default Skeleton;
