import React, { useEffect, useId, useRef } from 'react';
import Card from './Card';

const focusableSelector = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';

const Dialog = ({ open, title, description, onClose, onSubmit, children, actions, className = '' }) => {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previousFocus = document.activeElement;
    const panel = panelRef.current;
    panel?.querySelector(focusableSelector)?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeRef.current();
      if (event.key !== 'Tab') return;
      const focusable = [...panel.querySelectorAll(focusableSelector)];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previousFocus?.focus?.();
    };
  }, [open]);

  if (!open) return null;
  const Element = onSubmit ? 'form' : 'div';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4" role="presentation" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <Card
        as={Element}
        ref={undefined}
        className={`max-h-[90vh] w-full max-w-md overflow-y-auto p-6 sm:p-8 ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onSubmit={onSubmit ? e => { e.preventDefault(); onSubmit(e); } : undefined}
      >
        <div ref={panelRef}>
          <h2 id={titleId} className="text-xl font-bold text-slate-900">{title}</h2>
          {description && <p id={descriptionId} className="mt-2 text-sm text-slate-600">{description}</p>}
          <div className="mt-5">{children}</div>
          {actions && <div className="mt-6 flex gap-2">{actions}</div>}
        </div>
      </Card>
    </div>
  );
};

export default Dialog;
