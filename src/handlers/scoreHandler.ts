import { query } from '../db/pool';

/**
 * Save a quiz result to the database
 */
export async function saveQuizResult(
  roomId: string,
  userId: string,
  score: number,
  correctAnswers: number,
  totalQuestions: number,
  avgResponseTime: number
) {
  try {
    // Insert into game_results
    await query(
      `INSERT INTO game_results (room_id, user_id, score, game_type, game_duration)
       VALUES ($1, $2, $3, $4, $5)`,
      [roomId, userId, score, 'quiz', null]
    );

    // Insert into quiz_scores (detailed)
    await query(
      `INSERT INTO quiz_scores (room_id, user_id, correct_answers, total_questions, avg_response_time)
       VALUES ($1, $2, $3, $4, $5)`,
      [roomId, userId, correctAnswers, totalQuestions, avgResponseTime]
    );

    // Update user total score
    await query(
      `UPDATE users
       SET score_total = score_total + $1, games_played = games_played + 1
       WHERE id = $2`,
      [score, userId]
    );

    console.log(`✅ Quiz result saved for user ${userId}`);
  } catch (error) {
    console.error('Failed to save quiz result:', error);
    throw error;
  }
}

/**
 * Save a Petit Bac result to the database
 */
export async function saveBacResult(
  roomId: string,
  userId: string,
  totalPoints: number,
  uniqueResponses: number,
  duplicateResponses: number,
  invalidResponses: number
) {
  try {
    // Insert into game_results
    await query(
      `INSERT INTO game_results (room_id, user_id, score, game_type)
       VALUES ($1, $2, $3, $4)`,
      [roomId, userId, totalPoints, 'bac']
    );

    // Insert into bac_scores (detailed)
    await query(
      `INSERT INTO bac_scores (room_id, user_id, total_points, unique_responses, duplicate_responses, invalid_responses)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [roomId, userId, totalPoints, uniqueResponses, duplicateResponses, invalidResponses]
    );

    // Update user total score
    await query(
      `UPDATE users
       SET score_total = score_total + $1, games_played = games_played + 1
       WHERE id = $2`,
      [totalPoints, userId]
    );

    console.log(`✅ Petit Bac result saved for user ${userId}`);
  } catch (error) {
    console.error('Failed to save bac result:', error);
    throw error;
  }
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string) {
  try {
    const result = await query(
      `SELECT
        id, email, username, score_total, games_played, created_at
       FROM users
       WHERE id = $1`,
      [userId]
    );

    return result.rows[0] || null;
  } catch (error) {
    console.error('Failed to get user stats:', error);
    throw error;
  }
}

/**
 * Get leaderboard for a room
 */
export async function getRoomLeaderboard(roomId: string) {
  try {
    const result = await query(
      `SELECT
        u.id, u.username,
        SUM(gr.score) as total_score,
        COUNT(*) as games_played,
        AVG(qs.avg_response_time) as avg_response_time
       FROM game_results gr
       JOIN users u ON gr.user_id = u.id
       LEFT JOIN quiz_scores qs ON gr.id = qs.id
       WHERE gr.room_id = $1
       GROUP BY u.id, u.username
       ORDER BY total_score DESC`,
      [roomId]
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    throw error;
  }
}

/**
 * Get global leaderboard
 */
export async function getGlobalLeaderboard(limit: number = 100) {
  try {
    const result = await query(
      `SELECT
        id, username, score_total, games_played, created_at
       FROM users
       ORDER BY score_total DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  } catch (error) {
    console.error('Failed to get global leaderboard:', error);
    throw error;
  }
}
