import { query } from "../db/pool";

export class UserRepository {
  static async findById(id: string) {
    const result = await query("SELECT id, username FROM users WHERE id = $1", [id]);
    return result.rows?.[0] || null;
  }

  static async findByUsername(username: string) {
    const result = await query("SELECT id, username FROM users WHERE username = $1", [username]);
    return result.rows?.[0] || null;
  }

  static async create(user: { username: string; passwordHash: string }) {
    const result = await query(
      "INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username",
      [user.username, user.passwordHash]
    );
    return result.rows?.[0] || null;
  }
}

export const userRepository = UserRepository;
