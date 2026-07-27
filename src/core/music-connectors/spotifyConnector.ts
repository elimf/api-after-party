import { MusicConnector, UserTrack } from './types';

interface SpotifyTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

interface SpotifyUserProfile {
  id: string;
  display_name: string;
  external_urls: { spotify: string };
  followers: { href: string | null; total: number };
  href: string;
  images: Array<{ url: string; height: number | null; width: number | null }>;
  type: string;
  uri: string;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  preview_url: string | null;
  duration_ms: number;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string;
  images: Array<{ url: string }>;
  owner: { display_name: string };
  tracks: { total: number };
}

export class SpotifyConnector implements MusicConnector {
  provider: 'spotify' = 'spotify';

  constructor(
    private readonly clientId: string,
    private readonly clientSecret: string,
    private readonly baseApiUrl = 'https://api.spotify.com/v1',
    private readonly authUrl = 'https://accounts.spotify.com/api/token'
  ) {}

  getAuthorizeUrl(state: string, redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: 'code',
      redirect_uri: redirectUri,
      scope: 'playlist-read-private playlist-read-collaborative streaming user-read-private user-read-email',
      state,
    });

    return `https://accounts.spotify.com/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Spotify token exchange failed: ${response.statusText}`);
    }

    const data: SpotifyTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string; expiresIn: number }> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');

    const response = await fetch(this.authUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Spotify token refresh failed: ${response.statusText}`);
    }

    const data: SpotifyTokenResponse = await response.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token || refreshToken,
      expiresIn: data.expires_in,
    };
  }

  async getRecentlyPlayed(accessToken: string, limit = 20): Promise<UserTrack[]> {
    const response = await fetch(`${this.baseApiUrl}/me/player/recently_played?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.items?.map((item: any) => this.formatTrack(item.track)) || [];
  }

  async getTopTracks(accessToken: string, limit = 20): Promise<UserTrack[]> {
    const response = await fetch(`${this.baseApiUrl}/me/top/tracks?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.items?.map((track: SpotifyTrack) => this.formatTrack(track)) || [];
  }

  async getUserProfile(accessToken: string): Promise<SpotifyUserProfile> {
    const response = await fetch(`${this.baseApiUrl}/me`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch Spotify user profile');
    }

    return response.json();
  }

  async getUserPlaylists(accessToken: string, limit = 50): Promise<SpotifyPlaylist[]> {
    const response = await fetch(`${this.baseApiUrl}/me/playlists?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.items || [];
  }

  async getPlaylistTracks(accessToken: string, playlistId: string, limit = 50): Promise<UserTrack[]> {
    const response = await fetch(`${this.baseApiUrl}/playlists/${playlistId}/tracks?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return data.items?.map((item: any) => this.formatTrack(item.track)).filter((track: UserTrack | null) => track !== null) || [];
  }

  async getPlaylistById(accessToken: string, playlistId: string): Promise<SpotifyPlaylist> {
    const response = await fetch(`${this.baseApiUrl}/playlists/${playlistId}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch playlist');
    }

    return response.json();
  }

  private formatTrack(track: SpotifyTrack | null): UserTrack | null {
    if (!track || !track.preview_url) return null;

    return {
      id: track.id,
      title: track.name,
      artist: track.artists[0]?.name || 'Unknown',
      album: track.album.name,
      artworkUrl: track.album.images[0]?.url,
      previewUrl: track.preview_url,
      source: 'spotify',
    };
  }
}
