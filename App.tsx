
import React, { useState, useEffect, useRef } from 'react';
import { CEFRLevel, Lesson, SkillType, UserState, Message } from './types';
import * as GeminiService from './services/geminiService';
import VoiceRecorder from './components/VoiceRecorder';
import InteractiveText from './components/InteractiveText';

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
      <path d="M 10 40 L 90 40 L 110 70 L 250 70 L 250 140 L 10 140 Z" fill="#4F46E5" className="text-indigo-600"/>
      <path d="M 10 65 L 250 65 L 250 140 L 10 140 Z" fill="#4338ca" className="text-indigo-700"/>
      <rect x="15" y="45" width="70" height="25" rx="4" fill="white" fillOpacity="0.2" />
      <text x="25" y="62" fontFamily="'Nunito', sans-serif" fontWeight="900" fontSize="18" fill="white" style={{letterSpacing: '1px'}}>MY</text>
      <text x="25" y="115" fontFamily="'Nunito', sans-serif" fontWeight="800" fontSize="42" fill="white" style={{textShadow: '2px 2px 0px rgba(0,0,0,0.1)'}}>English</text>
      <path d="M 250 70 C 300 50, 300 20, 280 10" fill="none" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
      <path d="M 280 10 L 275 18 M 280 10 L 290 15" fill="none" stroke="#4F46E5" strokeWidth="4" strokeLinecap="round" />
    </svg>
  </div>
);

