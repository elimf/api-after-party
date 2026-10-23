import { UserTrack } from './types';

interface ITunesSearchResult {
  results: ITunesTrack[];
}

interface ITunesTrack {
  trackId: number;
  trackName: string;
  artistName: string;
  collectionName: string;
  artworkUrl100?: string;
  previewUrl?: string;
}

export class ITunesConnector {
  private baseUrl = 'https://itunes.apple.com/search';

  async searchTracks(query: string, limit = 20): Promise<UserTrack[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}?term=${encodeURIComponent(query)}&entity=song&limit=${limit}`
      );
      const data: ITunesSearchResult = await response.json();

      return data.results
        .filter((track) => track.previewUrl) // Only tracks with preview URLs
        .map((track) => ({
          id: track.trackId.toString(),
          title: track.trackName,
          artist: track.artistName,
          album: track.collectionName,
          artworkUrl: track.artworkUrl100,
          previewUrl: track.previewUrl,
          trackUri: track.previewUrl, // iTunes uses preview URL directly
          source: 'itunes' as const,
        }));
    } catch (error) {
      console.error('Error searching iTunes:', error);
      return [];
    }
  }

  async searchArtistTracks(artist: string, limit = 20): Promise<UserTrack[]> {
    return this.searchTracks(artist, limit);
  }

  async getTopTracks(limit = 20): Promise<UserTrack[]> {
    return this.searchTracks('popular', limit);
  }
}
