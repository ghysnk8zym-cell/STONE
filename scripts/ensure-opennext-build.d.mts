export declare const WORKER_ENTRY: string;
export declare function ensureOpenNextBuild(deps: {
  exists: (path: string) => boolean;
  run: (command: string) => void;
}): void;
