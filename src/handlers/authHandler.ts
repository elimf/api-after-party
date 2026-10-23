import WebSocket, { Server as WebSocketServer } from "ws";
import jwt from "jsonwebtoken";
import { UserConncted } from "../types";
import { userService } from "../services/userService";
import { roomService } from "../services/roomService";
import { broadcastUsers } from "../utils/websocketUtils";
import { userRepository } from "../repositories/userRepository";
import { env } from "../config/env";

const SECRET_KEY = env.JWT_SECRET as jwt.Secret;

export async function handleLogin(ws: WebSocket, wss: WebSocketServer, token: string) {
  try {
    const decoded = jwt.verify(token, SECRET_KEY) as { id?: string; userId?: string };
    const userId = decoded.id || decoded.userId;

    if (!userId) throw new Error("ID manquant dans le token");

    const userRow = await userRepository.findById(userId);

    if (!userRow) {
      ws.send(
        JSON.stringify({
          type: "system",
          message: "Utilisateur introuvable dans la base de données",
          disconnect: true,
        })
      );
      ws.close();
      return;
    }

    const userName = userRow.username;

    let existingUser = userService.get(userId);

    if (existingUser) {
      existingUser.ws.close();
      existingUser.ws = ws;

      let roomId = "";
      roomService.forEach((room) => {
        const userInRoom = room.users.find((u) => u.id === userId);
        if (userInRoom) {
          roomId = room.id;
          userInRoom.ws = ws;
        }
      });

      ws.send(
        JSON.stringify({
          type: "reconnect",
          info: existingUser,
          room: roomService.get(roomId),
        })
      );
    } else {
      const currentUser: UserConncted = {
        id: userId,
        ws,
        name: userName,
        score: 0,
        responseTimes: [],
        answers: new Map(),
        bacResponses: {},
        hasSubmitted: false,
      };
      userService.set(userId, currentUser);

      let foundRoom = Array.from(roomService.values()).find((r) => r.users.some((u) => u.id === userId));

      ws.send(
        JSON.stringify({
          type: foundRoom ? "reconnect" : "system",
          message: foundRoom ? undefined : `Bienvenue, ${userName}.`,
          info: currentUser,
          room: foundRoom || undefined,
        })
      );
    }

    broadcastUsers(wss, userService.getAll() as any);
  } catch (error) {
    console.error("Erreur handleLogin:", error);
    ws.send(
      JSON.stringify({
        type: "error",
        message: "Session expirée ou invalide",
      })
    );
    ws.close();
  }
}
