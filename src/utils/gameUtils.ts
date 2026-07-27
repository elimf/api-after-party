import { supabase } from "../../server";
import { Question } from "../types";
import axios from "axios";


export const getRandomQuestions = async (numberOfQuestions: number, type: string): Promise<Question[]> => {
  try {
    let query = supabase
      .from('questions')
      .select('text, choices, correct_answer, type');

    // 1. Appliquer le filtre de type si nécessaire
    if (type !== 'Aléatoire') {
      query = query.eq('type', type);
    }
    const { data: questions, error } = await query;

    if (error) throw error;
    if (!questions) return [];

    const shuffled = questions
      .sort(() => 0.5 - Math.random())
      .slice(0, numberOfQuestions);

    return shuffled.map((q: any) => ({
      text: q.text,
      choices: q.choices,
      correctAnswer: q.correct_answer,
      type: q.type,
    }));
  } catch (error) {
    console.error('Error retrieving random questions from Supabase:', error);
    throw error;
  }
};


export async function getFormattedQuestions(artists: string[], numQuestions: number): Promise<Question[]> {
  const questions: Question[] = [];

  // Shuffle the artists array to ensure randomness
  const shuffledArtists = artists.sort(() => 0.5 - Math.random());

  while (questions.length < numQuestions) {
    for (const artist of shuffledArtists) {
      if (questions.length >= numQuestions) break;

      const { track, falseChoices } = await getTrackAndFalseChoices(artist);
      if (track && falseChoices.length === 3) {
        const allChoices = shuffleChoices([track.title, ...falseChoices]);

        questions.push({
          text: `Quel est le titre de cette chanson de ${artist} ?`,
          choices: allChoices,
          correctAnswer: allChoices.indexOf(track.title),
          type: "Musique",
          mediaUrl: track.preview, // URL for the audio preview
        });
      }
    }
  }

  return questions;
}

// Function to get a random track and false choices from Deezer based on the artist's name
async function getTrackAndFalseChoices(artist: string) {
  try {
    const response = await axios.get(
      `https://deezerdevs-deezer.p.rapidapi.com/search`,
      {
        params: { q: encodeURIComponent(artist) },
        headers: {
          'x-rapidapi-ua': process.env.RAPIDAPI_UA,
          'x-rapidapi-key': process.env.RAPIDAPI_KEY,
          'x-rapidapi-host': process.env.RAPIDAPI_HOST,
        },
      }
    );

    if (response.data && response.data.data.length > 0) {
      const tracks = response.data.data;

      // S'assurer que nous avons au moins 4 morceaux avec une preview
      const tracksWithPreview = tracks.filter(
        (track: { preview: string | null }) => track.preview !== null
      );

      if (tracksWithPreview.length < 4) return { track: null, falseChoices: [] };

      const randomIndex = Math.floor(Math.random() * tracksWithPreview.length);
      const correctTrack = tracksWithPreview[randomIndex];

      // Filtrer les morceaux qui ont un titre unique et un ID différent du morceau correct
      const falseTracks = tracksWithPreview.filter(
        (track: { id: any, title: string }) =>
          track.id !== correctTrack.id &&
          track.title !== correctTrack.title
      );

      // S'assurer que les titres des choix incorrects sont uniques
      const uniqueFalseChoices = new Set<string>();
      const falseChoices = [];

      for (const track of falseTracks) {
        if (!uniqueFalseChoices.has(track.title)) {
          uniqueFalseChoices.add(track.title);
          falseChoices.push(track.title);
        }
        if (falseChoices.length === 3) break; // On a assez de faux choix
      }

      // Si on n'a pas assez de faux choix uniques, retourner une erreur ou ajuster la logique
      if (falseChoices.length < 3) return { track: null, falseChoices: [] };

      return {
        track: {
          title: correctTrack.title,
          artist: artist,
          preview: correctTrack.preview,
        },
        falseChoices: falseChoices,
      };
    }
  } catch (error) {
    console.error(`Failed to fetch tracks for artist ${artist}:`, error);
  }
  return { track: null, falseChoices: [] };
}

// Function to shuffle the choices array
function shuffleChoices(choices: string[]) {
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }
  return choices;
}

export function getRandomLetter(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters.charAt(Math.floor(Math.random() * letters.length));
}
