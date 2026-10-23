import { SpotifyConnector } from '../core/music-connectors/spotifyConnector';

interface Question {
  text: string;
  choices: string[];
  correctAnswer: number;
  type: string;
  spotifyUri: string;
}

interface TrackData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  trackUri: string;
}

// Curated playlist IDs for themes (these have better preview URL coverage)
const THEME_PLAYLISTS: Record<string, string> = {
  'top100': '37i9dQZF1DWY4aHaDwcYpQ', // Top 50 Global
  'rap': '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
  'rnb': '37i9dQZF1DX4UtSsGT1Sbe', // R&B mode
  'electro': '37i9dQZF1DXdCJMCGIc79i', // Electronic/Dance
  'pop': '37i9dQZF1DXcBWIGoYW0DQ', // Top 50 Worldwide
  'rock': '37i9dQZF1DX4o1sPGTFU0K', // Rock Classics
  'indie': '37i9dQZF1DX0SM0LYsdbRQ', // Indie Pop
  'hiphop': '37i9dQZF1DWUVYVlrG0DPk', // Hip-Hop Hits
};

export class SpotifyTrackProvider {
  constructor(private spotifyConnector: SpotifyConnector) {}

  async getPlaylistTracks(accessToken: string, playlistId: string, count: number): Promise<TrackData[]> {
    try {
      const tracks = await this.spotifyConnector.getPlaylistTracks(accessToken, playlistId, count);

      console.log(`[Spotify] Fetched ${tracks.length} tracks from playlist ${playlistId}`);

      // Convert to TrackData format with Spotify URIs (no need for preview URLs with Web Playback SDK)
      const trackData = tracks
        .map((track: any) => ({
          id: track.id,
          title: track.title,
          artist: track.artist,
          album: track.album,
          artworkUrl: track.artworkUrl,
          trackUri: track.trackUri,
        }))
        .filter((track: any) => !!track.trackUri)
        .slice(0, count);

      console.log(`[Spotify] Prepared ${trackData.length} tracks for playback`);
      return trackData;
    } catch (error) {
      console.error('❌ Error fetching playlist tracks:', error);
      throw new Error('Failed to fetch playlist tracks');
    }
  }

  async getThemeTracks(accessToken: string, theme: string, count: number): Promise<TrackData[]> {
    const playlistId = THEME_PLAYLISTS[theme.toLowerCase()];

    if (!playlistId) {
      throw new Error(`Unknown theme: ${theme}`);
    }

    // Fetch more for themes too (Spotify has lower preview URL density in some playlists)
    return this.getPlaylistTracks(accessToken, playlistId, count);
  }

  async generateQuestionsFromTracks(tracks: TrackData[]): Promise<Question[]> {
    // All tracks should have URIs for Web Playback SDK
    const validTracks = tracks.filter((track): track is TrackData => !!track.trackUri);

    return validTracks.map((track, index) => {
      // Create fake choices from other tracks
      const fakeChoices = validTracks
        .filter((_, i) => i !== index)
        .slice(0, 3)
        .map((t) => t.title);

      // Shuffle choices and find correct answer index
      const choices = [track.title, ...fakeChoices];

      // Shuffle
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }

      const correctAnswer = choices.indexOf(track.title);

      return {
        text: `Quel est le titre de cette chanson de ${track.artist} ?`,
        choices,
        correctAnswer,
        type: 'Musique',
        spotifyUri: track.trackUri,
      };
    });
  }

  async generateQuizQuestions(
    source: 'playlists' | 'artists' | 'themes',
    sourceId: string,
    accessToken: string | null,
    count: number
  ): Promise<Question[]> {
    let tracks: TrackData[] = [];

    if (source === 'playlists') {
      if (!accessToken) {
        throw new Error('Access token required for playlist source');
      }
      tracks = await this.getPlaylistTracks(accessToken, sourceId, count);
    } else if (source === 'themes') {
      if (!accessToken) {
        throw new Error('Access token required for theme source');
      }
      tracks = await this.getThemeTracks(accessToken, sourceId, count);
    } else if (source === 'artists') {
      // Artists source should not reach here - handled in quizHandler fallback
      throw new Error('Artists source not implemented in SpotifyTrackProvider');
    }

    const questions = await this.generateQuestionsFromTracks(tracks);

    if (questions.length === 0) {
      throw new Error(`No tracks found for ${source} source`);
    }

    return questions;
  }

  getAvailableThemes(): Array<{ id: string; name: string }> {
    return [
      { id: 'top100', name: 'Top 100 Global' },
      { id: 'rap', name: 'Rap' },
      { id: 'rnb', name: 'R&B' },
      { id: 'electro', name: 'Électronique' },
    ];
  }
}
