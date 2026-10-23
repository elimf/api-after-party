import WebSocket, { Server as WebSocketServer } from "ws";
import { getFormattedQuestions, getRandomQuestions } from "../utils/gameUtils";
import { rooms, users, artists } from "../data";
import { Room, UserConncted } from "../types";
import { broadcastRooms } from "../utils/websocketUtils";
import { ITunesConnector } from "../core/music-connectors/itunesConnector";

const itunesConnector = new ITunesConnector();

export async function handleQuiz(
  ws: WebSocket,
  wss: WebSocketServer,
  parsedMessage: any
) {
  const triviaRoomId = parsedMessage.roomId;
  const numQuestions = parseInt(parsedMessage.numberQuestion);
  const type = parsedMessage.typeQuestion;
  const difficulty = parsedMessage.difficulty;
  const musicSource = parsedMessage.musicSource || 'artists'; // Default to artists
  const sourceId = parsedMessage.sourceId;
  const userId = parsedMessage.user;
  const triviaRoom = rooms.get(triviaRoomId);

  if (triviaRoom) {
    // Set quiz parameters based on difficulty
    switch (difficulty) {
      case "easy":
        triviaRoom.quiz.timeLimit = 15000;
        break;
      case "medium":
        triviaRoom.quiz.timeLimit = 10000;
        break;
      case "hard":
        triviaRoom.quiz.timeLimit = 5000;
        break;
      default:
        triviaRoom.quiz.timeLimit = 10000;
        break;
    }
    triviaRoom.quiz.type = type;
    triviaRoom.quiz.difficulty = difficulty;

    // Load questions based on source
    if (type !== "Blindtest") {
      triviaRoom.quiz.questions = await getRandomQuestions(numQuestions, type);
    } else {
      // Handle Blindtest - use iTunes API for music preview
      try {
        let questions = [];

        if (musicSource === 'artists' && sourceId === 'random') {
          // Mode: Artistes prédéfinis - pioche aléatoire dans la liste
          questions = await getFormattedQuestions(artists, numQuestions);
        } else if (musicSource === 'genre') {
          // Mode: Par genre - cherche sur iTunes selon le genre
          const genreMap: { [key: string]: string } = {
            'rap': 'Hip-Hop',
            'rnb': 'R&B',
            'pop': 'Pop',
            'rock': 'Rock',
            'electronic': 'Electronic',
            'indie': 'Indie',
            'reggae': 'Reggae',
            'gospel': 'Gospel',
            'jazz': 'Jazz',
            'classical': 'Classical',
            'country': 'Country',
            'disco': 'Funk',
            'kpop': 'K-pop',
            'latino': 'Latin',
            'metal': 'Metal',
            'blues': 'Blues',
            'reggaeton': 'Reggaeton',
            'afrobeats': 'Afrobeats',
          };

          const genreName = genreMap[sourceId] || sourceId;
          const tracks = await itunesConnector.searchArtistTracks(genreName, numQuestions * 3);

          if (tracks.length >= numQuestions) {
            questions = tracks.slice(0, numQuestions).map((track, index) => ({
              text: `What song is this?`,
              choices: [
                track.title,
                tracks[(index + 1) % tracks.length].title,
                tracks[(index + 2) % tracks.length].title,
              ].sort(() => Math.random() - 0.5),
              correctAnswer: 0,
              type: 'Blindtest',
              mediaUrl: track.previewUrl || track.trackUri,
            }));
          } else {
            console.warn(`Not enough iTunes tracks for genre ${genreName}, falling back to artists`);
            questions = await getFormattedQuestions(artists, numQuestions);
          }
        } else if (musicSource === 'country') {
          // Mode: Par pays - cherche les top du pays
          const countrySearch = sourceId === 'FR' ? 'top France' : `top ${sourceId}`;
          const tracks = await itunesConnector.searchArtistTracks(countrySearch, numQuestions * 3);

          if (tracks.length >= numQuestions) {
            questions = tracks.slice(0, numQuestions).map((track, index) => ({
              text: `What song is this?`,
              choices: [
                track.title,
                tracks[(index + 1) % tracks.length].title,
                tracks[(index + 2) % tracks.length].title,
              ].sort(() => Math.random() - 0.5),
              correctAnswer: 0,
              type: 'Blindtest',
              mediaUrl: track.previewUrl || track.trackUri,
            }));
          } else {
            questions = await getFormattedQuestions(artists, numQuestions);
          }
        } else if (musicSource === 'theme') {
          // Mode: Par thème/Playlist - cherche les thèmes spéciaux
          const themeMap: { [key: string]: string } = {
            'top100': 'Top 100',
            'party': 'Party hits',
            'summer': 'Summer hits',
            'workout': 'Workout',
            'chill': 'Chill',
            'love': 'Love songs',
            'indie': 'Indie',
            'classics': 'All-time classics',
          };

          const themeName = themeMap[sourceId] || sourceId;
          const tracks = await itunesConnector.searchArtistTracks(themeName, numQuestions * 3);

          if (tracks.length >= numQuestions) {
            questions = tracks.slice(0, numQuestions).map((track, index) => ({
              text: `What song is this?`,
              choices: [
                track.title,
                tracks[(index + 1) % tracks.length].title,
                tracks[(index + 2) % tracks.length].title,
              ].sort(() => Math.random() - 0.5),
              correctAnswer: 0,
              type: 'Blindtest',
              mediaUrl: track.previewUrl || track.trackUri,
            }));
          } else {
            questions = await getFormattedQuestions(artists, numQuestions);
          }
        } else {
          // Fallback
          questions = await getFormattedQuestions(artists, numQuestions);
        }

        triviaRoom.quiz.questions = questions;
      } catch (error) {
        console.error('Error loading blindtest questions:', error);
        triviaRoom.quiz.questions = await getFormattedQuestions(artists, numQuestions);
      }
    }

    triviaRoom.quiz.totalQuestions = numQuestions;

    // Start the trivia game
    triviaRoom.currentQuestionIndex = 0;
    triviaRoom.quiz.isRunning = true;
    triviaRoom.quiz.results = undefined;

    triviaRoom.users = triviaRoom.users.map((user) => {
      const updatedUser = users.get(user.id);

      if (updatedUser) {
        // Reset user details for the trivia
        updatedUser.score = 0;
        updatedUser.responseTimes = [];
        updatedUser.answers = new Map();

        // Send updated user info and room info
        updatedUser.ws.send(
          JSON.stringify({
            type: "currentUser",
            info: updatedUser,
          })
        );
      }

      // Always send the room info
      user.ws.send(
        JSON.stringify({
          type: "room",
          room: triviaRoom,
        })
      );

      return updatedUser || user;
    });
    broadcastRooms(wss, rooms, users);
    // Proceed to ask the first question
    askQuestion(triviaRoom, wss, rooms, users);
  }
}
export function handleAnswer(
  parsedMessage: any,
  room: Room,
  users: Map<string, UserConncted>,
  broadcastUsers: () => void
) {
  const answerUserId = parsedMessage.user;
  const answerIndex = parsedMessage.answer;
  const responseTime = parsedMessage.responseTime; // Temps de réponse en millisecondes
  const answerRoom = room;

  if (answerRoom) {
    const question = answerRoom.quiz.questions[answerRoom.currentQuestionIndex];
    const user = users.get(answerUserId);

    if (user && question) {
      user.answers.set(answerRoom.currentQuestionIndex, {
        answerIndex,
        responseTime,
      });
      user.responseTimes.push(responseTime); // Ajouter le temps de réponse
      broadcastUsers();
    }
  }
}

