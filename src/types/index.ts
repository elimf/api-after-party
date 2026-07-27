import { WebSocket } from 'ws';

export type BacPhase = 'lobby' | 'playing' | 'review' | 'scored';

export interface UserConncted {
  id: string;
  ws: WebSocket;
  name: string;
  score: number;
  responseTimes: number[];
  answers: Map<number, { answerIndex: number; responseTime: number }>;
  bacResponses: Record<string, BacResponse>;
  hasSubmitted: boolean;
}

export interface Room {
  id: string;
  name: string;
  ownerId: string;
  users: UserConncted[];
  messages: Message[];
  currentQuestionIndex: number;
  quiz: Quiz;
  bacGame: BacGame;
}

export interface Message {
  id: string;
  text: string;
  name: string;
  createdAt: Date;
}

export interface Quiz {
  isRunning: boolean;
  questions: Question[];
  type: string;
  totalQuestions: number;
  timeLimit: number;
  difficulty: string;
  results: QuizResults | undefined;
}

export interface BacGame {
  phase: BacPhase;
  isRunning: boolean;
  isVoting: boolean;
  timeLimit: number;
  categories: string[];
  currentLetter: string;
  responses: Record<string, BacResponseEntry[]>;
  scores?: Map<string, number>;
  summary?: BacRoundSummary;
}

export interface BacResponse {
  response: string;
  responseTime: number;
}

export interface BacResponseEntry {
  userId: string;
  userName: string;
  category: string;
  response: string;
}

export interface BacRoundSummary {
  byCategory: Record<string, BacCategorySummary[]>;
  ranking: BacRanking[];
}

export interface BacCategorySummary {
  userId: string;
  userName: string;
  response: string;
  isValid: boolean;
  isUnique: boolean;
  points: number;
}

export interface BacRanking {
  userId: string;
  userName: string;
  score: number;
}

export interface Question {
  text: string;
  choices: string[];
  correctAnswer: number;
  type: string;
  mediaUrl?: string;
}

export interface QuizResults {
  users: UserResult[];
}

export interface UserResult {
  userId: string;
  name: string;
  score: number;
  avgResponseTime: number;
}
