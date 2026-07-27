import WebSocket, { Server as WebSocketServer } from "ws";
import { v4 as uuidv4 } from "uuid";
import { broadcastUsers, broadcastRooms } from "../utils/websocketUtils";
import { UserConncted, Room } from "../types";
import { handleAnswer, handleQuiz } from "./quizHandler";
import { rooms, users } from "../data";
import {
  handleCreateRoom,
  handleJoinRoom,
  handleLeaveRoom,
  handleMessage,
} from "./roomHandler";
import { handleBacResponse, startBacGame } from "./bacGameHandler";
import jwt from "jsonwebtoken";
import { supabase } from "../../server";
const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

// Fonction pour configurer les gestionnaires WebSocket
export function setupWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket) => {
    let userId: string | null = null;
    let currentRoomId: string | null = null;

    ws.on("message", async (message: string) => {
      const parsedMessage = JSON.parse(message);
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
      // On cherche l'utilisateur par son instance WebSocket
      for (const [id, user] of users.entries()) {
        if (user.ws === ws) {
          userId = id;
          // On cherche si cet utilisateur était dans une room spécifique
          for (const room of rooms.values()) {
            if (room.users.find(u => u.id === id)) {
              currentRoomId = room.id;
              break;
            }
          }
          break;
        }
      }

      if (userId) {
        handleDisconnect(userId, currentRoomId, wss);
      }
    });
  });
}

// Handlers pour chaque type de message
async function handleLogin(ws: WebSocket, wss: WebSocketServer, token: string) {
  try {
    // Décoder le token JWT pour obtenir l'identifiant de l'utilisateur
    const decoded = jwt.verify(token, SECRET_KEY) as { userUuid?: string, userId?: string };
    const userUuid = decoded.userUuid || decoded.userId;

    if (!userUuid) throw new Error("UUID manquant dans le token");

    const { data: user, error } = await supabase
      .from('users')
      .select('uuid, username')
      .eq('uuid', userUuid)
      .single();

    if (error || !user) {
      ws.send(JSON.stringify({
        type: "system",
        message: "Utilisateur introuvable dans la base de données",
        disconnect: true,
      }));
      ws.close();
      return;
    }
    const userId = user.uuid;
    const userName = user.username;

    let existingUser = users.get(userId);

    if (existingUser) {
      existingUser.ws.close();
      existingUser.ws = ws;

      let roomId = "";
      rooms.forEach((room) => {
        const userInRoom = room.users.find((u) => u.id === userId);
        if (userInRoom) {
          roomId = room.id;
          userInRoom.ws = ws;
        }
      });

      ws.send(JSON.stringify({
        type: "reconnect",
        info: existingUser,
        room: rooms.get(roomId),
      }));
    } else {
      const currentUser: UserConncted = {
        id: userId, // Utilisation de l'UUID
        ws,
        name: userName,
        score: 0,
        responseTimes: [],
        answers: new Map(),
        bacResponses: {},
        hasSubmitted: false,
      };
      users.set(userId, currentUser);

      // Vérifier si déjà présent dans une room (cas de crash serveur par ex)
      let foundRoom = Array.from(rooms.values()).find(r => r.users.some(u => u.id === userId));

      ws.send(JSON.stringify({
        type: foundRoom ? "reconnect" : "system",
        message: foundRoom ? undefined : `Bienvenue, ${userName}.`,
        info: currentUser,
        room: foundRoom || undefined
      }));
    }

    broadcastUsers(wss, users);

  } catch (error) {
    console.error("Erreur handleLogin:", error);
    ws.send(JSON.stringify({
      type: "error",
      message: "Session expirée ou invalide",
    }));
    ws.close();
  }
}


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