function askQuestion(
  room: Room,
  wss: WebSocketServer,
  rooms: Map<string, Room>,
  users: Map<string, UserConncted>
) {
  if (!room.quiz.isRunning) return;

  const question = room.quiz.questions[room.currentQuestionIndex];

  // Envoyer la question à tous les utilisateurs
  room.users.forEach((user) => {
    user.ws.send(
      JSON.stringify({
        type: "room",
        room: room,
      })
    );
    user.ws.send(
      JSON.stringify({
        type: "question",
        question: question.text,
        choices: question.choices,
      })
    );
  });

  let hasRevealed = false;

  // Fonction pour révéler la réponse
  const reveal = () => {
    if (!hasRevealed) {
      hasRevealed = true;
      revealAnswer(room, wss, rooms, users);
    }
  };

  // Vérification si tous les utilisateurs ont répondu
  const allUsersResponded = () =>
    room.users.every(
      (user) => user.answers.get(room.currentQuestionIndex) !== undefined
    );

  // Planifier la révélation automatique après un certain temps
  const timeoutId = setTimeout(() => {
    reveal();
  }, room.quiz.timeLimit);

  // Fonction de vérification périodique
  const checkResponses = () => {
    if (allUsersResponded()) {
      clearTimeout(timeoutId);
      reveal();
    }
  };

  // Intervalle pour vérifier les réponses des utilisateurs
  const checkIntervalId = setInterval(() => {
    checkResponses();
    if (hasRevealed) {
      clearInterval(checkIntervalId); // Arrêter l'intervalle si déjà révélé
    }
  }, 500); // Vérifier deux fois par seconde pour réactivité améliorée
}

