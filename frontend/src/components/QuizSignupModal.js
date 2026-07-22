import React, { useState } from 'react';
import { User } from 'lucide-react';
import { Button, Dialog, Input } from '../design-system';

const QuizSignupModal = ({ onClose, onSubmit }) => {
  const [form, setForm] = useState({ name: '', email: '' });
  return (
    <Dialog open title="Identifique-se" description="Para salvar sua nota no quiz." onClose={onClose} onSubmit={() => onSubmit(form)} className="text-center" actions={<><Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button><Button type="submit" className="flex-1">Começar</Button></>}>
        <User size={48} className="mx-auto text-blue-500 mb-4" />
        <div className="space-y-4 text-left">
          <Input label="Nome" autoComplete="name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <Input label="E-mail" type="email" autoComplete="email" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        </div>
    </Dialog>
  );
};

export default QuizSignupModal;
