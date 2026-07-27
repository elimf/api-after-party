import { DeezerConnector } from './deezerConnector';
import { SpotifyConnector } from './spotifyConnector';
import { MusicConnector } from './types';

export function createMusicConnectorsFromEnv(): MusicConnector[] {
  const connectors: MusicConnector[] = [];

  if (process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET) {
    connectors.push(new SpotifyConnector(process.env.SPOTIFY_CLIENT_ID, process.env.SPOTIFY_CLIENT_SECRET));
  }

  if (process.env.DEEZER_APP_ID) {
    connectors.push(new DeezerConnector(process.env.DEEZER_APP_ID));
  }

  return connectors;
}

export * from './types';
