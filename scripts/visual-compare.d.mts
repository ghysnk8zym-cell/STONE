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
