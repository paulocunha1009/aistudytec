import React, { useEffect, useState } from 'react';
import { Button, Dialog, Input } from '../../design-system';
import { requestPasswordRecovery, signIn, updatePassword } from './authService';

const AuthDialog = ({ open, recoveryMode, onAuthenticated, onClose, onRecoveryComplete }) => {
  const [mode, setMode] = useState(recoveryMode ? 'update' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (recoveryMode) setMode('update');
  }, [recoveryMode]);

  const submit = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      if (mode === 'login') {
        onAuthenticated(await signIn({ email, password }));
        onClose();
      } else if (mode === 'recover') {
        await requestPasswordRecovery(email);
        setMessage('Se a conta existir, enviaremos instruções para redefinir a senha.');
      } else {
        if (password.length < 12) throw new Error('Use pelo menos 12 caracteres.');
        if (password !== confirmPassword) throw new Error('As senhas não coincidem.');
        await updatePassword(password);
        setMessage('Senha alterada. Você já pode continuar.');
        onRecoveryComplete();
      }
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  };

  const title = mode === 'login' ? 'Entrar no AISTUDYTEC' : mode === 'recover' ? 'Recuperar acesso' : 'Criar nova senha';
  return (
    <Dialog
      open={open}
      title={title}
      description="Identidade protegida pelo Supabase Auth."
      onClose={onClose}
      onSubmit={submit}
      actions={<>
        <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
        <Button type="submit" className="flex-1" disabled={busy}>{busy ? 'Aguarde…' : mode === 'login' ? 'Entrar' : 'Continuar'}</Button>
      </>}
    >
      <div className="space-y-4">
        {mode !== 'update' && <Input label="E-mail" type="email" autoComplete="email" required value={email} onChange={event => setEmail(event.target.value)} />}
        {mode !== 'recover' && <Input label={mode === 'update' ? 'Nova senha' : 'Senha'} type="password" autoComplete={mode === 'update' ? 'new-password' : 'current-password'} required value={password} onChange={event => setPassword(event.target.value)} />}
        {mode === 'update' && <Input label="Confirmar nova senha" type="password" autoComplete="new-password" required value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} />}
        {error && <p role="alert" className="text-sm font-semibold text-red-700">{error}</p>}
        {message && <p role="status" className="text-sm font-semibold text-emerald-700">{message}</p>}
        {mode === 'login' && <button type="button" className="text-sm font-bold text-blue-700 underline" onClick={() => setMode('recover')}>Esqueci minha senha</button>}
        {mode === 'recover' && <button type="button" className="text-sm font-bold text-blue-700 underline" onClick={() => setMode('login')}>Voltar ao login</button>}
      </div>
    </Dialog>
  );
};

export default AuthDialog;
