interface GeniusArtist {
  id: number;
  name: string;
  url: string;
  imageUrl?: string;
}

interface GeniusLyrics {
  full: string;
  excerpt: string;
}

interface GeniusSong {
  id: number;
  title: string;
  url: string;
  artist: GeniusArtist;
  lyrics?: GeniusLyrics;
  albumArt?: string;
}

export class GeniusConnector {
  constructor(private readonly apiToken: string) {}

  async getLyrics(artist: string, song: string): Promise<string | null> {
    try {
      const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(`${artist} ${song}`)}&access_token=${this.apiToken}`;

      const response = await fetch(searchUrl);
      if (!response.ok) return null;

      const data = await response.json();
      const hits = data.response?.hits;

      if (!hits || hits.length === 0) return null;

      const songData = hits[0]?.result;
      if (!songData) return null;

      // Note: Full lyrics require scraping the page, not available via API
      // This returns the song URL where lyrics can be viewed
      return songData.url;
    } catch (error) {
      console.error('Error fetching lyrics from Genius:', error);
      return null;
    }
  }

  async searchSongs(query: string, limit = 5): Promise<GeniusSong[]> {
    try {
      const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(query)}&access_token=${this.apiToken}`;

      const response = await fetch(searchUrl);
      if (!response.ok) return [];

      const data = await response.json();
      const hits = data.response?.hits || [];

      return hits.slice(0, limit).map((hit: any) => {
        const song = hit.result;
        return {
          id: song.id,
          title: song.title,
          url: song.url,
          artist: {
            id: song.primary_artist?.id,
            name: song.primary_artist?.name,
            url: song.primary_artist?.url,
            imageUrl: song.primary_artist?.image_url,
          },
          albumArt: song.song_art_image_url,
        };
      });
    } catch (error) {
      console.error('Error searching songs on Genius:', error);
      return [];
    }
  }

  async getArtistInfo(artistName: string): Promise<GeniusArtist | null> {
    try {
      const searchUrl = `https://api.genius.com/search?q=${encodeURIComponent(artistName)}&access_token=${this.apiToken}`;

      const response = await fetch(searchUrl);
      if (!response.ok) return null;

      const data = await response.json();
      const hits = data.response?.hits;

      if (!hits || hits.length === 0) return null;

      const artist = hits[0]?.result?.primary_artist;
      if (!artist) return null;

      return {
        id: artist.id,
        name: artist.name,
        url: artist.url,
        imageUrl: artist.image_url,
      };
    } catch (error) {
      console.error('Error fetching artist info from Genius:', error);
      return null;
    }
  }
}