const TutorAvatar = ({ emotion = 'happy', small = false }: { emotion?: 'happy' | 'thinking' | 'talking', small?: boolean }) => (
  <div className={`${small ? 'w-12 h-12 text-2xl' : 'w-20 h-20 text-4xl'} rounded-full bg-indigo-100 border-4 border-white shadow-xl flex items-center justify-center overflow-hidden relative z-10 transition-all duration-300`}>
    <div className={`${emotion === 'talking' ? 'animate-bounce' : ''}`}>
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
    weakWords: [],
    profile: {
        name: 'Student',
        bioText: '',
        lastUpdated: Date.now()
    }
  });
  
  const [view, setView] = useState<'dashboard' | 'lesson' | 'success' | 'profile'>('dashboard');
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);
  
  // Lesson Session State
  const [lessonStep, setLessonStep] = useState(0);
  const [currentSkill, setCurrentSkill] = useState<SkillType>(SkillType.READING);
  
  // Content
  const [lessonIntro, setLessonIntro] = useState<string>("");
  const [lessonContent, setLessonContent] = useState<string>("");

  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'neutral' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Data for exercises
  const [listeningScript, setListeningScript] = useState<{ script: string, question: string } | null>(null);
  const [textInput, setTextInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // TEST & REINFORCEMENT DATA
  const [testData, setTestData] = useState<{ dictationPhrase: string, speakingPrompt: string } | null>(null);
  const [testSubStep, setTestSubStep] = useState<'dictation' | 'speaking'>('dictation');
  const [audioBufferToPlay, setAudioBufferToPlay] = useState<ArrayBuffer|null>(null);
  const [reinforcementData, setReinforcementData] = useState<{ question: string, correctAnswer: string, type: string } | null>(null);

  // GAME DATA
  const [miniGameData, setMiniGameData] = useState<{ scrambled: string[], correctSentence: string } | null>(null);
  const [gameUserOrder, setGameUserOrder] = useState<string[]>([]);

  // Word Lookup & Profile
  const [selectedWord, setSelectedWord] = useState<{ word: string, def: string, ex: string } | null>(null);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const [profileEditMode, setProfileEditMode] = useState(false);

  // -- Effects --

  useEffect(() => {
    if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [conversationHistory]);

  // -- Utilities --

  const safePlayAudio = async (buffer: ArrayBuffer) => {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      
      try {
          const audioBuffer = GeminiService.decodePCM(ctx, buffer);
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          source.onended = () => {
              setTimeout(() => {
                  if(ctx.state !== 'closed') ctx.close();
              }, 200); 
          };
          if(ctx.state === 'suspended') await ctx.resume();
          source.start(0);
      } catch(e) {
          console.error("Audio playback error in App:", e);
          if(ctx.state !== 'closed') ctx.close();
      }
  };

  const unlockNextUnit = (currentId: string) => {
    const idx = INITIAL_LESSONS.findIndex(l => l.id === currentId);
    if (idx !== -1 && idx < INITIAL_LESSONS.length - 1) {
      const nextId = INITIAL_LESSONS[idx + 1].id;
      if (!userState.unlockedLessons.includes(nextId)) {
        setUserState(prev => ({
          ...prev,
          unlockedLessons: [...prev.unlockedLessons, nextId],
          xp: prev.xp + 100,
          weakWords: [] // Clear weak words on success
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
    setTestData(null);
    setReinforcementData(null);
    setMiniGameData(null);
    
    // Step 0: Intro Context
    setIsProcessing(true);
    const result = await GeminiService.generateLessonContext(lesson.level, lesson.topics[0]);
    setLessonIntro(result.intro);
    setLessonContent(result.content);
    setCurrentSkill(SkillType.READING);
    setIsProcessing(false);
  };

  const triggerMiniGame = async () => {
     setIsProcessing(true);
     setMiniGameData(null);
     setCurrentSkill(SkillType.MINIGAME);
     setLessonIntro("¡Bonus Round! Ordena la frase correctamente.");
     const game = await GeminiService.generateMiniGame(userState.currentLevel);
     setMiniGameData(game);
     setGameUserOrder([]);
     setIsProcessing(false);
  };

  const checkMiniGame = () => {
     if(!miniGameData) return;
     const userSentence = gameUserOrder.join(' ');
     if(userSentence === miniGameData.correctSentence) {
         setFeedback({ text: "¡Genial! Frase correcta.", type: 'success' });
         setTimeout(() => {
             setMiniGameData(null);
             setFeedback(null);
             handleNextStep(true); // skip increment, just render next view
         }, 2000);
     } else {
         setFeedback({ text: "Intenta de nuevo.", type: 'error' });
     }
  };

  const handleWordClick = async (word: string) => {
    setIsLoadingWord(true);
    setSelectedWord({ word, def: 'Buscando...', ex: '' });
    const context = currentSkill === SkillType.LISTENING && listeningScript ? listeningScript.script : lessonContent;
    const result = await GeminiService.defineWord(word, context);
    setSelectedWord({ word, def: result.definition, ex: result.example });
    setIsLoadingWord(false);
  };

  const closeWordModal = () => setSelectedWord(null);

  const recordError = (text: string, keywords: string[] = []) => {
      // Naive approach: add text or specific keywords if provided
      const errors = keywords.length > 0 ? keywords : [text];
      setUserState(prev => ({
          ...prev,
          weakWords: [...prev.weakWords, ...errors].slice(-10) // Keep last 10
      }));
  };

  // -- Handlers --

  const handleNextStep = async (skipIncrement = false) => {
    setFeedback(null);
    setTextInput("");
    let nextStep = skipIncrement ? lessonStep : lessonStep + 1;

    // Random Mini Game trigger (10% chance between steps)
    if(!skipIncrement && nextStep < 5 && Math.random() > 0.90 && currentSkill !== SkillType.TEST) {
        triggerMiniGame();
        return; 
    }
    
    // Routing Logic
    if (nextStep === 1) {
      setCurrentSkill(SkillType.WRITING);
      setLessonIntro(`Práctica de Escritura. Escribe un pequeño párrafo (2-3 frases) usando el vocabulario del tema.`);
      setLessonContent(`Topic: ${currentLesson?.topics[0]}`);
    } else if (nextStep === 2) {
      setIsProcessing(true);
      const challenge = await GeminiService.generateListeningChallenge(currentLesson?.level || CEFRLevel.A1, currentLesson?.topics[0] || "General");
      setListeningScript({ script: challenge.script, question: challenge.question });
      setCurrentSkill(SkillType.LISTENING);
      setLessonIntro("Escucha la historia con atención a los detalles y responde la pregunta.");
      setIsProcessing(false);
    } else if (nextStep === 3) {
      setCurrentSkill(SkillType.ROLEPLAY);
      setLessonIntro(`Conversación: Habla con Leo sobre ${currentLesson?.topics[0]}. Intenta dar respuestas completas.`);
      const introMsg = `Hi! I'm Leo. Let's talk about ${currentLesson?.topics[0].toLowerCase()}. What can you tell me?`;
      setConversationHistory([{ id: 'init', role: 'model', text: introMsg, timestamp: Date.now() }]);
      GeminiService.generateSpeech(introMsg).then(buffer => { if(buffer) safePlayAudio(buffer); });
    } else if (nextStep === 4) {
       setCurrentSkill(SkillType.TEST);
       setIsProcessing(true);
       setLessonIntro("¡Desafío Final! Dictado complejo y Expresión Oral detallada.");
       const test = await GeminiService.generateFinalReview(currentLesson?.level || CEFRLevel.A1, currentLesson?.topics[0] || "General");
       setTestData(test);
       setTestSubStep('dictation');
       const buffer = await GeminiService.generateSpeech(test.dictationPhrase);
       if (buffer) setAudioBufferToPlay(buffer);
       setIsProcessing(false);
    } else {
      // Check for Reinforcement needed
      if (userState.weakWords.length > 0 && currentSkill !== SkillType.REINFORCEMENT) {
          setCurrentSkill(SkillType.REINFORCEMENT);
          setIsProcessing(true);
          setLessonIntro("Repasemos algunos errores antes de terminar para asegurar el aprendizaje.");
          const rein = await GeminiService.generateReinforcement(userState.weakWords);
          setReinforcementData(rein);
          setIsProcessing(false);
          return;
      }

      if (currentLesson) unlockNextUnit(currentLesson.id);
      setView('success');
      return;
    }
    
    if(!skipIncrement) setLessonStep(nextStep);
  };

  const submitText = async () => {
    if (!textInput.trim()) return;
    setIsProcessing(true);
    
    const evaluation = await GeminiService.evaluateTextSubmission(
      currentLesson?.level || CEFRLevel.A1,
      currentLesson?.topics[0] || "General",
      textInput,
      currentSkill === SkillType.LISTENING ? listeningScript?.question || "Answer" : lessonContent,
      userState.weakWords
    );
    
    setIsProcessing(false);
    
    if (evaluation.correct || evaluation.score > 75) {
      setFeedback({ text: `¡Excelente! ${evaluation.feedback}`, type: 'success' });
    } else {
      setFeedback({ text: `Atención: ${evaluation.feedback}`, type: 'error' });
      if (evaluation.errorKeywords) recordError(textInput, evaluation.errorKeywords);
    }
  };

  const submitReinforcement = () => {
      if(!reinforcementData) return;
      const correct = textInput.toLowerCase().trim().includes(reinforcementData.correctAnswer.toLowerCase().trim());
      if (correct) {
           setFeedback({ text: "¡Muy bien! Error corregido.", type: 'success' });
           // Clear weaknesses if solved (simple logic)
           setUserState(prev => ({...prev, weakWords: []}));
      } else {
           setFeedback({ text: `La respuesta correcta era: ${reinforcementData.correctAnswer}`, type: 'error' });
      }
  };

  const handleImproveProfile = async () => {
      setIsProcessing(true);
      const result = await GeminiService.generateProfileImprovement(userState.profile.bioText, userState.currentLevel);
      setUserState(prev => ({
          ...prev,
          profile: { ...prev.profile, bioText: result.improvedText }
      }));
      setFeedback({ text: `Tutor: ${result.feedback}`, type: 'success' });
      setIsProcessing(false);
  };

  const submitDictation = () => {
     if(!testData) return;
     const normalize = (s: string) => s.toLowerCase().replace(/[.,!]/g, '').trim();
     const user = normalize(textInput);
     const target = normalize(testData.dictationPhrase);
     
     if(user === target) {
        setFeedback({ text: "¡Perfecto! Escritura impecable.", type: 'success' });
        setTimeout(() => {
            setFeedback(null);
            setTextInput("");
            setTestSubStep('speaking');
        }, 1500);
     } else {
        setFeedback({ text: "Escucha de nuevo con atención a los detalles.", type: 'error' });
        recordError("Dictation Error", ["Listening", "Spelling"]);
     }
  };

  const submitSpeakingTest = (base64: string) => {
      setIsProcessing(true);
      setTimeout(() => {
          setIsProcessing(false);
          setFeedback({ text: "¡Gran trabajo! Has completado el desafío.", type: 'success' });
      }, 1500);
  };

  const submitRoleplayMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setConversationHistory(prev => [...prev, userMsg]);
    setTextInput("");
    setIsProcessing(true);

    const response = await GeminiService.generateTutorReply(
        currentLesson?.level || CEFRLevel.A1,
        currentLesson?.topics[0] || "General",
        [...conversationHistory, userMsg],
        text
    );

    setIsProcessing(false);
    const tutorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response.tutorText,
        timestamp: Date.now(),
        feedback: response.feedback,
        correction: response.correction
    };
    setConversationHistory(prev => [...prev, tutorMsg]);
    
    if (response.correction && response.correction !== text) {
        recordError(text, ["Speaking structure"]);
    }

    GeminiService.generateSpeech(response.tutorText).then(buffer => {
        if(buffer) safePlayAudio(buffer);
    });
  };

  // -- Render Views --

  const renderDashboard = () => (
    <div className="max-w-md mx-auto pt-6 px-6 pb-20 font-medium">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <MyEnglishLogo />
        <div className="flex flex-col items-end">
          <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full mb-1 border border-yellow-200">
            🔥 {userState.streak}
          </span>
          <span className="text-sm font-bold text-indigo-600">{userState.xp} XP</span>
        </div>
      </div>

      {/* Personal Identity Card */}
      <div className="bg-white rounded-[2rem] p-6 shadow-lg mb-8 border-2 border-indigo-50">
          <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>🆔</span> Mi Identidad en Inglés
              </h3>
              <button 
                onClick={() => setProfileEditMode(!profileEditMode)}
                className="text-xs text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full"
              >
                {profileEditMode ? 'Guardar' : 'Editar'}
              </button>
          </div>
          
          {profileEditMode ? (
              <div className="space-y-3">
                  <textarea 
                    value={userState.profile.bioText}
                    onChange={(e) => setUserState(prev => ({...prev, profile: {...prev.profile, bioText: e.target.value}}))}
                    placeholder="Escribe sobre ti: I am..."
                    className="w-full p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    rows={3}
                  />
                  <button 
                    onClick={handleImproveProfile}
                    disabled={isProcessing || !userState.profile.bioText}
                    className="w-full bg-purple-100 text-purple-700 py-2 rounded-xl text-sm font-bold flex justify-center items-center gap-2"
                  >
                     {isProcessing ? 'Mejorando...' : '✨ Mejorar con IA'}
                  </button>
                  {feedback && feedback.type === 'success' && (
                      <p className="text-xs text-green-600 bg-green-50 p-2 rounded">{feedback.text}</p>
                  )}
              </div>
          ) : (
              <div>
                   <p className="text-slate-600 italic text-sm bg-slate-50 p-3 rounded-xl">
                       "{userState.profile.bioText || "Aún no has escrito tu presentación. ¡Inténtalo!"}"
                   </p>
              </div>
          )}
      </div>

      {/* Level Card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-[2rem] p-8 text-white shadow-2xl mb-10 relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
                <h2 className="text-5xl font-black mb-1 tracking-tight">{userState.currentLevel}</h2>
                <p className="opacity-90 text-sm mb-6 font-medium uppercase tracking-wider">Nivel Actual</p>
            </div>
            <div className="text-4xl bg-white/20 rounded-full w-14 h-14 flex items-center justify-center backdrop-blur-sm">
               🦁
            </div>
          </div>
          <ProgressBar value={((userState.unlockedLessons.length - 1) / INITIAL_LESSONS.length) * 100} max={100} />
        </div>
        <div className="absolute top-0 right-0 -mr-8 -mt-8 w-40 h-40 rounded-full bg-white/10 blur-2xl"></div>
      </div>

      {/* Topics Grid */}
      <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2 pl-2">
        <span>🗺️</span>
        <span>Tu Ruta de Aprendizaje</span>
      </h3>
      <div className="space-y-8 relative">
        <div className="absolute left-8 top-4 bottom-4 w-0.5 bg-slate-200 -z-10"></div>
        {[CEFRLevel.A1, CEFRLevel.A2, CEFRLevel.B1, CEFRLevel.C1].map((level, levelIndex) => {
            const levelLessons = INITIAL_LESSONS.filter(l => l.level === level);
            if (levelLessons.length === 0) return null;
            return (
                <div key={level} className="animate-in slide-in-from-bottom-2 duration-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-4 h-4 rounded-full ring-4 ring-white ${levelIndex === 0 ? 'bg-indigo-600' : 'bg-slate-300'} ml-6 shadow-sm`}></div>
                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest">NIVEL {level}</h4>
                    </div>
                    <div className="space-y-5 pl-2">
                        {levelLessons.map((lesson, idx) => {
                            const isUnlocked = userState.unlockedLessons.includes(lesson.id);
                            return (
                                <div 
                                key={lesson.id}
                                onClick={() => isUnlocked ? startLesson(lesson) : null}
                                className={`
                                    relative p-5 rounded-2xl border-b-4 transition-all duration-300 flex items-center gap-4 ml-4
                                    ${isUnlocked 
                                    ? 'border-indigo-100 bg-white hover:bg-indigo-50 active:border-transparent active:translate-y-1 shadow-sm hover:shadow-md cursor-pointer' 
                                    : 'border-slate-200 bg-slate-100 opacity-60 cursor-not-allowed grayscale'}
                                `}
                                >
                                <div className={`
                                    w-14 h-14 flex-shrink-0 rounded-full flex items-center justify-center text-2xl shadow-inner
                                    ${isUnlocked ? 'bg-gradient-to-br from-indigo-50 to-white text-indigo-600' : 'bg-slate-200 text-slate-400'}
                                `}>
                                    {isUnlocked ? (lesson.completed ? '✅' : '📖') : '🔒'}
                                </div>
                                <div className="flex-1">
                                    <h4 className={`font-extrabold text-lg leading-tight mb-1 ${isUnlocked ? 'text-slate-800' : 'text-slate-500'}`}>{lesson.title}</h4>
                                    <p className="text-sm text-slate-500 font-normal leading-normal">{lesson.description}</p>
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
      <div className="min-h-screen bg-slate-50 flex flex-col font-medium text-slate-900">
        {/* Word Dictionary Modal */}
        {selectedWord && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-2xl font-black text-indigo-600 capitalize">{selectedWord.word}</h3>
                        <button onClick={closeWordModal} className="bg-slate-100 p-2 rounded-full">✕</button>
                    </div>
                    {isLoadingWord ? (
                         <div className="flex gap-2 items-center text-slate-500 py-4"><span className="animate-spin">⏳</span> Buscando...</div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Significado</p>
                                <p className="text-lg text-slate-800">{selectedWord.def}</p>
                            </div>
                            <div className="bg-indigo-50 p-4 rounded-xl">
                                <p className="text-xs font-bold text-indigo-400 uppercase mb-1">Ejemplo</p>
                                <p className="text-indigo-900 italic">"{selectedWord.ex}"</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Top Bar */}
        <div className="px-6 py-4 flex items-center justify-between bg-white border-b border-slate-100 sticky top-0 z-30">
          <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-slate-600 p-2">✕</button>
          <div className="flex-1 mx-6 max-w-xs">
             <ProgressBar value={lessonStep} max={5} />
          </div>
          <div className="flex items-center gap-2">
             <TutorAvatar small emotion={isProcessing ? 'thinking' : 'happy'} />
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full relative">
          
          <div className="mb-6 flex justify-center">
             <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm bg-indigo-100 text-indigo-700`}>
                {currentSkill}
            </span>
          </div>

          {/* --- MINI GAME VIEW --- */}
          {currentSkill === SkillType.MINIGAME ? (
             <div className="flex flex-col items-center justify-center space-y-8 py-10 animate-in zoom-in-95">
                 <div className="text-6xl mb-2">🎲</div>
                 <h3 className="text-2xl font-black text-center text-slate-800">¡Bonus Round!</h3>
                 <p className="text-slate-500">Ordena las palabras para formar la frase.</p>
                 
                 {/* Word Slots (Targets) */}
                 <div className="flex flex-wrap justify-center gap-2 min-h-[60px] w-full p-4 bg-slate-100 rounded-2xl border-2 border-slate-200 border-dashed">
                     {gameUserOrder.length === 0 && <span className="text-slate-400 self-center">Toca las palabras abajo</span>}
                     {gameUserOrder.map((word, i) => (
                         <button 
                             key={i} 
                             onClick={() => {
                                 setGameUserOrder(prev => prev.filter((_, idx) => idx !== i));
                             }}
                             className="bg-white border-b-4 border-indigo-200 text-indigo-600 px-4 py-2 rounded-xl font-bold shadow-sm hover:scale-105 transition-transform"
                         >
                             {word}
                         </button>
                     ))}
                 </div>

                 {/* Word Bank (Sources) */}
                 <div className="flex flex-wrap justify-center gap-3">
                     {miniGameData?.scrambled.map((word, i) => {
                         // Only show if not already used (or simple count check for duplicates)
                         // For simplicity assume unique words or handle by index if duplicates exist in sentence
                         // Better: filter out words that are already in userOrder by count.
                         const countInUser = gameUserOrder.filter(w => w === word).length;
                         const countInSource = miniGameData.scrambled.filter(w => w === word).length;
                         if (countInUser >= countInSource) return null;

                         return (
                            <button 
                                key={i}
                                onClick={() => setGameUserOrder(prev => [...prev, word])}
                                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-indigo-700 hover:scale-110 transition-all active:scale-95"
                            >
                                {word}
                            </button>
                         );
                     })}
                 </div>

                 {feedback ? (
                     <div className={`font-bold text-lg ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                         {feedback.text}
                     </div>
                 ) : (
                     <button 
                        onClick={checkMiniGame} 
                        disabled={gameUserOrder.length === 0}
                        className="w-full max-w-xs bg-green-500 text-white py-4 rounded-2xl font-bold shadow-green-200 shadow-xl disabled:opacity-50 disabled:shadow-none"
                    >
                        Verificar Frase
                    </button>
                 )}
             </div>
          ) : currentSkill === SkillType.REINFORCEMENT ? (
             // --- REINFORCEMENT VIEW ---
             <div className="bg-orange-50 border-2 border-orange-100 rounded-3xl p-6 animate-in fade-in">
                 <div className="flex items-center gap-3 mb-6">
                     <span className="text-3xl">🚧</span>
                     <div>
                         <h3 className="font-bold text-orange-800 text-lg">Refuerzo de Errores</h3>
                         <p className="text-orange-600 text-sm">Leo quiere asegurarse de que dominas esto.</p>
                     </div>
                 </div>
                 
                 <div className="bg-white p-6 rounded-2xl shadow-sm mb-6">
                     <p className="text-xl font-bold text-center text-slate-800">{reinforcementData?.question}</p>
                 </div>

                 <input 
                     type="text"
                     value={textInput}
                     onChange={(e) => setTextInput(e.target.value)}
                     placeholder="Escribe tu respuesta..."
                     className="w-full p-4 rounded-xl border border-slate-200 mb-4 focus:ring-2 focus:ring-orange-400 outline-none"
                 />

                 {!feedback && (
                     <button onClick={submitReinforcement} className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold shadow-lg">
                         Corregir
                     </button>
                 )}
                 
                 {feedback && (
                     <div className="mt-4 text-center">
                         <p className={`font-bold ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{feedback.text}</p>
                         {feedback.type === 'success' && (
                             <button onClick={() => handleNextStep(true)} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg font-bold">
                                 Continuar
                             </button>
                         )}
                         {feedback.type === 'error' && (
                             <button onClick={() => setFeedback(null)} className="mt-4 text-orange-600 font-bold underline">
                                 Intentar de nuevo
                             </button>
                         )}
                     </div>
                 )}
             </div>
          ) : currentSkill === SkillType.ROLEPLAY ? (
              // --- ROLEPLAY ---
              <div className="flex flex-col h-full">
                  <div className="flex-1 overflow-y-auto mb-4 pb-24 px-2 space-y-4">
                      <div className="text-center text-slate-400 text-xs bg-white py-3 px-4 rounded-2xl border border-slate-100 shadow-sm mx-auto w-fit">
                        💡 Tip: Presiona el micrófono para hablar con Leo.
                      </div>
                      {conversationHistory.map((msg) => (
                          <ChatMessage key={msg.id} message={msg} />
                      ))}
                      <div ref={messagesEndRef} />
                  </div>
                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur border-t md:relative md:border-none md:p-0 z-20">
                      <div className="flex items-center gap-3">
                        <VoiceRecorder onRecordingComplete={(b64) => submitRoleplayMessage("User spoke.")} isProcessing={isProcessing} />
                        <div className="flex-1 relative">
                            <input 
                                type="text" 
                                value={textInput}
                                onChange={(e) => setTextInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && submitRoleplayMessage(textInput)}
                                placeholder="Escribe tu respuesta..."
                                className="w-full bg-white border border-slate-200 rounded-full px-5 py-4 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                      </div>
                      {conversationHistory.length >= 4 && (
                          <button onClick={() => handleNextStep(false)} className="w-full mt-4 bg-green-50 text-green-700 py-4 rounded-2xl font-bold hover:bg-green-100 border border-green-200">
                              Ir al Desafío Final
                          </button>
                      )}
                  </div>
              </div>
          ) : currentSkill === SkillType.TEST ? (
              // --- TEST ---
              <div className="flex flex-col gap-6 animate-in fade-in">
                  {testSubStep === 'dictation' && (
                      <div className="space-y-6">
                          <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-3xl text-center">
                             <h3 className="text-lg font-bold text-indigo-900 mb-2">Parte 1: Dictado Avanzado</h3>
                             <p className="text-xs text-indigo-400 mb-4">Escucha la frase completa (es más larga).</p>
                             <button onClick={() => audioBufferToPlay && safePlayAudio(audioBufferToPlay)} className="bg-white text-indigo-600 w-20 h-20 rounded-full shadow-lg mx-auto flex items-center justify-center hover:scale-110 transition-transform">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                             </button>
                          </div>
                          <input type="text" value={textInput} onChange={(e) => setTextInput(e.target.value)} className="w-full text-center text-xl p-4 border-b-4 border-slate-200 bg-transparent outline-none" placeholder="Escribe aquí..." />
                          {!feedback && <button onClick={submitDictation} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold">Verificar</button>}
                      </div>
                  )}
                  {testSubStep === 'speaking' && (
                      <div className="space-y-6 text-center">
                           <div className="bg-purple-50 border border-purple-100 p-6 rounded-3xl">
                             <h3 className="text-lg font-bold text-purple-900 mb-2">Parte 2: Expresión Oral</h3>
                             <p className="text-2xl font-black text-slate-800">"{testData?.speakingPrompt}"</p>
                             <p className="text-sm text-purple-400 mt-2">Responde con al menos 2-3 oraciones.</p>
                          </div>
                          <VoiceRecorder onRecordingComplete={submitSpeakingTest} isProcessing={isProcessing} />
                      </div>
                  )}
                  {feedback && (
                        <div className={`p-6 rounded-3xl border-l-8 shadow-lg ${feedback.type === 'success' ? 'bg-green-50 border-green-500 text-green-900' : 'bg-red-50 border-red-500 text-red-900'}`}>
                            <p className="font-medium text-lg">{feedback.text}</p>
                            {feedback.type === 'success' && testSubStep === 'speaking' && (
                                <button onClick={() => handleNextStep(false)} className="mt-4 bg-green-600 text-white px-8 py-3 rounded-xl font-bold">Finalizar</button>
                            )}
                            {feedback.type === 'error' && <button onClick={() => setFeedback(null)} className="mt-4 text-red-600 font-bold">Reintentar</button>}
                        </div>
                   )}
              </div>
          ) : (
              // --- STANDARD (READ/LISTEN/WRITE) ---
              <div className="flex flex-col gap-8 pb-20 animate-in fade-in">
                  {lessonIntro && (
                    <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl">
                        <p className="text-slate-700">{lessonIntro}</p>
                    </div>
                  )}

                  {(currentSkill === SkillType.READING || currentSkill === SkillType.LISTENING) && (
                     <InteractiveText 
                        text={currentSkill === SkillType.LISTENING && listeningScript ? listeningScript.script : lessonContent} 
                        onWordClick={handleWordClick} 
                        autoPlay={currentSkill === SkillType.LISTENING}
                     />
                  )}
                  
                  {currentSkill === SkillType.WRITING && (
                     <div className="bg-white p-6 rounded-3xl border border-indigo-50 shadow-lg text-lg text-slate-700">
                         Topic: <span className="font-bold text-indigo-600">{lessonContent}</span>
                     </div>
                  )}

                    <div className="space-y-6 mt-4">
                        {currentSkill === SkillType.READING && (
                            <button onClick={() => handleNextStep(false)} className="w-full bg-indigo-600 text-white px-8 py-5 rounded-2xl font-bold shadow-xl">¡Entendido! Continuar</button>
                        )}

                        {currentSkill === SkillType.LISTENING && (
                        <div className="flex flex-col gap-4">
                            <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200">
                                <p className="text-slate-800 font-bold text-xl">{listeningScript?.question}</p>
                            </div>
                            <textarea className="w-full bg-white border-2 border-slate-200 rounded-3xl p-5 outline-none" placeholder="Escribe tu respuesta..." rows={2} value={textInput} onChange={(e) => setTextInput(e.target.value)}/>
                            {!feedback && <button onClick={submitText} disabled={isProcessing} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold">Verificar</button>}
                        </div>
                        )}

                        {currentSkill === SkillType.WRITING && (
                        <div className="flex flex-col gap-4">
                            <textarea className="w-full bg-white border-2 border-slate-200 rounded-3xl p-5 outline-none" placeholder="Escribe un pequeño párrafo (2-3 frases)..." rows={4} value={textInput} onChange={(e) => setTextInput(e.target.value)}/>
                            {!feedback && <button onClick={submitText} disabled={isProcessing} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-bold">Revisar</button>}
                        </div>
                        )}
                        
                        {feedback && (
                        <div className={`p-6 rounded-3xl border-l-8 shadow-lg ${feedback.type === 'success' ? 'bg-green-50 border-green-500 text-green-900' : 'bg-red-50 border-red-500 text-red-900'}`}>
                            <p className="font-medium text-lg">{feedback.text}</p>
                            {feedback.type === 'success' ? (
                                <button onClick={() => handleNextStep(false)} className="mt-4 bg-green-600 text-white px-8 py-3 rounded-xl font-bold">Continuar</button>
                            ) : (
                                <button onClick={() => setFeedback(null)} className="mt-4 text-red-600 font-bold">Intentar de nuevo</button>
                            )}
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
      <div className="text-9xl mb-8 animate-bounce">🦁</div>
      <h2 className="text-6xl font-black mb-6">¡Excelente!</h2>
      <p className="opacity-90 mb-12 text-2xl">Lección completada.</p>
      <button onClick={() => setView('dashboard')} className="bg-white text-indigo-600 px-16 py-6 rounded-full font-black text-xl shadow-2xl hover:scale-105 transition-all">Volver al Menú</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-indigo-200 text-slate-900">
      {view === 'dashboard' && renderDashboard()}
      {view === 'lesson' && renderLesson()}
      {view === 'success' && renderSuccess()}
    </div>
  );
}
