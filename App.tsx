import React, { useState, useEffect, useRef } from 'react';
import { CEFRLevel, Lesson, SkillType, UserState, Message } from './types';
import * as GeminiService from './services/geminiService';
import VoiceRecorder from './components/VoiceRecorder';

// --- Constants ---

const INITIAL_LESSONS: Lesson[] = [
  // --- A1 Section ---
  {
    id: 'unit-1',
    title: 'Basic Personal Information',
    description: 'Aprende a presentarte, decir tu nombre, edad y de dónde eres.',
    level: CEFRLevel.A1,
    topics: ['Introductions', 'Countries & Nationalities', 'Age & Numbers'],
    completed: false,
    locked: false,
  },
  {
    id: 'unit-2',
    title: 'Daily Routine',
    description: 'Describe tu día, tus hábitos y aprende a decir la hora.',
    level: CEFRLevel.A1,
    topics: ['Morning Routine', 'Time', 'Verbs of Frequency'],
    completed: false,
    locked: true,
  },
  {
    id: 'unit-3',
    title: 'Likes & Dislikes',
    description: 'Expresa tus preferencias sobre comida, hobbies y actividades.',
    level: CEFRLevel.A1,
    topics: ['Love/Like/Hate', 'Hobbies', 'Food Preferences'],
    completed: false,
    locked: true,
  },
  {
    id: 'unit-4',
    title: 'Shopping List',
    description: 'Planifica un viaje de compras y habla sobre precios.',
    level: CEFRLevel.A1,
    topics: ['Groceries', 'Numbers & Prices', 'At the Store'],
    completed: false,
    locked: true,
  },
  // --- A2 Placeholder ---
  {
    id: 'unit-a2-1',
    title: 'Travel & Directions',
    description: 'Navegar en una ciudad nueva y reservar hoteles.',
    level: CEFRLevel.A2,
    topics: ['Directions', 'Transport', 'Accommodation'],
    completed: false,
    locked: true,
  },
  // --- B1 Placeholder ---
  {
    id: 'unit-b1-1',
    title: 'Work & Career',
    description: 'Entrevistas de trabajo y conversaciones profesionales.',
    level: CEFRLevel.B1,
    topics: ['Interviews', 'Resume', 'Work Environment'],
    completed: false,
    locked: true,
  },
    // --- C1 Placeholder ---
  {
    id: 'unit-c1-1',
    title: 'Abstract Ideas',
    description: 'Discusión de temas sociales complejos y matices.',
    level: CEFRLevel.C1,
    topics: ['Debate', 'Philosophy', 'Nuance'],
    completed: false,
    locked: true,
  }
];

// --- Helper Components ---

const MyEnglishLogo = () => (
  <div className="relative group cursor-pointer">
    <svg viewBox="0 0 320 160" className="w-40 h-20 drop-shadow-md transition-transform transform group-hover:scale-105">
      {/* Folder Tab Back */}
      <path d="M 10 40 L 90 40 L 110 70 L 250 70 L 250 140 L 10 140 Z" fill="#4F46E5" className="text-indigo-600"/>
      
      {/* Main Folder Front */}
      <path d="M 10 65 L 250 65 L 250 140 L 10 140 Z" fill="#4338ca" className="text-indigo-700"/>
      
      {/* Folder Tab "My" Area */}
      <rect x="15" y="45" width="70" height="25" rx="4" fill="white" fillOpacity="0.2" />

      {/* "My" Text - Sketchy Style */}
      <text x="25" y="62" fontFamily="'Nunito', sans-serif" fontWeight="900" fontSize="18" fill="white" style={{letterSpacing: '1px'}}>MY</text>
      
      {/* "English" Text - Sketchy Style */}
      <text x="25" y="115" fontFamily="'Nunito', sans-serif" fontWeight="800" fontSize="42" fill="white" style={{textShadow: '2px 2px 0px rgba(0,0,0,0.1)'}}>English</text>
      
      {/* The "Tail" */}
      <path d="M 250 70 C 300 50, 300 20, 280 10" fill="none" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
      <path d="M 280 10 L 275 18 M 280 10 L 290 15" fill="none" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </div>
);

