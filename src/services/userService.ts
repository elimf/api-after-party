import { UserConncted } from "../types";
import { users } from "../data";
import WebSocket from "ws";

export class UserService {
  static get(userId: string): UserConncted | undefined {
    return users.get(userId);
  }

  static has(userId: string): boolean {
    return users.has(userId);
  }

  static getAll(): UserConncted[] {
    return Array.from(users.values());
  }

  static set(userId: string, user: UserConncted): void {
    users.set(userId, user);
  }

  static delete(userId: string): boolean {
    return users.delete(userId);
  }

  static findBySocket(ws: WebSocket): UserConncted | undefined {
    for (const user of users.values()) {
      if (user.ws === ws) return user;
    }
    return undefined;
  }

  static forEach(callback: (user: UserConncted, userId: string) => void): void {
    users.forEach(callback);
  }
}

export const userService = UserService;
