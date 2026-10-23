import WebSocket, { Server as WebSocketServer } from "ws";
import { broadcastUsers, broadcastRooms } from "../utils/websocketUtils";
import { rooms, users } from "../data";
import { ClientToServerMessage } from "../types/ws";
import { bacTimerManager, quizTimerManager } from "../utils/timerManager";
import { clientMessageSchema } from "../validation/wsSchemas";
import { userService } from "../services/userService";
import { roomService } from "../services/roomService";
import { routeMessage } from "./messageRouter";

// Fonction pour configurer les gestionnaires WebSocket
export function setupWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    let userId: string | null = null;
    let currentRoomId: string | null = null;

    ws.on("message", async (rawMessage: string) => {
      let raw: unknown;
      try {
        raw = JSON.parse(rawMessage);
      } catch (e) {
        ws.send(JSON.stringify({ type: "error", message: "Message invalide" }));
        return;
      }

      const validation = clientMessageSchema.safeParse(raw);
      if (!validation.success) {
        ws.send(JSON.stringify({ type: "error", message: "Message invalide" }));
        return;
      }

      const parsedMessage = validation.data as ClientToServerMessage;
      await routeMessage(ws, wss, parsedMessage);

      if (parsedMessage.type === "getRooms") {
        handleGetRooms(ws);
        return;
      }
      if (parsedMessage.type === "getUsers") {
        handleGetUsers(ws);
        return;
      }
    });

    ws.on("close", () => {
      const foundUser = userService.findBySocket(ws);
      if (foundUser) {
        userId = foundUser.id;
        roomService.forEach((room) => {
          if (room.users.find((u) => u.id === userId)) {
            currentRoomId = room.id;
          }
        });
      }

      if (userId) {
        if (currentRoomId) {
          quizTimerManager.clear(currentRoomId);
          bacTimerManager.clear(currentRoomId);
        }
        handleDisconnect(userId, currentRoomId, wss);
      }
    });
  });
}

// Handlers pour chaque type de message
// handleLogin moved to authHandler.ts


function handleGetRooms(ws: WebSocket) {
  const roomList = Array.from(rooms.values())
    .filter((room) => users.has(room.ownerId))
    .map((room) => ({
      id: room.id,
      name: room.name,
      ownerId: room.ownerId,
    }));

  ws.send(JSON.stringify({ type: "rooms", rooms: roomList }));
}

function handleGetUsers(ws: WebSocket) {
  const userList = Array.from(users.values())
    .filter(({ ws }) => ws.readyState === WebSocket.OPEN);
  ws.send(JSON.stringify({ type: "users", users: userList }));
}

function handleDisconnect(
  userId: string,
  currentRoomId: string | null,
  wss: WebSocketServer
) {
  users.delete(userId);
  if (currentRoomId && rooms.has(currentRoomId)) {
    const room = rooms.get(currentRoomId);
    if (room) {
      room.users = room.users.filter((user) => user.id !== userId);
      broadcastRooms(wss, rooms, users);
    }
  }
  broadcastUsers(wss, users);
}
