import WebSocket, { Server as WebSocketServer } from 'ws';
import { Room } from '../types';
import { rooms, users } from '../data';
import {
  finalizeBacRound,
  forceFinishBacRound,
  startBacRound,
  submitBacRoundResponses,
} from '../core/game-engine/petitBacEngine';

const bacTimers = new Map<string, NodeJS.Timeout>();

export function startBacGame(
  ws: WebSocket,
  _wss: WebSocketServer,
  parsedMessage: any
) {
  const room = rooms.get(parsedMessage.roomId);
  if (!room) return;

  if (bacTimers.has(room.id)) {
    clearTimeout(bacTimers.get(room.id)!);
    bacTimers.delete(room.id);
  }

  const timeLimit = Number(parsedMessage.timeLimit ?? room.bacGame.timeLimit);
  const categories = Array.isArray(parsedMessage.categories) ? parsedMessage.categories : undefined;

  startBacRound(room, users, {
    timeLimit: Number.isFinite(timeLimit) && timeLimit >= 0 ? timeLimit : room.bacGame.timeLimit,
    categories,
  });

  publishRoomState(room);

  if (room.bacGame.timeLimit > 0) {
    const timeout = setTimeout(() => {
      forceFinishBacRound(room, users);
      publishRoundResult(room, true);
      bacTimers.delete(room.id);
    }, room.bacGame.timeLimit);

    bacTimers.set(room.id, timeout);
  }

  ws.send(JSON.stringify({ type: 'system', message: 'Partie Petit Bac demarree' }));
}

export function handleBacResponse(
  ws: WebSocket,
  _wss: WebSocketServer,
  parsedMessage: any
) {
  const room = rooms.get(parsedMessage.roomId);
  if (!room || !room.bacGame.isRunning) return;

  const userId = parsedMessage.user;
  const responses = parsedMessage.responses;

  if (!responses || typeof responses !== 'object') {
    ws.send(JSON.stringify({ type: 'system', message: 'Format de reponses invalide' }));
    return;
  }

  const result = submitBacRoundResponses(room, users, userId, responses);

  const user = users.get(userId);
  if (user) {
    user.ws.send(JSON.stringify({ type: 'system', message: 'Reponses soumises' }));
  }

  if (result.shouldEndRound) {
    if (bacTimers.has(room.id)) {
      clearTimeout(bacTimers.get(room.id)!);
      bacTimers.delete(room.id);
    }

    finalizeBacRound(room, users);
    publishRoundResult(room, false);
  } else {
    publishRoomState(room);
  }
}

export function handleVote(): void {
  // Deprecated: Petit Bac now resolves automatically based on unique/shared answers.
}

function publishRoomState(room: Room): void {
  room.users.forEach((roomUser) => {
    const user = users.get(roomUser.id);

    if (user) {
      user.ws.send(JSON.stringify({ type: 'currentUser', info: user }));
    }

    roomUser.ws.send(JSON.stringify({ type: 'room', room }));
  });
}

function publishRoundResult(room: Room, fromTimeout: boolean): void {
  publishRoomState(room);

  room.users.forEach((roomUser) => {
    roomUser.ws.send(
      JSON.stringify({
        type: 'bacResults',
        fromTimeout,
        letter: room.bacGame.currentLetter,
        summary: room.bacGame.summary,
        scores: Array.from(room.bacGame.scores?.entries() ?? []).map(([userId, score]) => ({ userId, score })),
      })
    );

    roomUser.ws.send(
      JSON.stringify({
        type: 'system',
        message: fromTimeout ? 'Temps ecoule. Resultats du Petit Bac.' : 'Tous les joueurs ont soumis. Resultats du Petit Bac.',
      })
    );
  });
}
