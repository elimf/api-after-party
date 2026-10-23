export interface UserTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  previewUrl?: string;
  artworkUrl?: string;
  trackUri?: string;
  source: 'deezer' | 'itunes';
}

export interface MusicConnector {
  provider: 'deezer';
  getAuthorizeUrl(state: string, redirectUri: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>;
  getRecentlyPlayed(accessToken: string, limit?: number): Promise<UserTrack[]>;
  getTopTracks(accessToken: string, limit?: number): Promise<UserTrack[]>;
}
