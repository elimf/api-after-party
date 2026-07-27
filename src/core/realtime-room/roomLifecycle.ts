import { Room, UserConncted } from '../../types';

export function addUserToRoom(room: Room, user: UserConncted): Room {
  const alreadyInRoom = room.users.some((roomUser) => roomUser.id === user.id);
  if (!alreadyInRoom) {
    room.users.push(user);
  }
  return room;
}

export function removeUserFromRoom(room: Room, userId: string): Room {
  room.users = room.users.filter((roomUser) => roomUser.id !== userId);
  return room;
}

export function shouldDeleteRoom(room: Room, leavingUserId: string): boolean {
  return room.users.length === 0 || room.ownerId === leavingUserId;
}

export function resetUsersForQuiz(usersMap: Map<string, UserConncted>, room: Room): void {
  room.users.forEach((roomUser) => {
    const user = usersMap.get(roomUser.id);
    if (!user) return;

    user.score = 0;
    user.responseTimes = [];
    user.answers = new Map();
  });
}
