import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabase } from '../../lib/supabase';
import { getMfaState, loadIdentity, signOut } from './authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [mfa, setMfa] = useState(null);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState('');

  const refreshIdentity = async (nextSession) => {
    if (!nextSession) {
      setSession(null);
      setIdentity(null);
      setMfa(null);
      return;
    }
    const [nextIdentity, nextMfa] = await Promise.all([loadIdentity(nextSession), getMfaState()]);
    setSession(nextSession);
    setIdentity(nextIdentity);
    setMfa(nextMfa);
  };

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return undefined;
    }

    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      try {
        if (active) await refreshIdentity(data.session);
      } catch (nextError) {
        if (active) setError(nextError.message);
      } finally {
        if (active) setLoading(false);
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
      window.setTimeout(() => {
        refreshIdentity(nextSession).catch(nextError => setError(nextError.message));
      }, 0);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const logout = async (scope = 'local') => {
    await signOut(scope);
    setSession(null);
    setIdentity(null);
    setMfa(null);
  };

  const value = useMemo(() => ({
    session,
    identity,
    mfa,
    loading,
    error,
    recoveryMode,
    setRecoveryMode,
    refreshIdentity: () => refreshIdentity(session),
    acceptLogin: ({ session: nextSession, identity: nextIdentity }) => {
      setSession(nextSession);
      setIdentity(nextIdentity);
      getMfaState().then(setMfa).catch(nextError => setError(nextError.message));
    },
    logout,
  }), [session, identity, mfa, loading, error, recoveryMode]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth deve ser usado dentro de AuthProvider.');
  return value;
};

