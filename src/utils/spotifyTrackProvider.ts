import { SpotifyConnector } from '../core/music-connectors/spotifyConnector';

interface Question {
  text: string;
  choices: string[];
  correctAnswer: number;
  type: string;
  mediaUrl: string;
}

interface TrackData {
  id: string;
  title: string;
  artist: string;
  album?: string;
  artworkUrl?: string;
  previewUrl?: string;
}

// Curated playlist IDs for themes
const THEME_PLAYLISTS: Record<string, string> = {
  'top100': '37i9dQZF1DWY4aHaDwcYpQ', // Top 50 Global
  'rap': '37i9dQZF1DX0XUsuxWHRQd', // RapCaviar
  'rnb': '37i9dQZF1DX4UtSsGT1Sbe', // R&B mode
  'electro': '37i9dQZF1DXdCJMCGIc79i', // Electronic/Dance
};

export class SpotifyTrackProvider {
  constructor(private spotifyConnector: SpotifyConnector) {}

  async getPlaylistTracks(accessToken: string, playlistId: string, count: number): Promise<TrackData[]> {
    try {
      const tracks = await this.spotifyConnector.getPlaylistTracks(accessToken, playlistId, count * 2);

      const tracksWithPreview = tracks
        .filter((track: any) => track.previewUrl)
        .slice(0, count);

      if (tracksWithPreview.length < count) {
        console.warn(
          `Only ${tracksWithPreview.length} tracks with preview URLs found in playlist (requested ${count})`
        );
      }

      return tracksWithPreview;
    } catch (error) {
      console.error('Error fetching playlist tracks:', error);
      throw new Error('Failed to fetch playlist tracks');
    }
  }

  async getThemeTracks(accessToken: string, theme: string, count: number): Promise<TrackData[]> {
    const playlistId = THEME_PLAYLISTS[theme.toLowerCase()];

    if (!playlistId) {
      throw new Error(`Unknown theme: ${theme}`);
    }

    return this.getPlaylistTracks(accessToken, playlistId, count);
  }

  async generateQuestionsFromTracks(tracks: TrackData[]): Promise<Question[]> {
    // Filter tracks that have preview URLs (non-null assertion)
    const tracksWithPreview = tracks.filter(
      (track): track is TrackData & { previewUrl: string } => !!track.previewUrl
    );

    return tracksWithPreview.map((track, index) => {
      // Create fake choices from other tracks
      const fakeChoices = tracksWithPreview
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
        mediaUrl: track.previewUrl,
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
      // Keep existing artist-based logic (uses Deezer or another service)
      return [];
    }

    return this.generateQuestionsFromTracks(tracks);
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
