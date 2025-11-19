
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { CEFRLevel, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';
const TTS_MODEL = 'gemini-2.5-flash-preview-tts';

// Helper to clean JSON string from Markdown code blocks
const cleanAndParseJSON = (text: string | undefined, fallback: any) => {
  if (!text) return fallback;
  try {
    // Remove markdown code blocks if present
    const cleaned = text.replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("JSON Parse Error:", e, "Text:", text);
    return fallback;
  }
};

/**
 * Decodes raw PCM audio data (Int16, 24kHz) into an AudioBuffer.
 */
export const decodePCM = (ctx: AudioContext, arrayBuffer: ArrayBuffer): AudioBuffer => {
  const pcmData = new Int16Array(arrayBuffer);
  const sampleRate = 24000; 
  const buffer = ctx.createBuffer(1, pcmData.length, sampleRate);
  const channelData = buffer.getChannelData(0);
  for (let i = 0; i < pcmData.length; i++) {
    channelData[i] = pcmData[i] / 32768.0;
  }
  return buffer;
};

/**
 * Generates natural sounding speech from text using Gemini TTS.
 */
export const generateSpeech = async (text: string): Promise<ArrayBuffer | null> => {
  try {
    const response = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: { parts: [{ text: text }] },
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      const binaryString = atob(base64Audio);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return bytes.buffer;
    }
    return null;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

/**
 * Generates an introduction or context for a specific lesson topic.
 */
export const generateLessonContext = async (level: CEFRLevel, topic: string): Promise<{ intro: string; content: string }> => {
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        intro: { type: Type.STRING, description: "Instructions in Spanish." },
        content: { type: Type.STRING, description: "The English dialogue or text." },
      },
      required: ["intro", "content"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Actúa como 'Leo', un tutor de inglés experto. Nivel: ${level}. Tema: "${topic}".
      
      1. 'intro': Escribe instrucciones claras y motivadoras en Español Latino para una actividad de LECTURA. Explica qué aprenderemos hoy.
      2. 'content': Genera un DIÁLOGO o HISTORIA detallada (mínimo 8-12 líneas/intervenciones).
         - Debe ser rico en contenido, no solo saludos básicos.
         - Introduce vocabulario interesante acorde al nivel.
         - Usa guiones (-) para diálogos.
         - Separa cada frase con un salto de línea (\\n).
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return cleanAndParseJSON(response.text, { intro: "Bienvenido. Lee el siguiente texto con atención.", content: "- Hello!\n- Hi there.\n- How are you?\n- I am fine." });
  } catch (error) {
    console.error("Error generating context:", error);
    return { intro: "Hola, vamos a practicar.", content: "- Hello!\n- Hi there." };
  }
};

/**
 * Defines a specific word in context for the user.
 */
export const defineWord = async (word: string, contextSentence: string): Promise<{ definition: string; example: string }> => {
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        definition: { type: Type.STRING, description: "Meaning in simple Spanish." },
        example: { type: Type.STRING, description: "A simple example sentence in English." },
      },
      required: ["definition", "example"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Define la palabra "${word}" basada en el contexto: "${contextSentence}".
      1. Definición: Clara y útil en Español.
      2. Ejemplo: Una frase completa en Inglés usando la palabra, diferente al texto original.
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return cleanAndParseJSON(response.text, { definition: "Definición no disponible", example: "-" });
  } catch (error) {
    return { definition: "No pudimos cargar la definición.", example: "" };
  }
};

/**
 * Evaluates a user's text input.
 */
export const evaluateTextSubmission = async (
  level: CEFRLevel,
  topic: string,
  userText: string,
  promptContext: string,
  userHistoryErrors: string[] = []
): Promise<{ correct: boolean; feedback: string; score: number; errorKeywords?: string[] }> => {
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        correct: { type: Type.BOOLEAN },
        feedback: { type: Type.STRING },
        score: { type: Type.INTEGER },
        errorKeywords: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["correct", "feedback", "score"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Evalúa respuesta estudiante. Nivel: ${level}.
      Contexto/Pregunta: "${promptContext}"
      Respuesta Estudiante: "${userText}"
      Errores previos: [${userHistoryErrors.join(', ')}].
      
      Reglas estrictas:
      1. La respuesta debe ser completa y gramaticalmente aceptable.
      2. Si es demasiado corta (1 palabra) y la pregunta requería más, márcala como incorrecta o pide más detalles.
      3. Feedback en Español Latino: Explica el error gramatical o de vocabulario si existe.
      4. Extrae palabras clave del error en 'errorKeywords'.
      
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = cleanAndParseJSON(response.text, {});
    return {
      correct: result.correct ?? false,
      feedback: result.feedback ?? "Evaluación no disponible.",
      score: result.score ?? 0,
      errorKeywords: result.errorKeywords || []
    };
  } catch (error) {
    return { correct: false, feedback: "Error de servicio.", score: 0, errorKeywords: [] };
  }
};

/**
 * Generates a "Listening" challenge.
 */
export const generateListeningChallenge = async (level: CEFRLevel, topic: string): Promise<{ script: string; question: string }> => {
    try {
      const schema = {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING, description: "Dialogue/Story with newlines." },
          question: { type: Type.STRING },
        },
        required: ["script", "question"],
      };
  
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Genera un ejercicio de 'Listening' robusto. Nivel: ${level}. Tema: ${topic}.
        
        1. Script: Crea un diálogo o historia de longitud media (100-150 palabras).
           - Incluye detalles específicos (horas, colores, lugares, sentimientos) que sirvan de 'distractores'.
           - Que suene muy natural y fluido.
        2. Question: Haz una pregunta de COMPRENSIÓN en Inglés.
           - NO preguntes algo obvio que se dice en la primera frase.
           - Pregunta sobre la razón de algo, una consecuencia, o un detalle específico mencionado a la mitad.
           - Ejemplo: "Why did Ben buy the red shirt instead of the blue one?" (No solo "What did Ben buy?").
           
        Return JSON.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      
      return cleanAndParseJSON(response.text, { script: "- Hello.\n- Hi, I am looking for a bank.", question: "What is he looking for?" });
    } catch (e) {
      return { script: "Audio not available.", question: "Error?" };
    }
};

