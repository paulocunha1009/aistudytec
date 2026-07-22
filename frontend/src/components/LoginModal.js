import React, { useState } from 'react';
import { Button, Dialog, Input } from '../design-system';

const LoginModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({ user: '', pass: '' });
  return (
    <Dialog open title="Login do professor" onClose={onClose} onSubmit={() => onSubmit(form)} actions={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button><Button type="submit" className="flex-1">Entrar</Button></>}>
        <div className="space-y-4">
          <Input label="Usuário" autoComplete="username" required value={form.user} onChange={e => setForm({ ...form, user: e.target.value })} />
          <Input label="Senha" type="password" autoComplete="current-password" required value={form.pass} onChange={e => setForm({ ...form, pass: e.target.value })} />
        </div>
    </Dialog>
  );
};

export default LoginModal;
