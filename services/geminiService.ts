import { GoogleGenAI, Type } from "@google/genai";
import { CEFRLevel, Message } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = 'gemini-2.5-flash';

/**
 * Generates an introduction or context for a specific lesson topic.
 */
export const generateLessonContext = async (level: CEFRLevel, topic: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Actúa como un tutor de inglés amable y paciente para un estudiante hispanohablante de nivel ${level}.
      Escribe una introducción muy breve (máximo 30 palabras) para una lección sobre: "${topic}".
      Usa un lenguaje sencillo y alentador.
      IMPORTANTE: Si el nivel es A1 o A2, escribe la explicación principal en Español para que entiendan el contexto, pero incluye ejemplos en inglés.
      Si es B1 o superior, escribe todo en Inglés.
      Formato: Texto plano.`,
    });
    return response.text || "¡Bienvenido a tu nueva lección!";
  } catch (error) {
    console.error("Error generating context:", error);
    return "Comencemos a aprender este tema.";
  }
};

/**
 * Evaluates a user's text input (Writing/Reading comprehension).
 */
export const evaluateTextSubmission = async (
  level: CEFRLevel,
  topic: string,
  userText: string,
  promptContext: string
): Promise<{ correct: boolean; feedback: string; score: number }> => {
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        correct: { type: Type.BOOLEAN },
        feedback: { type: Type.STRING },
        score: { type: Type.INTEGER, description: "Score from 0 to 100" },
      },
      required: ["correct", "feedback", "score"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Actúa como un tutor de inglés para hispanohablantes. Nivel del estudiante: ${level}.
      Tema: ${topic}.
      Tarea: Se le preguntó al estudiante: "${promptContext}".
      Respuesta del estudiante: "${userText}"
      
      Evalúa la respuesta.
      1. Debe ser relevante a la pregunta.
      2. La gramática/ortografía debe ser apropiada para el nivel ${level}.
      
      Proporciona retroalimentación constructiva (Feedback).
      IMPORTANTE: El 'feedback' debe estar en ESPAÑOL para que el estudiante entienda sus errores claramente, especialmente si es nivel bajo.
      Return JSON.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      correct: result.correct ?? false,
      feedback: result.feedback ?? "No pude evaluar eso correctamente. Intenta de nuevo.",
      score: result.score ?? 0,
    };
  } catch (error) {
    console.error("Error evaluating text:", error);
    return { correct: false, feedback: "Error de servicio. Intenta de nuevo.", score: 0 };
  }
};

/**
 * Evaluates a user's audio input (Speaking).
 */
export const evaluateAudioSubmission = async (
  level: CEFRLevel,
  topic: string,
  audioBase64: string,
  promptContext: string
): Promise<{ correct: boolean; feedback: string; transcription: string; score: number }> => {
  try {
    const schema = {
      type: Type.OBJECT,
      properties: {
        correct: { type: Type.BOOLEAN },
        transcription: { type: Type.STRING },
        feedback: { type: Type.STRING },
        score: { type: Type.INTEGER },
      },
      required: ["correct", "transcription", "feedback", "score"],
    };

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "audio/webm; codecs=opus",
              data: audioBase64,
            },
          },
          {
            text: `Actúa como un tutor de inglés. Nivel: ${level}. Tema: ${topic}. 
            Contexto: El estudiante responde a: "${promptContext}".
            
            Escucha el audio.
            1. Transcribe exactamente lo que dijo el estudiante (en inglés).
            2. Califica la pronunciación y claridad.
            
            Output JSON.
            IMPORTANTE: El campo 'feedback' debe estar en ESPAÑOL.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const result = JSON.parse(response.text || "{}");
    return {
      correct: result.correct ?? false,
      feedback: result.feedback ?? "No pude escuchar claramente.",
      transcription: result.transcription ?? "",
      score: result.score ?? 0,
    };

  } catch (error) {
    console.error("Error evaluating audio:", error);
    return { correct: false, feedback: "Error de procesamiento de audio.", transcription: "", score: 0 };
  }
};

/**
 * Generates a "Listening" challenge (ESL Lab style).
 */
export const generateListeningChallenge = async (level: CEFRLevel, topic: string): Promise<{ script: string; question: string; answerKeywords: string[] }> => {
    try {
      const schema = {
        type: Type.OBJECT,
        properties: {
          script: { type: Type.STRING, description: "A short natural monologue or dialogue in English (approx 40-60 words)." },
          question: { type: Type.STRING, description: "A comprehension question about the script (In English)." },
          answerKeywords: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Keywords expected in the answer." },
        },
        required: ["script", "question", "answerKeywords"],
      };
  
      const response = await ai.models.generateContent({
        model: MODEL_NAME,
        contents: `Crea un ejercicio de escucha (Listening) para nivel de inglés ${level} sobre el tema ${topic}.
        El guion (script) debe ser natural, como una situación de la vida real.
        La pregunta debe verificar si entendieron el punto principal.
        Aunque las instrucciones internas son en español, el contenido generado (script y pregunta) DEBE SER EN INGLÉS.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: schema,
        },
      });
      
      return JSON.parse(response.text || "{}");
    } catch (e) {
      return { script: "Hello, how are you today?", question: "How did I greet you?", answerKeywords: ["hello", "how"] };
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
                tutorText: { type: Type.STRING, description: "The tutor's conversational reply in English." },
                feedback: { type: Type.STRING, description: "Brief feedback on the user's last message in SPANISH." },
                correction: { type: Type.STRING, description: "The corrected version of the user's sentence if it had errors." },
            },
            required: ["tutorText", "feedback", "correction"],
        };

        // Construct history text
        const historyText = history.map(m => `${m.role}: ${m.text}`).join("\n");

        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Actúa como un compañero de conversación en inglés amigable (Tutor). 
            Nivel: ${level}. Tema: ${topic}.
            
            Objetivo: Tener una conversación natural para practicar.
            
            Historial:
            ${historyText}
            Usuario: ${lastUserText}
            
            1. Analiza el último mensaje del usuario.
            2. Proporciona una respuesta natural en INGLÉS para continuar la charla.
            3. Proporciona una corrección gentil si cometieron un error.
            4. El campo 'feedback' debe ser breve y en ESPAÑOL para explicar el error.
            
            Return JSON.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: schema,
            }
        });

        return JSON.parse(response.text || "{}");
    } catch (e) {
        console.error(e);
        return { tutorText: "I didn't catch that. Could you say it again?", feedback: "Error de conexión.", correction: "" };
    }
};