import { Room, UserConncted } from "../types";
import artistsList from "./artists.json";
export const users = new Map<string, UserConncted>();
export const rooms = new Map<string, Room>();
export const artists = artistsList as string[];
