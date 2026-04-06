export interface VaultFile {
  name: string;
  path: string;
  content?: string;
  type: 'file' | 'folder';
  children?: VaultFile[];
}

export interface VaultState {
  id: string;
  name: string;
  color: string; // Hex color
  files: VaultFile[];
  activeFilePath: string | null;
  openFiles: string[]; // Paths of open files
}
