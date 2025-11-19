import React, { useState, useEffect, useRef } from 'react';
import { generateSpeech, decodePCM } from '../services/geminiService';

interface InteractiveTextProps {
  text: string;
  onWordClick: (word: string) => void;
  autoPlay?: boolean;
  lang?: string;
}

const InteractiveText: React.FC<InteractiveTextProps> = ({ 
  text, 
  onWordClick, 
  autoPlay = false,
  lang = 'en-US'
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [rawAudioBuffer, setRawAudioBuffer] = useState<ArrayBuffer | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  
  // Refs for active playback management
  const activeAudioContextRef = useRef<AudioContext | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  // Ensure text lines are clean
  const lines = text ? text.split('\n').filter(l => l.trim().length > 0) : [];

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopAudio();
    };
  }, []);

  // Fetch Audio when text changes
  useEffect(() => {
    const fetchAudio = async () => {
      if (!text) return;
      
      stopAudio();
      setRawAudioBuffer(null);
      setIsLoadingAudio(true);
      
      try {
        const buffer = await generateSpeech(text);
        if (buffer) {
          setRawAudioBuffer(buffer);
          setIsLoadingAudio(false);
          if (autoPlay) {
            // Small timeout to allow state to settle before playing
            setTimeout(() => playAudio(buffer), 100);
          }
        } else {
          setIsLoadingAudio(false);
        }
      } catch (e) {
        console.error("Error fetching speech:", e);
        setIsLoadingAudio(false);
      }
    };

    fetchAudio();
  }, [text]);

  const playAudio = async (bufferToPlay: ArrayBuffer) => {
    try {
      stopAudio(); // Stop any existing playback

      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContextClass();
      activeAudioContextRef.current = ctx;

      // Use custom PCM decoding since Gemini TTS returns raw PCM
      const audioBuffer = decodePCM(ctx, bufferToPlay);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      source.onended = () => {
        setIsPlaying(false);
        // Clean up context after a short delay
        setTimeout(() => {
            if (activeAudioContextRef.current === ctx) {
                 if (ctx.state !== 'closed') ctx.close();
                 activeAudioContextRef.current = null;
            }
        }, 200);
      };

      activeSourceNodeRef.current = source;
      
      // Ensure context is running
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      source.start(0);
      setIsPlaying(true);

    } catch (error) {
      console.error("Playback error:", error);
      setIsPlaying(false);
    }
  };

  const handlePlayToggle = () => {
    if (!rawAudioBuffer) return;

    if (isPlaying) {
      stopAudio();
      setIsPlaying(false);
    } else {
      playAudio(rawAudioBuffer);
    }
  };

  const stopAudio = () => {
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.stop();
      } catch (e) {}
      activeSourceNodeRef.current = null;
    }
    if (activeAudioContextRef.current) {
      try {
        if (activeAudioContextRef.current.state !== 'closed') {
            activeAudioContextRef.current.close();
        }
      } catch (e) {}
      activeAudioContextRef.current = null;
    }
  };

  const isDialogueLine = (line: string) => {
    return line.trim().startsWith('-') || line.includes(':');
  };

  return (
    <div className="space-y-6">
      {/* Text Container */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
        <div className="flex flex-col gap-3">
          {lines.map((line, lineIdx) => {
            const isDialogue = isDialogueLine(line);
            
            return (
              <div 
                key={lineIdx} 
                className={`
                  relative leading-relaxed text-lg md:text-xl transition-colors rounded-xl px-3 py-1
                  ${isDialogue ? 'pl-4 border-l-4 border-indigo-200 bg-indigo-50/30 my-1' : 'text-slate-700'}
                `}
              >
                {line.split(' ').map((word, wIdx) => (
                  <span
                    key={`${lineIdx}-${wIdx}`}
                    onClick={() => onWordClick(word.replace(/[.,/#!$%^&*;:{}=\-_`~()]/g,""))}
                    className="inline-block cursor-pointer hover:text-indigo-600 hover:bg-indigo-50 rounded px-0.5 transition-colors mr-1.5"
                  >
                    {word}
                  </span>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center">
        <button 
          onClick={handlePlayToggle}
          disabled={isLoadingAudio || !rawAudioBuffer}
          className={`
            flex items-center gap-3 px-8 py-4 rounded-full font-bold shadow-xl transition-all transform active:scale-95
            ${isPlaying 
              ? 'bg-amber-100 text-amber-700 hover:bg-amber-200 ring-4 ring-amber-50' 
              : 'bg-indigo-600 text-white hover:bg-indigo-700 ring-4 ring-indigo-100'}
            ${(isLoadingAudio || !rawAudioBuffer) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          {isLoadingAudio ? (
            <>
               <svg className="animate-spin h-5 w-5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               <span>Cargando Audio...</span>
            </>
          ) : isPlaying ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Pausar</span>
            </>
          ) : (
             <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <span>Escuchar Tutor</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default InteractiveText;