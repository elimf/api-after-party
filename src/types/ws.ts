import { WebSocket } from 'ws';
import { BacGame, Question, Room, UserConncted } from './index';

// Client -> Server messages
export type ClientToServerMessage =
  | { type: 'start'; token: string }
  | { type: 'createRoom'; room: string; owner: string }
  | { type: 'joinRoom'; roomId: string; user: string }
  | { type: 'leaveRoom'; roomId: string; user: string }
  | { type: 'message'; message: string; user: string; roomId: string }
  | {
      type: 'startQuiz';
      roomId: string;
      user: string;
      typeQuestion: string;
      numberQuestion: string | number;
      difficulty: string;
      musicSource?: string;
      sourceId?: string;
      includeFeatures?: boolean;
    }
  | { type: 'submitAnswer'; roomId: string; user: string; answer: number; responseTime: number }
  | { type: 'startBacGame'; roomId: string; user?: string; timeLimit?: number; categories?: string[] }
  | { type: 'submitBacResponse'; roomId: string; user: string; responses: Record<string, string>; autoSubmit?: boolean }
  | { type: 'getRooms' }
  | { type: 'getUsers' };

// Server -> Client messages
export type ServerToClientMessage =
  | { type: 'system'; message: string; disconnect?: boolean; info?: any }
  | { type: 'error'; message: string }
  | { type: 'reconnect'; info: UserConncted; room?: Room | null }
  | { type: 'currentUser'; info: UserConncted }
  | { type: 'room'; room: Room | null; message?: string }
  | { type: 'rooms'; rooms: Array<{ id: string; name: string; ownerId: string }> }
  | { type: 'users'; users: UserConncted[] }
  | { type: 'question'; question: string; choices: string[] }
  | { type: 'answer'; correctAnswer: string }
  | { type: 'endQuiz'; message: string }
  | {
      type: 'bacResults';
      fromTimeout: boolean;
      letter: string;
      summary?: BacGame['summary'];
      scores?: Array<{ userId: string; score: number }>;
    };

export interface TypedWebSocket extends WebSocket {
  userId?: string;
}
