import WebSocket, { Server as WebSocketServer } from "ws";
import { broadcastUsers, broadcastRooms } from "../utils/websocketUtils";
import { handleAnswer, handleQuiz } from "./quizHandler";
import { rooms, users } from "../data";
import {
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleMessage,
} from "./roomHandler";
import { handleBacResponse, startBacGame } from "./bacGameHandler";
import { ClientToServerMessage } from "../types/ws";
import { bacTimerManager, quizTimerManager } from "../utils/timerManager";
import { clientMessageSchema } from "../validation/wsSchemas";
import { handleLogin } from "./authHandler";
import { userService } from "../services/userService";
import { roomService } from "../services/roomService";

const SECRET_KEY = process.env.SECRET_KEY;

if (!SECRET_KEY) {
  console.error("SECRET_KEY n'est pas défini dans les variables d'environnement");
  process.exit(1);
}

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

      switch (parsedMessage.type) {
        case "start":
          await handleLogin(ws, wss, parsedMessage.token);
          break;

        case "createRoom":
          handleCreateRoom(ws, wss, parsedMessage);
          break;

        case "joinRoom":
          handleJoinRoom(ws, wss, parsedMessage);
          break;

        case "leaveRoom":
          handleLeaveRoom(ws, wss, parsedMessage);
          break;

        case "message":
          handleMessage(ws, wss, parsedMessage);
          break;

        case "startQuiz":
          handleQuiz(ws, wss, parsedMessage);
          break;

        case "submitAnswer":
          handleAnswer(
            parsedMessage,
            rooms.get(parsedMessage.roomId)!,
            users,
            () => broadcastUsers(wss, users)
          );
          break;

        case "startBacGame": // Ajouter un cas pour démarrer le jeu du Petit Bac
          startBacGame(ws, wss, parsedMessage);
          break;

        case "submitBacResponse": // Ajouter un cas pour soumettre les réponses du Petit Bac
          handleBacResponse(ws, wss, parsedMessage);
          break;

        case "getRooms":
          handleGetRooms(ws);
          break;

        case "getUsers":
          handleGetUsers(ws);
          break;

        default:
          break;
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
