import { Room } from "../types";
import { rooms } from "../data";

export class RoomService {
  static get(roomId: string): Room | undefined {
    return rooms.get(roomId);
  }

  static has(roomId: string): boolean {
    return rooms.has(roomId);
  }

  static getAll(): Room[] {
    return Array.from(rooms.values());
  }

  static set(roomId: string, room: Room): void {
    rooms.set(roomId, room);
  }

  static delete(roomId: string): boolean {
    return rooms.delete(roomId);
  }

  static forEach(callback: (room: Room, roomId: string) => void): void {
    rooms.forEach(callback);
  }

  static values(): IterableIterator<Room> {
    return rooms.values();
  }

  static entries(): IterableIterator<[string, Room]> {
    return rooms.entries();
  }
}

export const roomService = RoomService;
