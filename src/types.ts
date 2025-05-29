export interface MultiPageOptions {
  entry?: string;
  template?: string;
  exclude?: string[];
  placeholder?: string;
  debug?: boolean;
}

export interface EntryFile {
  name: string;
  file: string;
}

export interface CandidateFile extends EntryFile {
  priority: number;
}