/**
 * Handles a conversation turn for Roleplay.
 */
export const generateTutorReply = async (
    level: CEFRLevel,
    topic: string,
    history: Message[],
    lastUserText: string
): Promise<{ tutorText: string; feedback: string; correction: string }> => {
    try {
        const schema = {
            type: Type.OBJECT,
            properties: {
                tutorText: { type: Type.STRING },
                feedback: { type: Type.STRING },
                correction: { type: Type.STRING },
            },
            required: ["tutorText", "feedback", "correction"],
        };

        const historyText = history.slice(-5).map(m => `${m.role}: ${m.text}`).join("\n");

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Roleplay como 'Leo'. Nivel ${level}. Tema: ${topic}.
            Historial: ${historyText}
            Usuario: "${lastUserText}"
            
            1. tutorText: Responde de forma natural.
               - NO aceptes respuestas monosílabas (Yes/No). Si el usuario responde corto, pídele educadamente que elabore o pregúntale "Why?".
               - Haz preguntas abiertas para fomentar que el usuario hable más.
            2. feedback: Explica errores gramaticales en Español (si los hay).
            3. correction: Versión corregida de lo que dijo el usuario.
            
            Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        return cleanAndParseJSON(response.text, { tutorText: "Interesting! Tell me more.", feedback: "", correction: "" });
    } catch (e) {
        return { tutorText: "Could you repeat that?", feedback: "Error de conexión.", correction: "" };
    }
};

/**
 * Generates the Final Test.
 */
export const generateFinalReview = async (level: CEFRLevel, topic: string): Promise<{ dictationPhrase: string; speakingPrompt: string }> => {
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        dictationPhrase: { type: Type.STRING },
        speakingPrompt: { type: Type.STRING },
      },
      required: ["dictationPhrase", "speakingPrompt"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Test final Nivel ${level} Tema: ${topic}.
      1. dictationPhrase: Una oración COMPLEJA y larga (10-15 palabras). Debe incluir adjetivos y conectores (and, but, because).
      2. speakingPrompt: Un reto de expresión oral.
         - Ejemplo: "Describe your best friend in detail: appearance, personality, and hobbies."
         - Debe requerir al menos 3 oraciones para responderse bien.
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    return cleanAndParseJSON(response.text, { dictationPhrase: "English is important for my future career.", speakingPrompt: "Talk about your family." });
  } catch (e) {
    return { dictationPhrase: "The sky is blue today.", speakingPrompt: "How are you?" };
  }
};

/**
 * Generates a specific reinforcement exercise based on user's weak words.
 */
export const generateReinforcement = async (weakWords: string[]): Promise<{ question: string; correctAnswer: string; type: 'translation' | 'fill_blank' }> => {
    try {
        const schema = {
            type: Type.OBJECT,
            properties: {
                question: { type: Type.STRING },
                correctAnswer: { type: Type.STRING },
                type: { type: Type.STRING, enum: ['translation', 'fill_blank'] }
            },
            required: ["question", "correctAnswer", "type"]
        };

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `El usuario falló en: [${weakWords.join(', ')}].
            Genera un ejercicio retador.
            - Si es 'translation', pon una frase completa en español, no solo una palabra.
            - Si es 'fill_blank', que la frase tenga contexto suficiente.
            Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        return cleanAndParseJSON(response.text, { question: "Traduce: El gato negro", correctAnswer: "The black cat", type: 'translation' });
    } catch (e) {
        return { question: "Traduce: Hola", correctAnswer: "Hello", type: 'translation' };
    }
};

/**
 * Improves the user's personal profile bio.
 */
export const generateProfileImprovement = async (currentBio: string, level: CEFRLevel): Promise<{ improvedText: string; feedback: string }> => {
    try {
        const schema = {
            type: Type.OBJECT,
            properties: {
                improvedText: { type: Type.STRING },
                feedback: { type: Type.STRING }
            },
            required: ["improvedText", "feedback"]
        };

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Mejora esta presentación personal: "${currentBio}". (Nivel ${level}).
            - Hazla sonar más fluida y nativa.
            - Agrega conectores lógicos si faltan.
            - Feedback en español explicando los cambios clave.
            Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        return cleanAndParseJSON(response.text, { improvedText: currentBio, feedback: "Sin cambios." });
    } catch (e) {
        return { improvedText: currentBio, feedback: "Error." };
    }
};

/**
 * Generates a Random Mini Game Data (Word Jumble).
 */
export const generateMiniGame = async (level: CEFRLevel): Promise<{ scrambled: string[]; correctSentence: string }> => {
    try {
        const schema = {
            type: Type.OBJECT,
            properties: {
                scrambled: { type: Type.ARRAY, items: { type: Type.STRING } },
                correctSentence: { type: Type.STRING }
            },
            required: ["scrambled", "correctSentence"]
        };
        
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Juego de ordenar frase (Nivel ${level}).
            1. correctSentence: Frase de mediana complejidad (6-9 palabras).
            2. scrambled: Las palabras desordenadas.
            Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });
        
        return cleanAndParseJSON(response.text, { scrambled: ["is", "name", "My", "Ben"], correctSentence: "My name is Ben" });
    } catch (e) {
        return { scrambled: ["Love", "I", "English"], correctSentence: "I Love English" };
    }
};
