import React from 'react';
import Button from './Button';
import Dialog from './Dialog';

const ConfirmDialog = ({ open, title, description, confirmLabel = 'Confirmar', cancelLabel = 'Cancelar', tone = 'danger', busy = false, onConfirm, onCancel }) => (
  <Dialog
    open={open}
    title={title}
    description={description}
    onClose={onCancel}
    actions={<><Button variant="secondary" className="flex-1" onClick={onCancel} disabled={busy}>{cancelLabel}</Button><Button variant={tone} className="flex-1" onClick={onConfirm} loading={busy}>{confirmLabel}</Button></>}
  />
);

export default ConfirmDialog;
