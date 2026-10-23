import { z } from "zod";

export const startSchema = z.object({
  type: z.literal("start"),
  token: z.string().min(1),
});

export const createRoomSchema = z.object({
  type: z.literal("createRoom"),
  room: z.string().min(1),
  owner: z.string().min(1),
});

export const joinRoomSchema = z.object({
  type: z.literal("joinRoom"),
  roomId: z.string().min(1),
  user: z.string().min(1),
});

export const leaveRoomSchema = z.object({
  type: z.literal("leaveRoom"),
  roomId: z.string().min(1),
  user: z.string().min(1),
});

export const messageSchema = z.object({
  type: z.literal("message"),
  message: z.string().min(1),
  user: z.string().min(1),
  roomId: z.string().min(1),
});

export const startQuizSchema = z.object({
  type: z.literal("startQuiz"),
  roomId: z.string().min(1),
  user: z.string().min(1),
  typeQuestion: z.string().min(1),
  numberQuestion: z.union([z.string(), z.number()]),
  difficulty: z.string().min(1),
  musicSource: z.string().optional(),
  sourceId: z.string().optional(),
  includeFeatures: z.boolean().optional(),
});

export const submitAnswerSchema = z.object({
  type: z.literal("submitAnswer"),
  roomId: z.string().min(1),
  user: z.string().min(1),
  answer: z.number(),
  responseTime: z.number(),
});

export const startBacGameSchema = z.object({
  type: z.literal("startBacGame"),
  roomId: z.string().min(1),
  user: z.string().optional(),
  timeLimit: z.number().optional(),
  categories: z.array(z.string()).optional(),
});

export const submitBacResponseSchema = z.object({
  type: z.literal("submitBacResponse"),
  roomId: z.string().min(1),
  user: z.string().min(1),
  responses: z.record(z.string(), z.string()),
  autoSubmit: z.boolean().optional(),
});

export const getRoomsSchema = z.object({
  type: z.literal("getRooms"),
});

export const getUsersSchema = z.object({
  type: z.literal("getUsers"),
});

export const clientMessageSchema = z.discriminatedUnion("type", [
  startSchema,
  createRoomSchema,
  joinRoomSchema,
  leaveRoomSchema,
  messageSchema,
  startQuizSchema,
  submitAnswerSchema,
  startBacGameSchema,
  submitBacResponseSchema,
  getRoomsSchema,
  getUsersSchema,
]);

export type ValidatedClientMessage = z.infer<typeof clientMessageSchema>;