const TutorAvatar = ({ emotion = 'happy', small = false }: { emotion?: 'happy' | 'thinking' | 'talking', small?: boolean }) => (
  <div className={`${small ? 'w-12 h-12 text-2xl' : 'w-24 h-24 text-5xl'} rounded-full bg-indigo-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative z-10 transition-all duration-300`}>
    <div>
      {emotion === 'happy' && '🦁'}
      {emotion === 'thinking' && '🤔'}
      {emotion === 'talking' && '🦁'}
    </div>
  </div>
);

const ProgressBar = ({ value, max }: { value: number; max: number }) => (
  <div className="w-full bg-gray-200 rounded-full h-2.5">
    <div 
      className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
      style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
    ></div>
  </div>
);

const ChatMessage: React.FC<{ message: Message }> = ({ message }) => {
  const isUser = message.role === 'user';
  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
       {!isUser && <div className="mr-2 flex-shrink-0"><TutorAvatar small emotion="talking" /></div>}
       <div className={`max-w-[85%] rounded-2xl p-4 ${isUser ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-800 shadow-md rounded-tl-none border border-slate-100'}`}>
         <p className="whitespace-pre-wrap">{message.text}</p>
         {message.correction && (
            <div className="mt-2 pt-2 border-t border-indigo-400/30 text-sm opacity-90 bg-black/5 p-2 rounded">
                <span className="font-bold block text-xs uppercase mb-1">Mejor dicho así: </span> {message.correction}
            </div>
         )}
         {message.feedback && !isUser && (
            <div className="mt-2 text-xs text-slate-500 italic bg-yellow-50 p-2 rounded border border-yellow-100">
                💡 {message.feedback}
            </div>
         )}
       </div>
    </div>
  );
};

// --- Main App Component ---

