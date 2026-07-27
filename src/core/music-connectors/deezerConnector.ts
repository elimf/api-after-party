import { MusicConnector, UserTrack } from './types';

export class DeezerConnector implements MusicConnector {
  provider: 'deezer' = 'deezer';

  constructor(private readonly appId: string) {
    if (!appId) {
      throw new Error('Missing Deezer app id');
    }
  }

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      app_id: this.appId,
      redirect_uri: redirectUri,
      perms: 'basic_access,listening_history',
      state,
    });

    return `https://connect.deezer.com/oauth/auth.php?${params.toString()}`;
  }

  async exchangeCodeForToken(_code: string, _redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    throw new Error('Deezer token exchange not wired yet.');
  }

  async refreshAccessToken(_refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    throw new Error('Deezer refresh flow not supported in this connector yet.');
  }

  async getRecentlyPlayed(_accessToken: string, _limit = 20): Promise<UserTrack[]> {
    return [];
  }

  async getTopTracks(_accessToken: string, _limit = 20): Promise<UserTrack[]> {
    return [];
  }
}
