import React, { useState } from 'react';
import ClassManagement from './ClassManagement';
import TopicManager from './TopicManager';
import TopicReview from './TopicReview';
import TeacherDashboard from './TeacherDashboard';
import ClassRoster from './ClassRoster';

const SUBTABS = [
  { key: 'topics', label: 'Tópicos' },
  { key: 'dashboard', label: 'Desempenho' },
];

const TeacherPanel = ({ apiUrl, currentUser, addToast }) => {
  const [classId, setClassId] = useState(null);
  const [topicId, setTopicId] = useState(null);
  const [subTab, setSubTab] = useState('topics');

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <h1 className="text-2xl font-black text-slate-800">Gestão</h1>
      <ClassManagement currentUser={currentUser} selectedClassId={classId}
        onSelectClass={id => { setClassId(id); setTopicId(null); }} addToast={addToast} />
      {classId && <ClassRoster classId={classId} addToast={addToast} />}

      {classId && !topicId && (
        <>
          <div className="flex gap-2 border-b">
            {SUBTABS.map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)} className={`px-4 py-2 font-bold text-sm ${subTab === t.key ? 'border-b-2 border-purple-600 text-purple-600' : 'text-slate-400'}`}>{t.label}</button>
            ))}
          </div>
          {subTab === 'topics' && (
            <TopicManager apiUrl={apiUrl} currentUser={currentUser} classId={classId} onSelectTopic={setTopicId} addToast={addToast} />
          )}
          {subTab === 'dashboard' && (
            <TeacherDashboard apiUrl={apiUrl} classId={classId} onSelectTopic={setTopicId} />
          )}
        </>
      )}

      {classId && topicId && (
        <TopicReview apiUrl={apiUrl} topicId={topicId} onBack={() => setTopicId(null)} addToast={addToast} />
      )}
    </div>
  );
};

export default TeacherPanel;
