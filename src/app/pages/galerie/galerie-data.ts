export interface Album {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly dateLong: string;
  readonly dateShort: string;
  readonly category: string;
  readonly photoCount: number;
  readonly seed: number;
}

export interface Photo {
  readonly id: string;
  readonly caption: string;
  readonly seed: number;
  readonly idx: number;
}

interface AlbumType {
  readonly prefix: string;
  readonly cat: string;
}

const ALBUM_TYPES: readonly AlbumType[] = [
  { prefix: 'Abschlussball', cat: 'Ball' },
  { prefix: 'Just Dance', cat: 'Party' },
  { prefix: 'Discofox-Workshop', cat: 'Workshop' },
  { prefix: 'Tanz in den Mai', cat: 'Party' },
  { prefix: 'Sommerfest', cat: 'Fest' },
  { prefix: 'Kinder-Aufführung', cat: 'Kinder' },
  { prefix: 'HipHop-Showcase', cat: 'Show' },
];

export function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (Math.imul(31, h) + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

export function seededRand(seed: number, i: number): number {
  return ((seed * 1664525 + i * 22695477 + 1013904223) >>> 0);
}

const DATE_LONG_FMT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
};

const DATE_SHORT_FMT: Intl.DateTimeFormatOptions = {
  month: 'short',
  year: 'numeric',
};

function buildAlbums(): readonly Album[] {
  return Array.from({ length: 28 }, (_, i): Album => {
    const type = ALBUM_TYPES[i % ALBUM_TYPES.length];
    const year = 2025 - Math.floor(i / 7);
    const month = String((i % 12) + 1).padStart(2, '0');
    const seed = hashSeed(`${type.prefix}-${year}-${month}`);
    const count = 12 + (seededRand(seed, 1) % 48);
    const isoDate = `${year}-${month}-15`;
    const date = new Date(isoDate);
    return {
      id: `album-${i + 1}`,
      title: `${type.prefix} ${year}`,
      date: isoDate,
      dateLong: date.toLocaleDateString('de-DE', DATE_LONG_FMT),
      dateShort: date.toLocaleDateString('de-DE', DATE_SHORT_FMT),
      category: type.cat,
      photoCount: count,
      seed,
    };
  });
}

export const ALBUMS: readonly Album[] = buildAlbums();
export const ALBUMS_PER_PAGE = 24;

export function findAlbumById(id: string): Album | undefined {
  return ALBUMS.find(a => a.id === id);
}

export function makePhotos(album: Album): readonly Photo[] {
  return Array.from({ length: album.photoCount }, (_, i): Photo => ({
    id: `${album.id}-p${i}`,
    caption: `${album.title}, Bild ${i + 1}`,
    seed: seededRand(album.seed, i + 100),
    idx: i,
  }));
}
