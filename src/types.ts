import type { UserConfig, BuildOptions } from 'vite';

export interface MultiPageOptions {
  entry?: string;
  template?: string;
  exclude?: string[];
  placeholder?: string;
  debug?: boolean;
  buildStrategies?: Record<string, BuildStrategy>;
  pageConfigs?: Record<string, PageConfig> | PageConfigFunction;
}

export interface BuildStrategy {
  viteConfig?: Omit<UserConfig, 'plugins' | 'build'> & {
    build?: BuildOptions;
  };

  output?: {
    format?: 'es' | 'cjs' | 'umd' | 'iife';
    dir?: string;
    entryFileNames?: string;
    chunkFileNames?: string;
    assetFileNames?: string;
    globals?: Record<string, string>;
    external?: string | string[] | ((id: string) => boolean);
  };

  build?: {
    target?: string | string[];
    minify?: boolean | 'terser' | 'esbuild';
    sourcemap?: boolean | 'inline' | 'hidden';
    lib?: boolean | {
      entry: string | string[] | { [entryAlias: string]: string };
      name?: string;
      formats?: ('es' | 'cjs' | 'umd' | 'iife')[];
      fileName?: string | ((format: string, entryName: string) => string);
    };
    cssCodeSplit?: boolean;
    cssTarget?: string | string[];
    rollupOptions?: any;
    reportCompressedSize?: boolean;
    chunkSizeWarningLimit?: number;
    assetsDir?: string;
    emptyOutDir?: boolean;
  };

  define?: Record<string, any>;

  alias?: Record<string, string>;

  server?: {
    port?: number;
    host?: string | boolean;
    https?: boolean;
    cors?: boolean;
    headers?: Record<string, string>;
  };

  css?: {
    modules?: any;
    postcss?: any;
    preprocessorOptions?: Record<string, any>;
    devSourcemap?: boolean;
  };

  optimizeDeps?: {
    entries?: string | string[];
    exclude?: string[];
    include?: string[];
    esbuildOptions?: any;
  };
}

export interface PageConfigBase {
  strategy?: string;
  template?: string;
  exclude?: string[];
  define?: Record<string, any>;
  alias?: Record<string, string>;
  build?: Partial<BuildStrategy['build']>;
  match?: string | string[];
}

export interface PageConfig extends PageConfigBase { }

export interface PageConfigContext {
  pageName: string;
  filePath: string;
  relativePath: string;
  strategy?: string;
  isMatched?: boolean;
}

export type PageConfigFunction = (context: PageConfigContext) => PageConfig | null;

export interface EntryFile {
  name: string;
  file: string;
}

export interface CandidateFile extends EntryFile {
  priority: number;
}
