export type ProgrammeCollection =
  "movies" | "cinemas" | "rooms" | "combos" | "showtimes";
export interface ProgrammeManifest {
  version: 1;
  encoding: "columnar-v1";
  snapshotId: string;
  asOf: string;
  until: string;
  expiresAt: string;
  counts: Record<ProgrammeCollection, number>;
  chunks: number;
}
export interface ProgrammeRowsPart {
  collection: ProgrammeCollection;
  offset: number;
  keys: string[];
  strings: string[];
  stringColumns?: number[];
  rows: unknown[][];
}
export interface ProgrammeFragmentPart {
  collection: ProgrammeCollection;
  offset: number;
  fragment: { index: number; total: number; text: string };
}
export interface ProgrammeChunk {
  version: 1;
  snapshotId: string;
  index: number;
  parts: Array<ProgrammeRowsPart | ProgrammeFragmentPart>;
}
export function encodeProgramme(
  programme: {
    movies: unknown[];
    cinemas: unknown[];
    rooms: unknown[];
    combos: unknown[];
    showtimes: unknown[];
    asOf: Date | string;
    until: Date | string;
  },
  now?: number,
): { manifest: ProgrammeManifest; pages: ProgrammeChunk[]; source: string };
export const ENVELOPE_LIMIT_BYTES: number;
export const RETENTION_SECONDS: number;
export const REUSE_SECONDS: number;
export const MAX_CHUNKS: number;
export const MAX_SNAPSHOT_BYTES: number;
export class ProgrammeTransportTooLarge extends Error {
  constructor();
}
export const COLLECTIONS: ProgrammeCollection[];
