import WebSocket, { Server as WebSocketServer } from "ws";
import { ClientToServerMessage } from "../types/ws";
import { handleLogin } from "./authHandler";
import { handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleMessage } from "./roomHandler";
import { handleAnswer, handleQuiz } from "./quizHandler";
import { handleBacResponse, startBacGame } from "./bacGameHandler";
import { rooms, users } from "../data";
import { broadcastUsers } from "../utils/websocketUtils";

export async function routeMessage(
  ws: WebSocket,
  wss: WebSocketServer,
  msg: ClientToServerMessage
) {
  switch (msg.type) {
    case "start":
      await handleLogin(ws, wss, msg.token);
      break;
    case "createRoom":
      handleCreateRoom(ws, wss, msg as any);
      break;
    case "joinRoom":
      handleJoinRoom(ws, wss, msg as any);
      break;
    case "leaveRoom":
      handleLeaveRoom(ws, wss, msg as any);
      break;
    case "message":
      handleMessage(ws, wss, msg as any);
      break;
    case "startQuiz":
      handleQuiz(ws, wss, msg as any);
      break;
    case "submitAnswer":
      handleAnswer(
        msg as any,
        rooms.get((msg as any).roomId)!,
        users,
        () => broadcastUsers(wss, users)
      );
      break;
    case "startBacGame":
      startBacGame(ws, wss, msg as any);
      break;
    case "submitBacResponse":
      handleBacResponse(ws, wss, msg as any);
      break;
    case "getRooms":
      // handled via utils? keep simple
      break;
    case "getUsers":
      break;
    default:
      break;
  }
}
