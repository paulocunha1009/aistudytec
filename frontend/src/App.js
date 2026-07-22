import React, { useEffect, useState } from 'react';
import { School } from 'lucide-react';
import { api } from './api/client';
import Sidebar from './components/Sidebar';
import Toast from './components/Toast';
import LoginModal from './components/LoginModal';
import QuizSignupModal from './components/QuizSignupModal';
import TopicBrowser from './components/student/TopicBrowser';
import StudyView from './components/student/StudyView';
import Quiz from './components/student/Quiz';
import ProgressView from './components/student/ProgressView';
import TeacherPanel from './components/teacher/TeacherPanel';
import { Button, Card, Input } from './design-system';

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const AISTUDYTECDashboard = () => {
  const apiUrl = API_URL;
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    api.session(apiUrl).then(({ user }) => {
      if (user) setCurrentUser({ type: user.type, data: user });
    }).catch(() => {});
  }, [apiUrl]);

  // Modais
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showQuizSignup, setShowQuizSignup] = useState(false);
  const [joinClassCode, setJoinClassCode] = useState('');

  // Estudo em andamento
  const [activeTopic, setActiveTopic] = useState(null);
  const [quizMode, setQuizMode] = useState(false);

  const addToast = (msg, type = 'info') => {
    const id = Date.now(); setToasts(p => [...p, { id, message: String(msg), type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const handleLogin = async (form) => {
    try {
      const data = await api.login(apiUrl, form);
      setCurrentUser({ type: data.user.type, data: data.user });
      setActiveTab(data.user.type === 'student' ? 'student-area' : 'teacher');
      setShowLoginModal(false);
      addToast("Login realizado", "success");
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleLogout = async () => {
    try { await api.logout(apiUrl); }
    catch (_) { /* a interface local ainda deve encerrar */ }
    setCurrentUser(null);
    setActiveTab('home');
    addToast('Sessão encerrada', 'success');
  };

  const handleJoinClass = async () => {
    try {
      const cls = await api.joinClass(apiUrl, joinClassCode);
      setCurrentUser({ type: 'student_guest', data: { classId: cls.id, name: 'Visitante' } });
      setActiveTab('student-area');
      addToast(`Entrou em: ${cls.name}`, "success");
    } catch (e) { addToast(e.message, "error"); }
  };

  const handleStartQuiz = () => {
    if (currentUser) { setQuizMode(true); return; }
    setShowQuizSignup(true);
  };

  const confirmQuizSignup = async (form) => {
    if (!form.name) return;
    try {
      const user = await api.register(apiUrl, { ...form, type: 'student', classCode: joinClassCode || undefined });
      setCurrentUser({ type: 'student', data: user });
      setShowQuizSignup(false);
      setQuizMode(true);
    } catch (e) { addToast(e.message, "error"); }
  };

  const finishQuiz = (result, destination = 'progress') => {
    setQuizMode(false);
    setActiveTopic(null);
    setActiveTab(destination === 'progress' ? 'student-area' : 'home');
    addToast(`Quiz concluído: ${result.score}/${result.total} (${result.percentage}%)`, "success");
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#eef3f8] font-sans text-slate-900">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab}
        currentUser={currentUser} onLogout={handleLogout} onOpenLogin={() => setShowLoginModal(true)} />
      <Toast toasts={toasts} removeToast={(id) => setToasts(p => p.filter(t => t.id !== id))} />

      <main className="app-canvas flex-1 overflow-y-auto px-4 pb-6 pt-20 md:p-6 lg:p-8">

        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow">
            <h2 className="text-2xl font-bold mb-4">Configurações</h2>
            <p className="text-slate-500">As configurações técnicas são administradas no ambiente de implantação.</p>
          </div>
        )}

        {activeTab === 'home' && !activeTopic && (
          <TopicBrowser apiUrl={apiUrl} currentUser={currentUser} onSelectTopic={setActiveTopic} addToast={addToast} />
        )}

        {activeTab === 'home' && activeTopic && (
          <StudyView topic={activeTopic} onBack={() => setActiveTopic(null)} onStartQuiz={handleStartQuiz} />
        )}

        {activeTab === 'student-area' && (
          <div className="max-w-2xl mx-auto">
            {!currentUser || !currentUser.data.classId ? (
              <Card className="p-6 text-center shadow-lg sm:p-8">
                <School size={64} className="mx-auto text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Entrar na Turma</h2>
                <p className="text-slate-500 mb-6">Digite o código fornecido pelo professor.</p>
                <div className="flex flex-col items-end gap-2 sm:flex-row">
                  <Input label="Código da turma" className="flex-1 text-left font-mono uppercase" placeholder="CÓDIGO" value={joinClassCode} onChange={e => setJoinClassCode(e.target.value)} />
                  <Button onClick={handleJoinClass}>Entrar</Button>
                </div>
              </Card>
            ) : (
              <ProgressView apiUrl={apiUrl} currentUser={currentUser} onOpenTopic={topic => { setActiveTopic(topic); setActiveTab('home'); }} onExplore={() => setActiveTab('home')} />
            )}
          </div>
        )}

        {activeTab === 'teacher' && (currentUser?.type === 'teacher' || currentUser?.type === 'master') && (
          <TeacherPanel apiUrl={apiUrl} currentUser={currentUser} addToast={addToast} />
        )}

        {/* MODAIS */}
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onSubmit={handleLogin} />}
        {showQuizSignup && <QuizSignupModal onClose={() => setShowQuizSignup(false)} onSubmit={confirmQuizSignup} />}

        {quizMode && activeTopic && (
          <Quiz topic={activeTopic} currentUser={currentUser} apiUrl={apiUrl} addToast={addToast}
            onClose={() => setQuizMode(false)} onFinish={finishQuiz} />
        )}

      </main>
    </div>
  );
};

export default AISTUDYTECDashboard;
