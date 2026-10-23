import { ITunesConnector } from "./itunesConnector";
import { getFormattedQuestions } from "../../utils/gameUtils";
import { artists } from "../../data";

const itunesConnector = new ITunesConnector();

const GENRE_MAP: Record<string, string> = {
  rap: "Hip-Hop",
  rnb: "R&B",
  pop: "Pop",
  rock: "Rock",
  electronic: "Electronic",
  indie: "Indie",
  reggae: "Reggae",
  gospel: "Gospel",
  jazz: "Jazz",
  classical: "Classical",
  country: "Country",
  disco: "Funk",
  kpop: "K-pop",
  latino: "Latin",
  metal: "Metal",
  blues: "Blues",
  reggaeton: "Reggaeton",
  afrobeats: "Afrobeats",
};

const THEME_MAP: Record<string, string> = {
  top100: "Top 100",
  party: "Party hits",
  summer: "Summer hits",
  workout: "Workout",
  chill: "Chill",
  love: "Love songs",
  indie: "Indie",
  classics: "All-time classics",
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function mapTracksToQuestions(tracks: any[], count: number) {
  const result = [];
  for (let i = 0; i < count && i < tracks.length; i++) {
    const track = tracks[i];
    const choices = shuffle([
      track.title,
      tracks[(i + 1) % tracks.length].title,
      tracks[(i + 2) % tracks.length].title,
    ]);
    // find index
    const correctIndex = choices.findIndex((c) => c === track.title);
    result.push({
      text: "What song is this?",
      choices,
      correctAnswer: correctIndex >= 0 ? correctIndex : 0,
      type: "Blindtest",
      mediaUrl: track.previewUrl || track.trackUri,
    });
  }
  return result;
}

export async function buildBlindtestQuestions(
  musicSource: string,
  sourceId: string | undefined,
  numQuestions: number
) {
  try {
    if (musicSource === "artists" && sourceId === "random") {
      return getFormattedQuestions(artists, numQuestions);
    }

    if (musicSource === "genre" && sourceId) {
      const genreName = GENRE_MAP[sourceId] || sourceId;
      const tracks = await itunesConnector.searchArtistTracks(genreName, numQuestions * 3);
      if (tracks.length >= numQuestions) {
        return mapTracksToQuestions(tracks, numQuestions);
      }
      return getFormattedQuestions(artists, numQuestions);
    }

    if (musicSource === "country" && sourceId) {
      const countrySearch = sourceId === "FR" ? "top France" : `top ${sourceId}`;
      const tracks = await itunesConnector.searchArtistTracks(countrySearch, numQuestions * 3);
      if (tracks.length >= numQuestions) {
        return mapTracksToQuestions(tracks, numQuestions);
      }
      return getFormattedQuestions(artists, numQuestions);
    }

    if (musicSource === "theme" && sourceId) {
      const themeName = THEME_MAP[sourceId] || sourceId;
      const tracks = await itunesConnector.searchArtistTracks(themeName, numQuestions * 3);
      if (tracks.length >= numQuestions) {
        return mapTracksToQuestions(tracks, numQuestions);
      }
      return getFormattedQuestions(artists, numQuestions);
    }

    return getFormattedQuestions(artists, numQuestions);
  } catch (error) {
    console.error("Error loading blindtest questions:", error);
    return getFormattedQuestions(artists, numQuestions);
  }
}
