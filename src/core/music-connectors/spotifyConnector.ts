import { MusicConnector, UserTrack } from './types';

export class SpotifyConnector implements MusicConnector {
  provider: 'spotify' = 'spotify';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly baseApiUrl = 'https://api.spotify.com/v1'
  ) {}

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'user-read-recently-played user-top-read',
      state,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(_code: string, _redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    throw new Error('Spotify token exchange not wired yet. Add secure OAuth endpoint before production use.');
  }

  async refreshAccessToken(_refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    throw new Error('Spotify token refresh not wired yet.');
  }

  async getRecentlyPlayed(_accessToken: string, _limit = 20): Promise<UserTrack[]> {
    return [];
  }

  async getTopTracks(_accessToken: string, _limit = 20): Promise<UserTrack[]> {
    return [];
  }
}
