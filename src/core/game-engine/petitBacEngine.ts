import {
  BacCategorySummary,
  BacRanking,
  BacResponse,
  BacResponseEntry,
  Room,
  UserConncted,
} from '../../types';
import { getRandomLetter } from '../../utils/gameUtils';
import { transitionBacPhase } from './stateMachine';

export interface StartBacOptions {
  categories?: string[];
  timeLimit?: number;
}

interface SubmitResult {
  shouldEndRound: boolean;
}

const DEFAULT_BAC_CATEGORIES = ['Prenom', 'Ville', 'Animal', 'Metier', 'Objet'];

export function startBacRound(room: Room, usersMap: Map<string, UserConncted>, options: StartBacOptions = {}): void {
  const categories = sanitizeCategories(
    options.categories && options.categories.length > 0
      ? options.categories
      : room.bacGame.categories
  );

  if (room.bacGame.phase === 'playing') {
    room.bacGame.phase = 'lobby';
  }
  room.bacGame.phase = transitionBacPhase(room.bacGame.phase, 'playing');
  room.bacGame.isRunning = true;
  room.bacGame.isVoting = false;
  room.bacGame.timeLimit = options.timeLimit ?? room.bacGame.timeLimit;
  room.bacGame.currentLetter = getRandomLetter();
  room.bacGame.categories = categories;
  room.bacGame.responses = buildEmptyResponseMap(categories);
  room.bacGame.summary = undefined;
  room.bacGame.scores = new Map<string, number>();

  room.users.forEach((roomUser) => {
    const user = usersMap.get(roomUser.id);
    if (!user) return;

    user.bacResponses = {};
    user.hasSubmitted = false;
    user.score = 0;
    room.bacGame.scores?.set(user.id, 0);
  });
}

export function submitBacRoundResponses(
  room: Room,
  usersMap: Map<string, UserConncted>,
  userId: string,
  responses: Record<string, BacResponse>
): SubmitResult {
  if (room.bacGame.phase !== 'playing') {
    return { shouldEndRound: false };
  }

  const user = usersMap.get(userId);
  if (!user) {
    return { shouldEndRound: false };
  }

  user.bacResponses = responses;
  user.hasSubmitted = true;

  const allSubmitted = room.users.every((roomUser) => usersMap.get(roomUser.id)?.hasSubmitted);

  return { shouldEndRound: allSubmitted };
}

export function forceFinishBacRound(room: Room, usersMap: Map<string, UserConncted>): void {
  if (room.bacGame.phase !== 'playing') return;

  room.users.forEach((roomUser) => {
    const user = usersMap.get(roomUser.id);
    if (!user) return;

    if (!user.bacResponses) {
      user.bacResponses = {};
    }
    user.hasSubmitted = true;
  });

  finalizeBacRound(room, usersMap);
}

export function finalizeBacRound(room: Room, usersMap: Map<string, UserConncted>): void {
  room.bacGame.phase = transitionBacPhase(room.bacGame.phase, 'review');
  room.bacGame.isRunning = false;

  const normalizedLetter = normalize(room.bacGame.currentLetter);
  const categories = room.bacGame.categories;
  const byCategory: Record<string, BacCategorySummary[]> = {};
  const scores = new Map<string, number>();

  room.users.forEach((roomUser) => {
    scores.set(roomUser.id, 0);
  });

  categories.forEach((category) => {
    const categoryEntries = collectCategoryEntries(room, usersMap, category);
    room.bacGame.responses[category] = categoryEntries;

    const normalizedCounts = new Map<string, number>();

    categoryEntries.forEach((entry) => {
      const normalizedResponse = normalize(entry.response);
      if (!normalizedResponse) return;

      const current = normalizedCounts.get(normalizedResponse) ?? 0;
      normalizedCounts.set(normalizedResponse, current + 1);
    });

    const summaries = categoryEntries.map((entry) => {
      const normalizedResponse = normalize(entry.response);
      const isValid = normalizedResponse.length > 0 && normalizedResponse.startsWith(normalizedLetter);
      const occurrence = normalizedCounts.get(normalizedResponse) ?? 0;
      const isUnique = isValid && occurrence === 1;
      const points = isValid ? (isUnique ? 2 : 1) : 0;

      scores.set(entry.userId, (scores.get(entry.userId) ?? 0) + points);

      return {
        userId: entry.userId,
        userName: entry.userName,
        response: entry.response,
        isValid,
        isUnique,
        points,
      };
    });

    byCategory[category] = summaries;
  });

  const ranking: BacRanking[] = room.users
    .map((roomUser) => ({
      userId: roomUser.id,
      userName: roomUser.name,
      score: scores.get(roomUser.id) ?? 0,
    }))
    .sort((a, b) => b.score - a.score || a.userName.localeCompare(b.userName));

  room.bacGame.scores = scores;
  room.bacGame.summary = { byCategory, ranking };
  room.bacGame.phase = transitionBacPhase(room.bacGame.phase, 'scored');
  room.bacGame.isVoting = false;

  ranking.forEach((rank) => {
    const user = usersMap.get(rank.userId);
    if (user) {
      user.score = rank.score;
    }
  });
}

function collectCategoryEntries(room: Room, usersMap: Map<string, UserConncted>, category: string): BacResponseEntry[] {
  return room.users.map((roomUser) => {
    const user = usersMap.get(roomUser.id) ?? roomUser;
    const response = user.bacResponses?.[category]?.response ?? '';

    return {
      userId: user.id,
      userName: user.name,
      category,
      response,
    };
  });
}

function buildEmptyResponseMap(categories: string[]): Record<string, BacResponseEntry[]> {
  return categories.reduce((accumulator, category) => {
    accumulator[category] = [];
    return accumulator;
  }, {} as Record<string, BacResponseEntry[]>);
}

function sanitizeCategories(categories: string[] | undefined): string[] {
  if (!categories || categories.length < 2) {
    return DEFAULT_BAC_CATEGORIES;
  }

  const cleaned = categories
    .map((category) => (category ?? '').trim())
    .filter(Boolean);

  return cleaned.length >= 2 ? cleaned : DEFAULT_BAC_CATEGORIES;
}

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
