import { DeezerConnector } from './deezerConnector';
import { MusicConnector } from './types';

export function createMusicConnectorsFromEnv(): MusicConnector[] {
  const connectors: MusicConnector[] = [];

  if (process.env.DEEZER_APP_ID) {
    connectors.push(new DeezerConnector(process.env.DEEZER_APP_ID));
  }

  return connectors;
}

export * from './types';
