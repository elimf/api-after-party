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

function normalize(s: string) {
  return (s || "").toLowerCase().trim();
}

function pickDistractors(tracks: any[], correctTrack: any, count: number, difficulty: string) {
  const used = new Set<string>();
  used.add(normalize(correctTrack.title));

  const sameArtist: any[] = [];
  const sameAlbum: any[] = [];
  const others: any[] = [];

  const correctArtist = normalize(correctTrack.artist);
  const correctAlbum = normalize(correctTrack.album);

  for (const t of tracks) {
    const title = normalize(t.title);
    if (used.has(title)) continue;
    const artist = normalize(t.artist);
    const album = normalize(t.album);

    if (artist === correctArtist && album === correctAlbum) {
      sameAlbum.push(t);
    } else if (artist === correctArtist) {
      sameArtist.push(t);
    } else {
      others.push(t);
    }
  }

  const pool: any[] = [];
  if (difficulty === "hard") {
    pool.push(...shuffle(sameAlbum), ...shuffle(sameArtist), ...shuffle(others));
  } else if (difficulty === "medium") {
    pool.push(...shuffle(sameArtist), ...shuffle(sameAlbum), ...shuffle(others));
  } else {
    pool.push(...shuffle(sameArtist), ...shuffle(others), ...shuffle(sameAlbum));
  }

  const distractors: string[] = [];
  for (const t of pool) {
    const title = t.title;
    if (!title || used.has(normalize(title))) continue;
    used.add(normalize(title));
    distractors.push(title);
    if (distractors.length >= count) break;
  }

  if (distractors.length < count) {
    for (const t of shuffle(tracks)) {
      const title = t.title;
      if (!title || used.has(normalize(title))) continue;
      used.add(normalize(title));
      distractors.push(title);
      if (distractors.length >= count) break;
    }
  }

  return distractors;
}

function mapTracksToQuestions(tracks: any[], count: number, difficulty: string = "medium") {
  const result: any[] = [];
  const usable = tracks.filter((t) => (t.previewUrl || t.trackUri) && t.title);
  if (usable.length === 0) return result;

  for (let i = 0; i < count && i < usable.length; i++) {
    const track = usable[i];
    const distractors = pickDistractors(usable, track, 3, difficulty);
    const choicesSet = new Set<string>();
    choicesSet.add(track.title);
    for (const d of distractors) {
      if (d) choicesSet.add(d);
      if (choicesSet.size >= 4) break;
    }
    if (choicesSet.size < 4) {
      const allTitles = usable.map((t) => t.title).filter(Boolean);
      for (const t of shuffle(allTitles)) {
        choicesSet.add(t);
        if (choicesSet.size >= 4) break;
      }
    }
    let choices = shuffle(Array.from(choicesSet));
    if (choices.length > 4) choices = choices.slice(0, 4);
    if (!choices.includes(track.title)) {
      choices[0] = track.title;
      choices = shuffle(choices);
    }
    const correctIndex = choices.indexOf(track.title);

    result.push({
      text: "Quel est ce titre ?",
      choices,
      correctAnswer: correctIndex >= 0 ? correctIndex : 0,
      type: "Blindtest",
      mediaUrl: track.previewUrl || track.trackUri,
    });
  }
  return result;
}

function filterByArtist(tracks: any[], artistName: string, includeFeatures: boolean) {
  const target = normalize(artistName);
  if (!target) return tracks;

  const exact: any[] = [];
  const partial: any[] = [];
  const strictPrimary: any[] = [];

  for (const t of tracks) {
    const artist = normalize(t.artist);
    const title = normalize(t.title);
    const primary = artist.split(/[,;&]/)[0].trim();

    if (artist === target || primary === target) {
      exact.push(t);
      strictPrimary.push(t);
      continue;
    }

    if (includeFeatures) {
      if (artist.includes(target) || title.includes(target) || artist.includes("feat") && artist.includes(target)) {
        partial.push(t);
        continue;
      }
    } else {
      if (primary === target) {
        strictPrimary.push(t);
        continue;
      }
    }
  }

  if (!includeFeatures) {
    if (strictPrimary.length >= 3) return strictPrimary;
    if (exact.length > 0) return exact;
    return [];
  }

  const combined = [...exact, ...strictPrimary, ...partial];
  const seen = new Set<string>();
  const unique: any[] = [];
  for (const t of combined) {
    const key = t.id || normalize(t.title) + "|" + normalize(t.artist);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(t);
  }
  return unique;
}

