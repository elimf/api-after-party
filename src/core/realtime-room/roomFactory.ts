import { BacResponseEntry, Room, UserConncted } from '../../types';

const DEFAULT_BAC_CATEGORIES = ['Prenom', 'Ville', 'Animal', 'Metier', 'Objet'];

export function createRoomModel(roomId: string, roomName: string, owner: UserConncted): Room {
  return {
    id: roomId,
    name: roomName,
    ownerId: owner.id,
    users: [owner],
    messages: [],
    currentQuestionIndex: 0,
    quiz: {
      questions: [],
      totalQuestions: 0,
      type: '',
      timeLimit: 10000,
      difficulty: '',
      results: undefined,
      isRunning: false,
    },
    bacGame: {
      phase: 'lobby',
      isRunning: false,
      isVoting: false,
      timeLimit: 120000,
      categories: DEFAULT_BAC_CATEGORIES,
      currentLetter: '',
      responses: DEFAULT_BAC_CATEGORIES.reduce((accumulator, category) => {
        accumulator[category] = [];
        return accumulator;
      }, {} as Record<string, BacResponseEntry[]>),
    },
  };
}
