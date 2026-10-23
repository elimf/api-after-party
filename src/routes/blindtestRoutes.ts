import express from "express";

const router = express.Router();

router.get("/artists", async (req, res) => {
  const term = ((req.query.term as string) || "").trim();
  if (term.length < 1) {
    return res.json({ artists: [] });
  }

  try {
    const seen = new Set<string>();
    const unique: Array<{ id: number; name: string; genre?: string; primaryGenreName?: string }> = [];

    const addArtist = (name: string, id?: number, genre?: string) => {
      if (!name) return;
      const key = name.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      unique.push({ id: id || 0, name, genre: genre || undefined, primaryGenreName: genre || undefined });
    };

    // Try musicArtist first
    try {
      const url1 = `https://itunes.apple.com/search?term=${encodeURIComponent(
        term
      )}&entity=musicArtist&limit=20`;
      const response1 = await fetch(url1);
      const data1 = (await response1.json()) as any;
      const results1 = Array.isArray(data1.results) ? data1.results : [];
      for (const item of results1) {
        if (item.artistName) addArtist(item.artistName, item.artistId, item.primaryGenreName);
        if (unique.length >= 15) break;
      }
    } catch (e) {
      console.error("autocomplete musicArtist error", e);
    }

    // Fallback to songs to get more artists with genre info
    if (unique.length < 10) {
      try {
        const url2 = `https://itunes.apple.com/search?term=${encodeURIComponent(
          term
        )}&entity=song&limit=60`;
        const response2 = await fetch(url2);
        const data2 = (await response2.json()) as any;
        const results2 = Array.isArray(data2.results) ? data2.results : [];
        for (const item of results2) {
          if (item.artistName) addArtist(item.artistName, item.artistId, item.primaryGenreName);
          if (unique.length >= 15) break;
        }
      } catch (e) {
        console.error("autocomplete song error", e);
      }
    }

    // Sort by relevance: starts with term first
    const lowerTerm = term.toLowerCase();
    unique.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(lowerTerm) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(lowerTerm) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.length - b.name.length;
    });

    return res.json({ artists: unique.slice(0, 12) });
  } catch (error) {
    console.error("Erreur recherche artistes iTunes:", error);
    return res.json({ artists: [] });
  }
});

export default router;
