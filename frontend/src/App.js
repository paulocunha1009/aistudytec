import React, { useState, useEffect, useRef } from 'react';
import { 
  BookOpen, Zap, List, HelpCircle, CheckCircle, Search, RotateCcw, 
  ArrowUp, Lightbulb, Brain, ChevronRight, Settings, AlertTriangle, 
  Activity, Layers, Monitor, Briefcase, GraduationCap, Map, BarChart2,
  Calendar, FileText, CheckSquare, XCircle, Trophy, Play, MousePointerClick,
  Youtube, User, Lock, LogOut, History, TrendingUp, Users, ExternalLink, Sparkles,
  Clock, Download, Share2, Award, UserPlus, Trash2, Filter,
  Moon, Sun, Menu, X, Info, Check, Printer, Mail, Phone, CalendarDays,
  School, Hash, ClipboardList, Key, Bookmark, PenTool, Cpu, CircuitBoard, LogIn
} from 'lucide-react';

// --- CONFIGURAÇÃO DA API ---
// No CodeSandbox, substitua isso pela URL que aparecerá na aba "Ports" do backend
// Exemplo: "https://5000-seunome-seurepo.csb.app"
const DEFAULT_API_URL = "http://localhost:5000";

const Toast = ({ toasts, removeToast }) => (
  <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none notranslate">
    {toasts.map((toast) => (
      <div key={toast.id} className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-2xl border transition-all duration-500 animate-slide-in ${toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-blue-50 border-blue-200 text-blue-800'}`}>
        <p className="text-sm font-medium">{typeof toast.message === 'string' ? toast.message : 'Evento'}</p>
        <button onClick={() => removeToast(toast.id)}><X size={16}/></button>
      </div>
    ))}
  </div>
);

// Sidebar Component
const Sidebar = ({ isOpen, setIsOpen, activeTab, setActiveTab, currentUser, onLogout, onOpenLogin }) => (
  <div className={`fixed md:relative z-50 h-full bg-white border-r transition-all duration-300 ease-in-out flex flex-col ${isOpen ? 'w-72' : 'w-0 md:w-24'} overflow-hidden`}>
    <div className="p-6 h-24 border-b flex items-center justify-between">
      <div className="flex items-center gap-2 text-blue-900 font-black text-xl"><CircuitBoard/> AISTUDYTEC</div>
      <button onClick={() => setIsOpen(!isOpen)}><Menu/></button>
    </div>
    <nav className="flex-1 p-4 space-y-2">
      <button onClick={() => setActiveTab('home')} className={`w-full flex items-center gap-4 p-3 rounded-xl font-bold ${activeTab === 'home' ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-50'}`}><BookOpen/> Sala de Aula</button>
      <button onClick={() => setActiveTab('student-area')} className={`w-full flex items-center gap-4 p-3 rounded-xl font-bold ${activeTab === 'student-area' ? 'bg-teal-50 text-teal-600' : 'text-slate-500 hover:bg-slate-50'}`}><GraduationCap/> Minha Turma</button>
      {(currentUser?.type === 'teacher' || currentUser?.type === 'master') ? (
        <button onClick={() => setActiveTab('teacher')} className="w-full flex items-center gap-4 p-3 rounded-xl font-bold bg-purple-50 text-purple-600"><Briefcase/> Gestão</button>
      ) : (
        <button onClick={onOpenLogin} className="w-full flex items-center gap-4 p-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50"><Lock/> Professor</button>
      )}
      <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 p-3 rounded-xl font-bold ${activeTab === 'settings' ? 'bg-slate-100' : 'text-slate-500 hover:bg-slate-50'}`}><Settings/> Config</button>
    </nav>
    {currentUser && <div className="p-4 border-t"><button onClick={onLogout} className="w-full flex gap-2 text-red-500 font-bold"><LogOut/> Sair</button></div>}
  </div>
);

const AISTUDYTECDashboard = () => {
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [toasts, setToasts] = useState([]);
  
  // Data
  const [inputText, setInputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [dashboardData, setDashboardData] = useState({ classes: [], history: [] });

  // Modais
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
  const [showQuizSignup, setShowQuizSignup] = useState(false);
  const [quizSignupData, setQuizSignupData] = useState({ name: '', email: '' });
  const [joinClassCode, setJoinClassCode] = useState('');
  
  // Professor
  const [showClassModal, setShowClassModal] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassTheme, setNewClassTheme] = useState('');
  
  // Quiz
  const [quizMode, setQuizMode] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showQuizResult, setShowQuizResult] = useState(false);

  // API Key (Gemini)
  const [apiKey, setApiKey] = useState('');

  useEffect(() => {
    if(currentUser) fetchDashboardData();
    // Inject Tailwind
    if (!document.getElementById('tailwind-script')) {
      const s = document.createElement('script'); s.id='tailwind-script'; s.src="https://cdn.tailwindcss.com"; document.head.appendChild(s);
    }
  }, [currentUser]);

  const addToast = (msg, type='info') => {
    const id = Date.now(); setToasts(p => [...p, { id, message: String(msg), type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000);
  };

  const fetchDashboardData = async () => {
    try {
      const [cRes, hRes] = await Promise.all([
        fetch(`${apiUrl}/api/classes${currentUser.type==='teacher'?`?teacherId=${currentUser.data.id}`:''}`),
        fetch(`${apiUrl}/api/history${currentUser.type!=='master'&&currentUser.type!=='teacher'?`?userId=${currentUser.data.id}`:''}`)
      ]);
      if(cRes.ok && hRes.ok) setDashboardData({ classes: await cRes.json(), history: await hRes.json() });
    } catch(e) { console.error(e); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${apiUrl}/api/login`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(loginForm) });
      const data = await res.json();
      if(res.ok) {
        setCurrentUser({ type: data.user.type, data: data.user });
        setActiveTab(data.user.type === 'student' ? 'student-area' : 'teacher');
        setShowLoginModal(false);
        addToast("Login OK", "success");
      } else addToast(data.error, "error");
    } catch(e) { addToast("Erro de conexão. Verifique a URL da API.", "error"); }
  };

  const handleGenerate = async (manualTheme) => {
    const theme = manualTheme || inputText;
    if(!theme || !apiKey) { setActiveTab('settings'); return addToast("Configure a API Key", "error"); }
    setIsGenerating(true);
    try {
      const prompt = `Gere JSON aula sobre "${theme}": { "topic": "...", "module3_explanation": {"simple":"...","technical":"...","advanced":"..."}, "module6_quiz": {"questions": [{"q":"...","options":["..."],"correct":"A","difficulty":"Fácil"}], "answerKey": [{"id":1,"correct":"A","explanation":"..."}] } }`;
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
      });
      const data = await res.json();
      const jsonText = data.candidates[0].content.parts[0].text.replace(/```json/g, '').replace(/```/g, '').trim();
      setGeneratedData(JSON.parse(jsonText));
      setActiveTab('home');
    } catch(e) { addToast("Erro na IA", "error"); } finally { setIsGenerating(false); }
  };

  const handleJoinClass = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/join-class`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ code: joinClassCode }) });
      const data = await res.json();
      if(res.ok) {
        setCurrentUser({ type: 'student_guest', data: { classId: data.id, name: 'Visitante' } }); // Visitante temporário
        setActiveTab('student-area');
        addToast(`Entrou em: ${data.name}`, "success");
      } else addToast(data.error, "error");
    } catch(e) { addToast("Erro ao entrar", "error"); }
  };

  const confirmQuizSignup = async () => {
    if(!quizSignupData.name) return;
    try {
      const res = await fetch(`${apiUrl}/api/register`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ ...quizSignupData, type: 'student', classCode: null }) // Passar classCode se disponível no contexto
      });
      const data = await res.json();
      if(res.ok) {
        setCurrentUser({ type:'student', data });
        setShowQuizSignup(false);
        setQuizMode(true);
      } else addToast(data.error, "error");
    } catch(e) { addToast("Erro cadastro", "error"); }
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} activeTab={activeTab} setActiveTab={setActiveTab} currentUser={currentUser} onLogout={() => setCurrentUser(null)} onOpenLogin={() => setShowLoginModal(true)}/>
      <Toast toasts={toasts} removeToast={(id) => setToasts(p => p.filter(t => t.id !== id))} />
      
      <main className="flex-1 overflow-y-auto p-8">
        
        {activeTab === 'settings' && (
          <div className="max-w-xl mx-auto bg-white p-8 rounded-2xl shadow">
            <h2 className="text-2xl font-bold mb-4">Configurações</h2>
            <label className="block text-sm font-bold mb-2">URL do Backend (API)</label>
            <input className="w-full p-3 border rounded mb-4" value={apiUrl} onChange={e => setApiUrl(e.target.value)} />
            <label className="block text-sm font-bold mb-2">Gemini API Key</label>
            <input className="w-full p-3 border rounded mb-4" type="password" value={apiKey} onChange={e => setApiKey(e.target.value)} />
          </div>
        )}

        {activeTab === 'home' && (
          <div className="max-w-3xl mx-auto space-y-6">
             {!generatedData ? (
               <div className="text-center py-20">
                 <h1 className="text-4xl font-black text-slate-800 mb-4">AISTUDYTEC</h1>
                 <div className="flex gap-2 border p-2 rounded-xl bg-white shadow-lg">
                   <input className="flex-1 outline-none p-2" placeholder="O que estudar?" value={inputText} onChange={e => setInputText(e.target.value)}/>
                   <button onClick={() => handleGenerate()} disabled={isGenerating} className="bg-blue-600 text-white px-6 rounded-lg font-bold">{isGenerating ? '...' : 'Ir'}</button>
                 </div>
               </div>
             ) : (
               <div className="bg-white p-8 rounded-3xl shadow-xl animate-fade-up">
                 <div className="flex justify-between items-center mb-6">
                   <h2 className="text-3xl font-bold capitalize">{generatedData.topic}</h2>
                   <button onClick={() => setGeneratedData(null)} className="text-slate-400 hover:text-slate-600"><RotateCcw/></button>
                 </div>
                 <div className="prose max-w-none mb-8">
                    <p className="text-lg leading-relaxed text-slate-600">{generatedData.module3_explanation.simple}</p>
                 </div>
                 <button onClick={() => { 
                   if(currentUser && currentUser.type !== 'student_guest') setQuizMode(true);
                   else setShowQuizSignup(true);
                 }} className="w-full py-4 bg-gradient-to-r from-blue-600 to-teal-500 text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2">
                   <Play fill="currentColor"/> Iniciar Quiz
                 </button>
               </div>
             )}
          </div>
        )}

        {activeTab === 'student-area' && (
          <div className="max-w-2xl mx-auto animate-fade-up">
            {!currentUser || !currentUser.data.classId ? (
               <div className="bg-white p-8 rounded-3xl shadow-lg text-center">
                 <School size={64} className="mx-auto text-slate-300 mb-4"/>
                 <h2 className="text-2xl font-bold mb-2">Entrar na Turma</h2>
                 <p className="text-slate-500 mb-6">Digite o código fornecido pelo professor.</p>
                 <div className="flex gap-2">
                   <input className="flex-1 p-3 border rounded-xl font-mono uppercase" placeholder="CÓDIGO" value={joinClassCode} onChange={e => setJoinClassCode(e.target.value)}/>
                   <button onClick={handleJoinClass} className="px-6 bg-blue-600 text-white font-bold rounded-xl">Entrar</button>
                 </div>
               </div>
            ) : (
               <div className="bg-white p-8 rounded-3xl shadow-lg border-l-4 border-teal-500">
                 <h2 className="text-2xl font-bold mb-4">Minha Turma</h2>
                 <p>Você está conectado como <strong>{currentUser.data.name}</strong></p>
                 {/* Aqui carregaria detalhes da turma via ID */}
               </div>
            )}
          </div>
        )}

        {/* MODAIS */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white p-8 rounded-2xl w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Login Professor</h2>
              <input className="w-full p-3 border rounded mb-3" placeholder="User" value={loginForm.user} onChange={e=>setLoginForm({...loginForm, user:e.target.value})}/>
              <input className="w-full p-3 border rounded mb-4" type="password" placeholder="Pass" value={loginForm.pass} onChange={e=>setLoginForm({...loginForm, pass:e.target.value})}/>
              <div className="flex gap-2"><button onClick={()=>setShowLoginModal(false)} className="flex-1 py-2 bg-slate-100">Cancelar</button><button onClick={handleLogin} className="flex-1 py-2 bg-blue-600 text-white font-bold">Entrar</button></div>
            </div>
          </div>
        )}

        {showQuizSignup && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
             <div className="bg-white p-8 rounded-2xl w-full max-w-md text-center">
               <User size={48} className="mx-auto text-blue-500 mb-4"/>
               <h3 className="text-xl font-bold mb-2">Identifique-se</h3>
               <p className="text-slate-500 mb-4">Para salvar sua nota no quiz.</p>
               <input className="w-full p-3 border rounded mb-3" placeholder="Nome" value={quizSignupData.name} onChange={e=>setQuizSignupData({...quizSignupData, name:e.target.value})}/>
               <input className="w-full p-3 border rounded mb-4" placeholder="Email" value={quizSignupData.email} onChange={e=>setQuizSignupData({...quizSignupData, email:e.target.value})}/>
               <div className="flex gap-2"><button onClick={()=>setShowQuizSignup(false)} className="flex-1 py-2 bg-slate-100">Cancelar</button><button onClick={confirmQuizSignup} className="flex-1 py-2 bg-blue-600 text-white font-bold">Começar</button></div>
             </div>
          </div>
        )}

        {quizMode && generatedData && (
           <div className="fixed inset-0 bg-white z-[70] flex flex-col">
              <div className="p-4 border-b flex justify-between items-center">
                 <span className="font-bold">Quiz: {generatedData.topic}</span>
                 <button onClick={() => setQuizMode(false)}><X/></button>
              </div>
              <div className="flex-1 flex items-center justify-center p-8">
                 <div className="max-w-2xl w-full text-center">
                    <h2 className="text-2xl font-bold mb-8">{generatedData.module6_quiz.questions[currentQuestion].q}</h2>
                    <div className="grid gap-4">
                       {generatedData.module6_quiz.questions[currentQuestion].options.map((opt, i) => (
                          <button key={i} onClick={() => {
                             if(currentQuestion < generatedData.module6_quiz.questions.length - 1) setCurrentQuestion(c => c+1);
                             else { setQuizMode(false); addToast("Fim do Quiz", "success"); }
                          }} className="p-4 border rounded-xl hover:bg-blue-50 text-left">{opt}</button>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        )}

      </main>
    </div>
  );
};

export default AISTUDYTECDashboard;
