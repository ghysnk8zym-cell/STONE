declare module "pngjs" {
  export class PNG {
    constructor(options?: { checkCRC?: boolean });
    width: number;
    height: number;
    data: Buffer;
    parse(
      input: Buffer,
      callback: (error: Error | null, result: PNG | null) => void,
    ): PNG;
    static sync: {
      read(
        input: Buffer,
        options?: { checkCRC?: boolean },
      ): {
        width: number;
        height: number;
        data: Buffer;
      };
      write(
        image: { width: number; height: number; data: Buffer },
        options?: {
          colorType?: number;
          bitDepth?: number;
          deflateLevel?: number;
        },
      ): Buffer;
    };
  }
}
