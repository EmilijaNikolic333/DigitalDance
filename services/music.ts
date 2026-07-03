export interface Song {
  id: number;
  title: string;
  artist: string;
  previewUrl: string;
  artworkUrl: string;
}

interface ITunesResult {
  trackId: number;
  trackName: string;
  artistName: string;
  previewUrl: string;
  artworkUrl100: string;
}

/** Searches songs via Apple's free, keyless iTunes Search API. */
export async function searchSongs(query: string): Promise<Song[]> {
  if (!query.trim()) return [];

  const response = await fetch(
    `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&limit=15`
  );
  const json = await response.json();

  return ((json.results as ITunesResult[]) ?? []).map((r) => ({
    id: r.trackId,
    title: r.trackName,
    artist: r.artistName,
    previewUrl: r.previewUrl,
    artworkUrl: r.artworkUrl100,
  }));
}
