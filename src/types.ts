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
  icon: string; // Lucide icon name
  color: string; // Hex color
  files: VaultFile[];
  activeFilePath: string | null;
  openFiles: string[]; // Paths of open files
}
