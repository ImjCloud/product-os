declare module 'multer' {
  export interface Options {
    dest?: string;
    storage?: unknown;
    limits?: { fileSize?: number; files?: number; [key: string]: unknown };
    fileFilter?: (...args: any[]) => void;
    preservePath?: boolean;
    [key: string]: unknown;
  }
}
