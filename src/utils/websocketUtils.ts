import { WebSocketServer, WebSocket } from 'ws';
import { UserConncted, Room } from '../types';

export function broadcastUsers(wss: WebSocketServer, users: Map<string, UserConncted>) {
  const userList = Array.from(users.values()).map(({ id, name, score }) => ({
    id,
    name,
    score,
  }));  
  try {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'users', users: userList }));
      }
    });
  } catch (error) {
    console.error('Error broadcasting users:', error);
  }
}

export function broadcastRooms(wss: WebSocketServer, rooms: Map<string, Room>, users: Map<string, UserConncted>) {
  const roomList = Array.from(rooms.values())
    .filter((room) => users.has(room.ownerId));

  try {
    wss.clients.forEach((client: WebSocket) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'rooms', rooms: roomList }));
      }
    });
  } catch (error) {
    console.error('Error broadcasting rooms:', error);
  }
}
