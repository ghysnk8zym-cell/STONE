export declare const LIMIT_KIB: number;
export declare const AUTH_MARKER: string;
export declare function parseGzipKiB(output: string): number;
export declare function findMarkerFiles(
  files: { name: string; text: string }[],
  marker?: string,
): string[];
export declare function checkAuthCopies(names: string[]): {
  ok: boolean;
  message: string;
};
export declare function largestChunks(
  chunks: { name: string; gzipBytes: number }[],
  count?: number,
): string[];
