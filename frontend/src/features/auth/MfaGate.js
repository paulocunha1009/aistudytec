import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Button, Card, Input } from '../../design-system';
import { enrollTotp, getMfaState, verifyTotp } from './authService';

const MfaGate = ({ identity, mfa, onVerified, children }) => {
  const [enrollment, setEnrollment] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const requiresAal2 = identity?.type === 'master' && mfa?.currentLevel !== 'aal2';
  const verifiedFactor = mfa?.factors?.find(factor => factor.status === 'verified');

  useEffect(() => {
    if (!requiresAal2 || verifiedFactor || enrollment) return;
    enrollTotp().then(setEnrollment).catch(nextError => setError(nextError.message));
  }, [requiresAal2, verifiedFactor, enrollment]);

  if (!requiresAal2) return children;

  const verify = async () => {
    setBusy(true);
    setError('');
    try {
      await verifyTotp({ factorId: verifiedFactor?.id || enrollment?.factorId, code });
      onVerified(await getMfaState());
    } catch (nextError) {
      setError(nextError.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#07111f] p-4 text-slate-900 sm:p-8">
      <Card className="mx-auto max-w-lg p-6 sm:p-8">
        <ShieldCheck size={44} className="text-blue-600" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-black">Proteção obrigatória da conta master</h1>
        <p className="mt-2 text-slate-600">A administração só será liberada após confirmação no aplicativo autenticador.</p>
        {!verifiedFactor && enrollment && <>
          <img src={enrollment.qrCode} alt="QR code para cadastrar o AISTUDYTEC no aplicativo autenticador" className="mx-auto my-5 max-w-64" />
          <details className="rounded-xl bg-slate-100 p-3 text-sm">
            <summary className="cursor-pointer font-bold">Não consigo ler o QR code</summary>
            <p className="mt-2 break-all font-mono">{enrollment.secret}</p>
          </details>
        </>}
        <div className="mt-5 space-y-4">
          <Input label="Código de seis dígitos" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={event => setCode(event.target.value.replace(/\D/g, ''))} error={error} />
          <Button className="w-full" disabled={busy || code.length !== 6} onClick={verify}>{busy ? 'Verificando…' : 'Confirmar identidade'}</Button>
          <p className="text-xs text-slate-500">Cadastre um segundo autenticador como recuperação. O Supabase não oferece códigos de recuperação TOTP.</p>
        </div>
      </Card>
    </main>
  );
};

export default MfaGate;

