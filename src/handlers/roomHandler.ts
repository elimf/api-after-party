import WebSocket, { Server as WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { rooms, users } from '../data';
import { broadcastRooms } from '../utils/websocketUtils';
import { createRoomModel } from '../core/realtime-room/roomFactory';
import { addUserToRoom, removeUserFromRoom, shouldDeleteRoom } from '../core/realtime-room/roomLifecycle';

export function handleCreateRoom(
  ws: WebSocket,
  wss: WebSocketServer,
  parsedMessage: any
) {
  const roomName = parsedMessage.room;
  const ownerId = parsedMessage.owner;
  const owner = users.get(ownerId);
  const roomId = uuidv4();

  if (!owner) {
    ws.send(JSON.stringify({ type: 'system', message: 'Proprietaire introuvable' }));
    return;
  }

  const newRoom = createRoomModel(roomId, roomName, owner);
  rooms.set(roomId, newRoom);

  ws.send(
    JSON.stringify({
      type: 'room',
      message: `Salle ${roomName} creee`,
      room: newRoom,
    })
  );

  broadcastRooms(wss, rooms, users);
}

export function handleJoinRoom(
  ws: WebSocket,
  wss: WebSocketServer,
  parsedMessage: any
) {
  const joinRoomId = parsedMessage.roomId;
  const userToJoinId = parsedMessage.user;
  const roomToJoin = rooms.get(joinRoomId);

  if (!roomToJoin) {
    ws.send(JSON.stringify({ type: 'system', message: `La salle n'existe plus` }));
    broadcastRooms(wss, rooms, users);
    return;
  }

  const user = users.get(userToJoinId);
  if (!user) {
    ws.send(JSON.stringify({ type: 'system', message: 'Utilisateur introuvable' }));
    return;
  }

  addUserToRoom(roomToJoin, user);

  ws.send(JSON.stringify({ type: 'room', room: roomToJoin }));
  ws.send(
    JSON.stringify({
      type: 'system',
      message: `Vous avez rejoint la salle ${roomToJoin.name}`,
    })
  );

  broadcastRooms(wss, rooms, users);
}

export function handleLeaveRoom(
  ws: WebSocket,
  wss: WebSocketServer,
  parsedMessage: any
) {
  const leaveRoomId = parsedMessage.roomId;
  const userToLeaveId = parsedMessage.user;

  if (!leaveRoomId || !userToLeaveId) {
    return;
  }

  const roomToLeave = rooms.get(leaveRoomId);
  if (!roomToLeave) {
    return;
  }

  removeUserFromRoom(roomToLeave, userToLeaveId);

  roomToLeave.users.forEach((user) => {
    user.ws.send(JSON.stringify({ type: 'room', room: roomToLeave }));
  });

  if (shouldDeleteRoom(roomToLeave, userToLeaveId)) {
    rooms.delete(leaveRoomId);

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'system',
          message: `La salle ${roomToLeave.name} a ete supprimee car vous en etiez le proprietaire`,
        })
      );
    }

    roomToLeave.users.forEach((user) => {
      user.ws.send(JSON.stringify({ type: 'system', message: `La salle ${roomToLeave.name} a ete supprimee` }));
      user.ws.send(JSON.stringify({ type: 'room', room: null }));
    });
  }

  broadcastRooms(wss, rooms, users);
}

export function handleMessage(
  ws: WebSocket,
  wss: WebSocketServer,
  parsedMessage: any
) {
  const chatMessage = parsedMessage.message;
  const roomCurrentId = parsedMessage.roomId;
  const emitterId = parsedMessage.user;
  const emitter = users.get(emitterId);
  const roomCurrent = rooms.get(roomCurrentId);

  if (roomCurrent && emitter?.name) {
    roomCurrent.messages.push({
      id: uuidv4(),
      text: chatMessage,
      name: emitter.name,
      createdAt: new Date(),
    });

    roomCurrent.users.forEach((client) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(JSON.stringify({ type: 'room', room: roomCurrent }));
      }
    });

    broadcastRooms(wss, rooms, users);
  }
}