export async function buildBlindtestQuestions(
  musicSource: string,
  sourceId: string | undefined,
  numQuestions: number,
  difficulty: string = "medium",
  options: { includeFeatures?: boolean } = {}
) {
  const includeFeatures = options.includeFeatures !== false;
  try {
    if (musicSource === "artists" && sourceId === "random") {
      const q = await getFormattedQuestions(artists, numQuestions);
      return q;
    }

    if ((musicSource === "artist" || musicSource === "custom" || musicSource === "search") && sourceId) {
      const artistsList = sourceId.split(/\s+/).filter(Boolean);
      let allTracks: any[] = [];
      for (const a of artistsList) {
        const tracks = await itunesConnector.searchTracks(a, Math.max(25, numQuestions * 10));
        allTracks = allTracks.concat(tracks);
      }
      if (allTracks.length === 0 && artistsList.length > 0) {
        const tracks = await itunesConnector.searchTracks(sourceId, Math.max(25, numQuestions * 10));
        allTracks = tracks;
      }
      const target = normalize(sourceId);
      let filtered = allTracks.filter((t) => {
        const artist = normalize(t.artist);
        for (const a of artistsList) {
          if (artist.includes(normalize(a))) return true;
        }
        return artist.includes(target);
      });
      if (filtered.length === 0) {
        filtered = allTracks.filter((t) => (t.previewUrl || t.trackUri));
      }
      const usableFromFiltered = filtered.filter((t) => t.previewUrl || t.trackUri && t.title);
      const usableFromTracks = allTracks.filter((t) => t.previewUrl || t.trackUri && t.title);

      if (usableFromFiltered.length >= 1) {
        return mapTracksToQuestions(usableFromFiltered, numQuestions, difficulty);
      }
      if (usableFromTracks.length >= 1) {
        return mapTracksToQuestions(usableFromTracks, numQuestions, difficulty);
      }
      return getFormattedQuestions(artists, numQuestions);
    }

    if (musicSource === "genre" && sourceId) {
      const genreName = GENRE_MAP[sourceId] || sourceId;
      const tracks = await itunesConnector.searchArtistTracks(genreName, numQuestions * 4);
      if (tracks.length >= numQuestions) {
        return mapTracksToQuestions(tracks, numQuestions, difficulty);
      }
      return getFormattedQuestions(artists, numQuestions);
    }

    if (musicSource === "country" && sourceId) {
      const countrySearch = sourceId === "FR" ? "top France" : `top ${sourceId}`;
      const tracks = await itunesConnector.searchArtistTracks(countrySearch, numQuestions * 4);
      if (tracks.length >= numQuestions) {
        return mapTracksToQuestions(tracks, numQuestions, difficulty);
      }
      return getFormattedQuestions(artists, numQuestions);
    }

    if (musicSource === "theme" && sourceId) {
      const themeName = THEME_MAP[sourceId] || sourceId;
      const tracks = await itunesConnector.searchArtistTracks(themeName, numQuestions * 4);
      if (tracks.length >= numQuestions) {
        return mapTracksToQuestions(tracks, numQuestions, difficulty);
      }
      return getFormattedQuestions(artists, numQuestions);
    }

    return getFormattedQuestions(artists, numQuestions);
  } catch (error) {
    console.error("Error loading blindtest questions:", error);
    return getFormattedQuestions(artists, numQuestions);
  }
}