function revealAnswer(
  room: Room,
  wss: WebSocketServer,
  rooms: Map<string, Room>,
  users: Map<string, UserConncted>
) {
  if (!room.quiz.isRunning) return;

  const questionAnswer = room.quiz.questions[room.currentQuestionIndex];
  const correctAnswer = questionAnswer.choices[questionAnswer.correctAnswer];
  room.users.forEach((user) => {
    const userAnswer = user.answers.get(room.currentQuestionIndex);
    const isCorrect = userAnswer?.answerIndex === questionAnswer.correctAnswer;
    if (isCorrect) {
      user.score += 1; // Increment score for correct answer
    }
    user.ws.send(
      JSON.stringify({
        type: "answer",
        correctAnswer: correctAnswer,
      })
    );
    user.ws.send(
      JSON.stringify({
        type: "currentUser",
        info: user,
      })
    );
  });

  room.currentQuestionIndex++;
  if (room.currentQuestionIndex < room.quiz.questions.length) {
    setTimeout(() => {
      askQuestion(room, wss, rooms, users);
    }, 3000); // 3 secondes avant la prochaine question
  } else {
    endQuiz(room, wss, rooms, users);
  }
}

function endQuiz(
  room: Room,
  wss: WebSocketServer,
  rooms: Map<string, Room>,
  users: Map<string, UserConncted>
) {
  room.quiz.isRunning = false;

  // Calculate user statistics
  const userStats = room.users.map((user) => {
    const avgResponseTime =
      user.responseTimes.length > 0
        ? user.responseTimes.reduce((a, b) => a + b, 0) /
          user.responseTimes.length
        : Infinity;
    return {
      userId: user.id,
      name: user.name,
      score: user.score,
      avgResponseTime: avgResponseTime,
    };
  });

  // Sort users by score and then by average response time
  const sortedUsers = userStats.sort((a, b) => {
    if (b.score === a.score) {
      return a.avgResponseTime - b.avgResponseTime;
    }
    return b.score - a.score;
  });

  // Update quiz results
  room.quiz.results = {
    users: sortedUsers,
  };
  room.quiz.isRunning = false;

  // Notify users that the quiz is over
  room.users.forEach((user) => {
    user.ws.send(
      JSON.stringify({
        type: "room",
        room: room,
      })
    );
    user.ws.send(
      JSON.stringify({
        type: "endQuiz",
        message: "Le quiz est terminé!",
      })
    );
  });

  // Broadcast updated room information
  broadcastRooms(wss, rooms, users);
}
