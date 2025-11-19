
export enum SkillType {
  SPEAKING = 'SPEAKING',
  LISTENING = 'LISTENING',
  WRITING = 'WRITING',
  READING = 'READING',
  ROLEPLAY = 'ROLEPLAY' // New interactive mode
}

export enum CEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1'
}

export interface Lesson {
  id: string;
  title: string;
  description: string;
  level: CEFRLevel;
  topics: string[]; 
  completed: boolean;
  locked: boolean;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  audioData?: string; // Base64
  timestamp: number;
  feedback?: string; // Tutor feedback on this specific message
  correction?: string; // Corrected version of user's input
}

export interface UserState {
  currentLevel: CEFRLevel;
  xp: number;
  streak: number;
  unlockedLessons: string[];
}
