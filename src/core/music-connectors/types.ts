export interface UserTrack {
  id: string;
  title: string;
  artist: string;
  album?: string;
  previewUrl?: string;
  artworkUrl?: string;
  source: 'spotify' | 'deezer';
}

export interface MusicConnector {
  provider: 'spotify' | 'deezer';
  getAuthorizeUrl(state: string, redirectUri: string): string;
  exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>;
  refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }>;
  getRecentlyPlayed(accessToken: string, limit?: number): Promise<UserTrack[]>;
  getTopTracks(accessToken: string, limit?: number): Promise<UserTrack[]>;
}
