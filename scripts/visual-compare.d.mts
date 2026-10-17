export declare function mismatchPercent(
  diffPixels: number,
  width: number,
  height: number,
): number;
export declare function formatResults(
  rows: {
    id: string;
    width: number;
    mismatch: string;
    impl: string;
    figma: string;
    sameAs?: boolean;
    caveat?: string;
  }[],
  skipped: { id: string; width: number; reason: string }[],
): string;
export declare function parseReferenceKey(
  key: string,
): { id: string; width: number; key: string } | null;
export declare function buildPageJobs(
  pages: Record<string, { route?: string; screens?: Record<string, string> }>,
  onlyIds: Set<string> | null,
  onlyWidths?: Set<number> | null,
): { id: string; width: number; key: string; route: string; node: string }[];
export declare function formatPageResults(
  rows: {
    id: string;
    width: number;
    route: string;
    mismatch: string;
    impl: string;
    figma: string;
  }[],
  failures: string[],
): string;