export default function App() {
  // -- State --
  const [userState, setUserState] = useState<UserState>({
    currentLevel: CEFRLevel.A1,
    xp: 0,
    streak: 1,
    unlockedLessons: ['unit-1'],
  });
  
  const [view, setView] = useState<'dashboard' | 'lesson' | 'success'>('dashboard');
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  
  // Lesson Session State
  const [lessonStep, setLessonStep] = useState(0);
  const [currentSkill, setCurrentSkill] = useState<SkillType>(SkillType.READING);
  const [lessonContext, setLessonContext] = useState<string>("");
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'neutral' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data for exercises
  const [listeningScript, setListeningScript] = useState<{ script: string, question: string } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // -- Effects --

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationHistory]);

  const unlockNextUnit = (currentId: string) => {
    const idx = INITIAL_LESSONS.findIndex(l => l.id === currentId);
    if (idx !== -1 && idx < INITIAL_LESSONS.length - 1) {
      const nextId = INITIAL_LESSONS[idx + 1].id;
      if (!userState.unlockedLessons.includes(nextId)) {
        setUserState(prev => ({
          ...prev,
          unlockedLessons: [...prev.unlockedLessons, nextId],
          xp: prev.xp + 100
        }));
      }
    }
  };

  const startLesson = async (lesson: Lesson) => {
    setCurrentLesson(lesson);
    setLessonStep(0);
    setView('lesson');
    setFeedback(null);
    setTextInput("");
    setConversationHistory([]);
    
    // Step 0: Intro Context
    setIsProcessing(true);
    const context = await GeminiService.generateLessonContext(lesson.level, lesson.topics[0]);
    setLessonContext(context);
    setCurrentSkill(SkillType.READING);
    setIsProcessing(false);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // -- Handlers --

  const handleNextStep = async () => {
    setFeedback(null);
    setTextInput("");
    const nextStep = lessonStep + 1;
    
    /* 
      Lesson Flow:
      0. Reading/Concept (Passive)
      1. Writing/Grammar (Active)
      2. Listening (Passive/Active)
      3. Roleplay/Speaking (Interactive)
      4. Success
    */

    if (nextStep === 1) {
      // Writing
      setCurrentSkill(SkillType.WRITING);
      setLessonContext(`Vamos a practicar escritura. Escribe una oración completa en inglés sobre: ${currentLesson?.topics[0] || 'el tema'}.`);
    } else if (nextStep === 2) {
      // Listening
      setIsProcessing(true);
      const challenge = await GeminiService.generateListeningChallenge(currentLesson?.level || CEFRLevel.A1, currentLesson?.topics[0] || "General");
      setListeningScript({ script: challenge.script, question: challenge.question });
      setCurrentSkill(SkillType.LISTENING);
      setLessonContext("Escucha el audio atentamente y responde la pregunta para verificar que entendiste.");
      setIsProcessing(false);
    } else if (nextStep === 3) {
      // Roleplay
      setCurrentSkill(SkillType.ROLEPLAY);
      setLessonContext(`¡Tiempo de conversación! Hablemos sobre ${currentLesson?.topics[0]}. ¡Tú empiezas!`);
      // Seed the conversation
      setConversationHistory([{
          id: 'init', role: 'model', 
          text: `Hi! Let's talk about ${currentLesson?.topics[0].toLowerCase()}. Are you ready?`,
          timestamp: Date.now()
      }]);
    } else {
      // Finish
      if (currentLesson) unlockNextUnit(currentLesson.id);
      setView('success');
      return;
    }
    
    setLessonStep(nextStep);
  };

  const submitText = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    
    const evaluation = await GeminiService.evaluateTextSubmission(
      currentLesson?.level || CEFRLevel.A1,
      currentLesson?.topics[0] || "General",
      textInput,
      currentSkill === SkillType.LISTENING ? listeningScript?.question || "Answer the question" : lessonContext
    );
    
    setIsProcessing(false);
    
    if (evaluation.correct || evaluation.score > 60) {
      setFeedback({ text: `¡Correcto! ${evaluation.feedback}`, type: 'success' });
    } else {
      setFeedback({ text: `Casi... ${evaluation.feedback} ¡Intenta de nuevo!`, type: 'error' });
    }
  };

  const submitRoleplayMessage = async (text: string) => {
    if (!text.trim()) return;
    
    // Add user message
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    const updatedHistory = [...conversationHistory, userMsg];
    setConversationHistory(updatedHistory);
    setTextInput("");
    setIsProcessing(true);

    // Get Tutor Reply
    const response = await GeminiService.generateTutorReply(
        currentLesson?.level || CEFRLevel.A1,
        currentLesson?.topics[0] || "General",
        updatedHistory,
        text
    );

    setIsProcessing(false);

    // Add Tutor message
    const tutorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.tutorText,
        timestamp: Date.now(),
        feedback: response.feedback,
        correction: response.correction !== text && response.correction ? response.correction : undefined
    };
    
    setConversationHistory([...updatedHistory, tutorMsg]);
    speakText(response.tutorText);
  };

  // -- Render Views --

  const renderDashboard = () => (
    <div className="max-w-md mx-auto pt-6 px-6 pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <MyEnglishLogo />
        <div className="flex flex-col items-end">
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full mb-1 border border-yellow-200">
            🔥 {userState.streak} Días Racha
          </span>
          <span className="text-sm font-bold text-indigo-600">{userState.xp} XP</span>
        </div>
      </div>

      {/* Level Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
                <h2 className="text-4xl font-black mb-1 tracking-tight">{userState.currentLevel}</h2>
                <p className="opacity-90 text-sm mb-4 font-medium">Nivel Actual</p>
            </div>
            <div className="text-4xl bg-white/20 rounded-full w-12 h-12 flex items-center justify-center">
               🦁
            </div>
          </div>
          <ProgressBar value={((userState.unlockedLessons.length - 1) / INITIAL_LESSONS.length) * 100} max={100} />
          <p className="text-xs mt-3 opacity-90 text-right font-semibold">¡Sigue así para llegar a C1!</p>
        </div>
        {/* Decorative circles */}
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 rounded-full bg-white/10 blur-xl"></div>
        <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
      </div>

      {/* Topics Grid */}
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <span className="bg-indigo-100 text-indigo-600 p-1 rounded">📚</span>
        Tu Ruta de Aprendizaje
      </h3>
      <div className="space-y-8 relative">
        {/* Connecting Line */}
        <div className="absolute left-8 top-4 bottom-4 w-1 bg-slate-200 -z-10"></div>

        {/* Group by Levels roughly */}
        {[CEFRLevel.A1, CEFRLevel.A2, CEFRLevel.B1, CEFRLevel.C1].map((level, levelIndex) => {
            const levelLessons = INITIAL_LESSONS.filter(l => l.level === level);
            if (levelLessons.length === 0) return null;
            
            return (
                <div key={level}>
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-4 h-4 rounded-full ring-4 ring-white ${levelIndex === 0 ? 'bg-indigo-600' : 'bg-slate-300'} ml-6`}></div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">NIVEL {level}</h4>
                    </div>
                    <div className="space-y-4 pl-2">
                        {levelLessons.map((lesson, idx) => {
                            const isUnlocked = userState.unlockedLessons.includes(lesson.id);
                            
                            return (
                                <div 
                                key={lesson.id}
                                onClick={() => isUnlocked ? startLesson(lesson) : null}
                                className={`
                                    relative p-4 rounded-2xl border-b-4 transition-all duration-200 flex items-center gap-4 ml-4
                                    ${isUnlocked 
                                    ? 'border-indigo-200 bg-white active:border-indigo-100 active:translate-y-1 shadow-sm hover:shadow-md cursor-pointer' 
                                    : 'border-slate-200 bg-slate-100 opacity-70 cursor-not-allowed'}
                                `}
                                >
                                <div className={`
                                    w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-inner
                                    ${isUnlocked ? 'bg-gradient-to-br from-indigo-50 to-white text-indigo-600' : 'bg-slate-200 text-slate-400'}
                                `}>
                                    {isUnlocked ? (lesson.completed ? '✅' : '⭐') : '🔒'}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`font-bold text-lg leading-tight mb-1 ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>{lesson.title}</h4>
                                    <p className="text-xs text-slate-500 line-clamp-2">{lesson.description}</p>
                                </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );

  const renderLesson = () => {
    if (!currentLesson) return null;

    return (
      <div className="min-h-screen bg-white flex flex-col">
        {/* Top Bar */}
        <div className="px-4 py-4 flex items-center justify-between border-b border-slate-100 bg-white sticky top-0 z-20 shadow-sm">
          <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex-1 mx-4 max-w-xs">
             <div className="flex justify-between text-[10px] uppercase font-bold text-slate-400 mb-1">
                <span>Progreso</span>
                <span>{Math.round((lessonStep / 4) * 100)}%</span>
             </div>
             <ProgressBar value={lessonStep} max={4} />
          </div>
          <div className="text-indigo-600 font-bold text-xs bg-indigo-50 px-3 py-1 rounded-full">
             {currentSkill === SkillType.ROLEPLAY ? '🗣️ HABLA' : 
              currentSkill === SkillType.LISTENING ? '👂 ESCUCHA' :
              currentSkill === SkillType.WRITING ? '✍️ ESCRIBE' : '📖 LEE'}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-4 max-w-2xl mx-auto w-full relative overflow-hidden">
          
          {/* Roleplay View is Special */}
          {currentSkill === SkillType.ROLEPLAY ? (
              <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto mb-4 pb-24 px-2">
                      <div className="text-center text-slate-400 text-xs mb-4 bg-slate-50 py-2 rounded-lg">
                        🤖 Practica conversando. El tutor te corregirá si es necesario.
                      </div>
                      {conversationHistory.map((msg) => (
                          <ChatMessage key={msg.id} message={msg} />
                      ))}
                      {isProcessing && (
                          <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse ml-2 mt-2">
                              <TutorAvatar small emotion="thinking" />
                              <span>El tutor está escribiendo...</span>
                          </div>
                      )}
                      <div ref={messagesEndRef} />
                  </div>
                  
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 flex flex-col gap-2 md:relative md:border-none md:p-0 z-20 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                      <div className="flex items-center gap-3">
                        <VoiceRecorder onRecordingComplete={(b64) => submitRoleplayMessage("User sent audio.")} isProcessing={isProcessing} />
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitRoleplayMessage(textInput)}
                                placeholder="Escribe tu respuesta..."
                                className="w-full bg-slate-100 border-0 rounded-full px-5 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            />
                            <button 
                                onClick={() => submitRoleplayMessage(textInput)}
                                className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-indigo-600 text-white p-2 rounded-full hover:bg-indigo-700 shadow-md"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                      </div>
                      {/* Only allow finishing after 3 exchanges */}
                      {conversationHistory.length >= 4 && (
                          <button onClick={handleNextStep} className="w-full mt-2 bg-green-100 text-green-700 py-3 rounded-xl font-bold hover:bg-green-200 transition-colors border border-green-200">
                              Terminar Conversación
                          </button>
                      )}
                  </div>
              </div>
          ) : (
              // Standard Exercises
              <div className="flex flex-col items-center justify-center h-full pb-10">
                  <div className="mb-8 text-center w-full">
                    <div className="flex justify-center mb-6">
                    <TutorAvatar emotion={isProcessing ? 'thinking' : feedback ? 'happy' : 'talking'} />
                    </div>
                    <div className="bg-white border-2 border-indigo-50 p-6 rounded-3xl shadow-lg text-left relative w-full">
                    <p className="text-slate-700 text-lg font-medium leading-relaxed">
                        {currentSkill === SkillType.LISTENING 
                        ? (listeningScript ? "Escucha atentamente el audio..." : "Cargando ejercicio...") 
                        : lessonContext}
                    </p>
                    {(currentSkill === SkillType.READING) && (
                        <button 
                        onClick={() => speakText(lessonContext)}
                        className="absolute -top-3 -right-3 bg-white shadow-md text-indigo-600 hover:text-indigo-700 p-3 rounded-full transition-all transform hover:scale-110 border border-indigo-50"
                        title="Escuchar texto"
                        >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                         </svg>
                        </button>
                    )}
                    </div>
                  </div>

                    {/* Interactive Components */}
                    <div className="w-full max-w-md space-y-6">
                        {/* READING */}
                        {currentSkill === SkillType.READING && (
                            <button 
                            onClick={handleNextStep}
                            className="w-full bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold shadow-indigo-200 shadow-xl hover:bg-indigo-700 transition-all transform active:scale-95 flex items-center justify-center gap-2"
                            >
                            <span>Entendido, Continuar</span>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            </button>
                        )}

                        {/* LISTENING */}
                        {currentSkill === SkillType.LISTENING && (
                        <div className="flex flex-col gap-4">
                            <button 
                            onClick={() => listeningScript && speakText(listeningScript.script)}
                            className="bg-sky-50 text-sky-700 border-2 border-sky-100 px-6 py-8 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-sky-100 transition-all hover:scale-[1.02] shadow-sm mb-4"
                            >
                             <span className="bg-sky-200 p-3 rounded-full text-2xl">🔊</span>
                             <span className="text-lg">Reproducir Audio</span>
                            </button>
                            
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 mb-2">
                                <p className="font-bold text-slate-400 text-xs uppercase tracking-wider mb-2">Pregunta</p>
                                <p className="text-slate-800 font-medium text-lg">{listeningScript?.question}</p>
                            </div>

                            <textarea 
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none resize-none text-lg transition-all"
                            placeholder="Escribe tu respuesta en Inglés..."
                            rows={2}
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            />
                            {!feedback && (
                            <button onClick={submitText} disabled={isProcessing} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg active:scale-95 transition-transform">
                                Verificar Respuesta
                            </button>
                            )}
                        </div>
                        )}

                        {/* WRITING */}
                        {currentSkill === SkillType.WRITING && (
                        <div className="flex flex-col gap-4">
                            <textarea 
                            className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none resize-none text-lg shadow-sm transition-all"
                            placeholder="Escribe tu oración aquí..."
                            rows={4}
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            />
                            {!feedback && (
                            <button onClick={submitText} disabled={isProcessing} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 shadow-lg active:scale-95 transition-transform">
                                Revisar Gramática
                            </button>
                            )}
                        </div>
                        )}
                        
                        {/* Feedback */}
                        {feedback && (
                        <div className={`p-5 rounded-2xl border-l-8 shadow-md animate-in fade-in slide-in-from-bottom-4 duration-300 ${feedback.type === 'success' ? 'bg-green-50 border-green-500 text-green-900' : 'bg-red-50 border-red-500 text-red-900'}`}>
                            <div className="flex flex-col gap-3">
                                <div className="flex items-start gap-3">
                                    <div className="text-2xl">{feedback.type === 'success' ? '🎉' : '🧐'}</div>
                                    <p className="font-medium text-lg leading-snug">{feedback.text}</p>
                                </div>
                                {feedback.type === 'success' ? (
                                    <button onClick={handleNextStep} className="self-end bg-green-600 text-white px-8 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 hover:scale-105 transition-all">
                                        Continuar
                                    </button>
                                ) : (
                                    <button onClick={() => setFeedback(null)} className="self-end bg-white border-2 border-red-200 text-red-600 px-6 py-2 rounded-xl font-bold hover:bg-red-50 transition-all">
                                        Intentar de nuevo
                                    </button>
                                )}
                            </div>
                        </div>
                        )}
                    </div>
              </div>
          )}

        </div>
      </div>
    );
  };

  const renderSuccess = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 text-center relative overflow-hidden">
      {/* Confetti Background (Simulated with circles) */}
      <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse"></div>
      <div className="absolute bottom-20 right-10 w-40 h-40 bg-purple-500/30 rounded-full blur-2xl"></div>
      
      <div className="text-8xl mb-6 animate-bounce filter drop-shadow-lg">🦁</div>
      <h2 className="text-5xl font-black mb-4 tracking-tight">¡Excelente!</h2>
      <p className="opacity-90 mb-12 text-xl font-medium max-w-md">Has completado esta lección. Estás un paso más cerca de dominar el inglés.</p>
      
      <div className="flex gap-6 mb-16">
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl transform hover:scale-105 transition-transform">
          <div className="text-4xl font-black text-yellow-300 mb-1">+100</div>
          <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Puntos XP</div>
        </div>
        <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl transform hover:scale-105 transition-transform">
          <div className="text-4xl font-black text-green-300 mb-1">100%</div>
          <div className="text-xs uppercase tracking-wider opacity-80 font-bold">Precisión</div>
        </div>
      </div>

      <button 
        onClick={() => setView('dashboard')}
        className="bg-white text-indigo-600 px-16 py-6 rounded-full font-black text-xl shadow-2xl hover:bg-indigo-50 hover:scale-105 hover:shadow-indigo-900/20 transition-all"
      >
        Volver al Menú
      </button>
    </div>
  );

  // -- Main Render --
  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-200 text-slate-900">
      {view === 'dashboard' && renderDashboard()}
      {view === 'lesson' && renderLesson()}
      {view === 'success' && renderSuccess()}
    </div>
  );
}