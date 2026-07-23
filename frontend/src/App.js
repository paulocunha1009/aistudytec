import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import PrivateAccessPortal from './components/PrivateAccessPortal';
import Toast from './components/Toast';
import TopicBrowser from './components/student/TopicBrowser';
import StudyView from './components/student/StudyView';
import Quiz from './components/student/Quiz';
import ProgressView from './components/student/ProgressView';
import TeacherPanel from './components/teacher/TeacherPanel';
import AccessManagement from './components/master/AccessManagement';
import { Button, Card } from './design-system';
import AuthDialog from './features/auth/AuthDialog';
import MfaGate from './features/auth/MfaGate';
import { useAuth } from './features/auth/AuthProvider';
import { isSupabaseConfigured } from './lib/supabase';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AISTUDYTECDashboard = () => {
  const apiUrl = API_URL;
  const auth = useAuth();
  const currentUser = auth.identity ? { type: auth.identity.type, data: auth.identity } : null;
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [toasts, setToasts] = useState([]);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [activeTopic, setActiveTopic] = useState(null);
  const [quizMode, setQuizMode] = useState(false);

  const addToast = (msg, type = 'info') => {
    const id = Date.now();
    setToasts(previous => [...previous, { id, message: String(msg), type }]);
    setTimeout(() => setToasts(previous => previous.filter(toast => toast.id !== id)), 3000);
  };

  const handleLogin = (result) => {
    auth.acceptLogin(result);
    setActiveTab(result.identity.type === 'student' ? 'student-area' : 'teacher');
    setShowLoginModal(false);
    addToast('Login realizado', 'success');
  };

  const handleLogout = async (scope = 'local') => {
    try {
      await auth.logout(scope);
      setActiveTab('home');
      addToast(scope === 'global' ? 'Todas as sessões foram encerradas' : 'Sessão encerrada', 'success');
    } catch (error) {
      addToast(error.message, 'error');
    }
  };

  const handleStartQuiz = () => {
    if (currentUser) {
      setQuizMode(true);
      return;
    }
    setShowLoginModal(true);
  };

  const finishQuiz = (result, destination = 'progress') => {
    setQuizMode(false);
    setActiveTopic(null);
    setActiveTab(destination === 'progress' ? 'student-area' : 'home');
    addToast(`Quiz concluído: ${result.score}/${result.total} (${result.percentage}%)`, 'success');
  };

  const content = (
    <div className="flex h-screen overflow-hidden bg-[#eef3f8] font-sans text-slate-900">
      <Sidebar
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <Toast toasts={toasts} removeToast={id => setToasts(previous => previous.filter(toast => toast.id !== id))} />

      <main className="app-canvas flex-1 overflow-y-auto px-4 pb-6 pt-20 md:p-6 lg:p-8">
        {activeTab === 'settings' && (
          <Card className="mx-auto max-w-xl p-6 shadow-lg sm:p-8">
            <h2 className="text-2xl font-bold">Conta e segurança</h2>
            {!isSupabaseConfigured && <p role="alert" className="mt-4 rounded-xl bg-amber-50 p-3 text-amber-900">Supabase não configurado neste ambiente.</p>}
            {!currentUser ? (
              <div className="mt-5">
                <p className="text-slate-600">Entre para gerenciar sua sessão e proteção da conta.</p>
                <Button className="mt-4" onClick={() => setShowLoginModal(true)}>Entrar</Button>
              </div>
            ) : (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="font-bold">{currentUser.data.name}</p>
                  <p className="text-sm text-slate-600">{currentUser.data.email}</p>
                  <p className="mt-2 text-sm">Nível da sessão: <strong>{auth.mfa?.currentLevel || 'verificando'}</strong></p>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={() => handleLogout('local')}>Sair deste dispositivo</Button>
                  <Button variant="danger" onClick={() => handleLogout('global')}>Encerrar todas as sessões</Button>
                </div>
              </div>
            )}
          </Card>
        )}

        {activeTab === 'home' && !activeTopic && (
          <TopicBrowser onSelectTopic={setActiveTopic} addToast={addToast} />
        )}

        {activeTab === 'home' && activeTopic && (
          <StudyView topic={activeTopic} onBack={() => setActiveTopic(null)} onStartQuiz={handleStartQuiz} />
        )}

        {activeTab === 'student-area' && (
          <ProgressView currentUser={currentUser} onOpenTopic={topic => { setActiveTopic(topic); setActiveTab('home'); }} onExplore={() => setActiveTab('home')} />
        )}

        {activeTab === 'teacher' && (currentUser?.type === 'teacher' || currentUser?.type === 'master') && (
          <TeacherPanel apiUrl={apiUrl} currentUser={currentUser} addToast={addToast} />
        )}

        {activeTab === 'access-management' && currentUser?.type === 'master' && (
          <AccessManagement currentUser={currentUser} addToast={addToast} />
        )}

        <AuthDialog
          open={showLoginModal || auth.recoveryMode}
          recoveryMode={auth.recoveryMode}
          onClose={() => { setShowLoginModal(false); auth.setRecoveryMode(false); }}
          onAuthenticated={handleLogin}
          onRecoveryComplete={() => auth.setRecoveryMode(false)}
        />

        {quizMode && activeTopic && (
          <Quiz
            topic={activeTopic}
            addToast={addToast}
            onClose={() => setQuizMode(false)}
            onFinish={finishQuiz}
          />
        )}
      </main>
    </div>
  );

  if (auth.loading) {
    return <main className="grid min-h-screen place-items-center bg-[#07111f] text-white"><p role="status">Protegendo sua sessão…</p></main>;
  }

  if (!currentUser) {
    return <>
      <PrivateAccessPortal onOpenLogin={() => setShowLoginModal(true)} error={auth.error} />
      <AuthDialog
        open={showLoginModal || auth.recoveryMode}
        recoveryMode={auth.recoveryMode}
        onClose={() => { setShowLoginModal(false); auth.setRecoveryMode(false); }}
        onAuthenticated={handleLogin}
        onRecoveryComplete={() => auth.setRecoveryMode(false)}
      />
    </>;
  }

  return <MfaGate identity={auth.identity} mfa={auth.mfa} onVerified={auth.refreshIdentity}>{content}</MfaGate>;
};

export default AISTUDYTECDashboard;
