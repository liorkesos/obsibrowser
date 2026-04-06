export interface VaultFile {
  name: string;
  path: string;
  content?: string;
  type: 'file' | 'folder';
  children?: VaultFile[];
}

export interface VaultState {
  name: string;
  files: VaultFile[];
  activeFilePath: string | null;
  openFiles: string[]; // Paths of open files
}
