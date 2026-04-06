import { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  FolderOpen, 
  FileText, 
  Search, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  X, 
  Menu,
  PanelLeftClose,
  PanelLeft,
  Plus,
  Upload,
  BookOpen,
  Terminal,
  Cpu,
  MoreVertical,
  Edit2,
  Trash2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from './lib/utils';
import { VaultFile, VaultState } from './types';

import { GraphVisualizer } from './components/GraphVisualizer';

// Mock data for initial view
const INITIAL_VAULT: VaultState = {
  id: "initial-vault",
  name: "Hossted Tech Wiki",
  color: "#2563eb",
  files: [
    {
      name: "Getting Started.md",
      path: "Getting Started.md",
      type: 'file',
      content: "# Welcome to Hossted Tech Wiki\n\nThis is a portable technology wiki powered by Hossted. You can upload your own Obsidian vaults or browse our curated technology guides.\n\n## Features\n- **Obsidian-like Navigation**: Familiar sidebar and tab system.\n- **Markdown Support**: Full GFM support including tables and task lists.\n- **Hossted Branded**: Clean, professional design system.\n- **Portable**: Load any folder as a vault.\n\n### How to use\n1. Click the **Upload Vault** button in the sidebar.\n2. Select your Obsidian vault folder.\n3. Start browsing your notes!\n\nCheck out our [[Docker]] and [[Kubernetes]] guides."
    },
    {
      name: "OpenSource Technologies",
      path: "OpenSource Technologies",
      type: 'folder',
      children: [
        {
          name: "Docker.md",
          path: "OpenSource Technologies/Docker.md",
          type: 'file',
          content: "# Docker Guide\n\nDocker is a set of platform as a service products that use OS-level virtualization to deliver software in packages called containers.\n\n```bash\ndocker run -d -p 80:80 nginx\n```\n\nSee also [[Kubernetes]] for orchestration."
        },
        {
          name: "Kubernetes.md",
          path: "OpenSource Technologies/Kubernetes.md",
          type: 'file',
          content: "# Kubernetes (K8s)\n\nKubernetes is an open-source container-orchestration system for automating computer application deployment, scaling, and management.\n\nIt works well with [[Docker]] containers."
        }
      ]
    }
  ],
  activeFilePath: "Getting Started.md",
  openFiles: ["Getting Started.md"]
};

const AVAILABLE_COLORS = [
  '#2563eb', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

const getInitials = (name: string) => {
  if (!name) return "";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

export default function App() {
  const [vaults, setVaults] = useState<VaultState[]>([INITIAL_VAULT]);
  const [activeVaultId, setActiveVaultId] = useState<string>(INITIAL_VAULT.id);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingVaultId, setEditingVaultId] = useState<string | null>(null);
  
  const [newVaultName, setNewVaultName] = useState("");
  const [newVaultColor, setNewVaultColor] = useState("#2563eb");

  const vault = useMemo(() => 
    vaults.find(v => v.id === activeVaultId) || vaults[0], 
  [vaults, activeVaultId]);

  const editingVault = useMemo(() => 
    vaults.find(v => v.id === editingVaultId),
  [vaults, editingVaultId]);

  useEffect(() => {
    if (editingVault) {
      setNewVaultName(editingVault.name);
      setNewVaultColor(editingVault.color);
    }
  }, [editingVault]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["OpenSource Technologies"]));

  const activeFile = useMemo(() => {
    const findFile = (files: VaultFile[], path: string): VaultFile | null => {
      for (const file of files) {
        if (file.path === path) return file;
        if (file.children) {
          const found = findFile(file.children, path);
          if (found) return found;
        }
      }
      return null;
    };
    return vault.activeFilePath ? findFile(vault.files, vault.activeFilePath) : null;
  }, [vault.files, vault.activeFilePath]);

  const { backlinks, outgoingLinks } = useMemo(() => {
    if (!activeFile) return { backlinks: [], outgoingLinks: [] };
    
    const allFiles: VaultFile[] = [];
    const flatten = (files: VaultFile[]) => {
      files.forEach(f => {
        if (f.type === 'file') allFiles.push(f);
        if (f.children) flatten(f.children);
      });
    };
    flatten(vault.files);

    const activeName = activeFile.name.replace('.md', '');
    
    const outgoing: string[] = [];
    if (activeFile.content) {
      const matches = activeFile.content.matchAll(/\[\[(.*?)\]\]/g);
      for (const match of matches) {
        const target = match[1].split('|')[0];
        const found = allFiles.find(f => f.name.replace('.md', '') === target || f.path === target);
        if (found) outgoing.push(found.path);
      }
    }

    const back: string[] = [];
    allFiles.forEach(f => {
      if (f.path === activeFile.path) return;
      if (f.content) {
        const matches = f.content.matchAll(/\[\[(.*?)\]\]/g);
        for (const match of matches) {
          const target = match[1].split('|')[0];
          if (target === activeName || target === activeFile.path) {
            back.push(f.path);
          }
        }
      }
    });

    return { backlinks: [...new Set(back)], outgoingLinks: [...new Set(outgoing)] };
  }, [activeFile, vault.files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const openFile = (path: string) => {
    setVaults(prev => prev.map(v => v.id === activeVaultId ? {
      ...v,
      activeFilePath: path,
      openFiles: v.openFiles.includes(path) ? v.openFiles : [...v.openFiles, path]
    } : v));
  };

  const closeFile = (e: React.MouseEvent, path: string) => {
    e.stopPropagation();
    setVaults(prev => prev.map(v => v.id === activeVaultId ? (() => {
      const newOpenFiles = v.openFiles.filter(p => p !== path);
      let newActive = v.activeFilePath;
      if (v.activeFilePath === path) {
        newActive = newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null;
      }
      return {
        ...v,
        openFiles: newOpenFiles,
        activeFilePath: newActive
      };
    })() : v));
  };

  const updateVault = () => {
    if (!editingVaultId) return;
    setVaults(prev => prev.map(v => v.id === editingVaultId ? {
      ...v,
      name: newVaultName,
      color: newVaultColor
    } : v));
    setIsEditModalOpen(false);
    setEditingVaultId(null);
  };

  const removeVault = (id: string) => {
    if (vaults.length <= 1) return;
    setVaults(prev => prev.filter(v => v.id !== id));
    if (activeVaultId === id) {
      const remaining = vaults.filter(v => v.id !== id);
      setActiveVaultId(remaining[0].id);
    }
  };

  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const root: VaultFile[] = [];
    const vaultName = files[0].webkitRelativePath.split('/')[0];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.name.endsWith('.md')) continue;

      const pathParts = file.webkitRelativePath.split('/').slice(1);
      const content = await file.text();
      
      let currentLevel = root;
      let currentPath = "";

      for (let j = 0; j < pathParts.length; j++) {
        const part = pathParts[j];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isLast = j === pathParts.length - 1;

        let existing = currentLevel.find(f => f.name === part);

        if (!existing) {
          existing = {
            name: part,
            path: currentPath,
            type: isLast ? 'file' : 'folder',
            content: isLast ? content : undefined,
            children: isLast ? undefined : []
          };
          currentLevel.push(existing);
        }

        if (existing.children) {
          currentLevel = existing.children;
        }
      }
    }

    // Sort: Folders first, then alphabetically
    const sortFiles = (files: VaultFile[]) => {
      files.sort((a, b) => {
        if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
      files.forEach(f => f.children && sortFiles(f.children));
    };

    sortFiles(root);

    const newVaultId = `vault-${Date.now()}`;
    const newVault: VaultState = {
      id: newVaultId,
      name: newVaultName || vaultName,
      color: newVaultColor,
      files: root,
      activeFilePath: root[0]?.type === 'file' ? root[0].path : (root[0]?.children?.[0]?.path || null),
      openFiles: root[0]?.type === 'file' ? [root[0].path] : (root[0]?.children?.[0] ? [root[0].children[0].path] : [])
    };

    setVaults(prev => [...prev, newVault]);
    setActiveVaultId(newVaultId);
    setIsAddModalOpen(false);
    setNewVaultName("");
  };

  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(true);

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return vault.files;
    
    const filter = (files: VaultFile[]): VaultFile[] => {
      return files.reduce((acc: VaultFile[], file) => {
        const matches = file.name.toLowerCase().includes(searchQuery.toLowerCase());
        const filteredChildren = file.children ? filter(file.children) : undefined;
        
        if (matches || (filteredChildren && filteredChildren.length > 0)) {
          acc.push({
            ...file,
            children: filteredChildren
          });
        }
        return acc;
      }, []);
    };
    
    return filter(vault.files);
  }, [vault.files, searchQuery]);

  return (
    <div className="flex h-screen w-full bg-hossted-dark text-hossted-text overflow-hidden">
      {/* Vault Rail (Leftmost) */}
      <div className="w-20 bg-hossted-dark border-r border-hossted-border flex flex-col items-center py-6 gap-6 shrink-0">
        <div className="w-14 h-14 flex items-center justify-center mb-2">
          <img 
            src="https://hossted.com/wp-content/uploads/2024/01/ologogreen--150x150.png" 
            alt="Hossted Logo" 
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        
        <div className="flex-1 flex flex-col items-center gap-4 w-full px-2">
          {vaults.map(v => {
            return (
              <div key={v.id} className="relative group/vault">
                <button
                  onClick={() => setActiveVaultId(v.id)}
                  title={v.name}
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative border-4",
                    activeVaultId === v.id 
                      ? "shadow-lg scale-105" 
                      : "opacity-80 hover:opacity-100"
                  )}
                  style={{ 
                    backgroundColor: '#000000', // Black background
                    borderColor: v.color, // Chosen color for border
                    boxShadow: activeVaultId === v.id ? `0 10px 15px -3px ${v.color}33` : undefined
                  }}
                >
                  <span className="text-white font-bold text-sm tracking-tighter">{getInitials(v.name)}</span>
                  {activeVaultId === v.id && (
                    <motion.div 
                      layoutId="active-vault-indicator"
                      className="absolute -left-2 w-1 h-8 rounded-r-full"
                      style={{ backgroundColor: v.color }}
                    />
                  )}
                  <div className="absolute left-16 px-2 py-1 bg-hossted-sidebar border border-hossted-sidebar-border rounded text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 text-hossted-sidebar-text">
                    {v.name}
                  </div>
                </button>
                
                {/* Vault Actions Menu */}
                <div className="absolute -right-2 -top-2 opacity-0 group-hover/vault:opacity-100 transition-opacity z-10 flex gap-1">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingVaultId(v.id);
                      setIsEditModalOpen(true);
                    }}
                    className="p-1.5 bg-hossted-sidebar border border-hossted-sidebar-border rounded-lg hover:bg-hossted-sidebar-border text-hossted-sidebar-text-muted hover:text-hossted-primary transition-colors shadow-xl"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  {vaults.length > 1 && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        removeVault(v.id);
                      }}
                      className="p-1.5 bg-hossted-sidebar border border-hossted-sidebar-border rounded-lg hover:bg-hossted-sidebar-border text-hossted-sidebar-text-muted hover:text-red-500 transition-colors shadow-xl"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
          
          <button 
            onClick={() => {
              setNewVaultName("");
              setNewVaultColor("#2563eb");
              setIsAddModalOpen(true);
            }}
            className="w-12 h-12 rounded-xl bg-hossted-sidebar border border-dashed border-hossted-sidebar-border flex items-center justify-center text-hossted-sidebar-text-muted hover:bg-hossted-sidebar-border hover:text-hossted-sidebar-text cursor-pointer transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-4 text-hossted-text-muted">
          <Settings className="w-5 h-5 hover:text-hossted-primary cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col bg-hossted-sidebar border-r border-hossted-sidebar-border overflow-hidden shrink-0 text-hossted-sidebar-text"
          >
            {/* Sidebar Header */}
            <div className="p-4 flex items-center justify-between border-b border-hossted-sidebar-border">
              <div className="flex items-center gap-3">
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center border-2 shrink-0"
                  style={{ backgroundColor: '#000000', borderColor: vault.color }}
                >
                  <span className="text-white font-bold text-[10px] tracking-tighter">{getInitials(vault.name)}</span>
                </div>
                <div className="flex flex-col min-w-0">
                  <h1 className="font-bold text-sm truncate leading-tight">{vault.name}</h1>
                  <span className="text-[10px] text-hossted-sidebar-text-muted uppercase tracking-wider">Vault</span>
                </div>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(false)}
                className="p-1 hover:bg-hossted-sidebar-border rounded-md transition-colors"
              >
                <PanelLeftClose className="w-4 h-4 text-hossted-sidebar-text-muted" />
              </button>
            </div>

            {/* Sidebar Search */}
            <div className="p-2 border-b border-hossted-sidebar-border">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-hossted-sidebar-text-muted" />
                <input 
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-hossted-sidebar-border rounded-md py-1.5 pl-8 pr-3 text-xs focus:outline-none focus:border-hossted-primary transition-colors text-hossted-sidebar-text"
                />
              </div>
            </div>

            {/* Sidebar Actions */}
            <div className="p-2 flex gap-1 border-b border-hossted-border">
              <label className="flex-1 flex items-center justify-center gap-2 py-1.5 px-3 bg-hossted-primary/10 hover:bg-hossted-primary/20 text-hossted-primary rounded-md cursor-pointer transition-all text-xs font-medium border border-hossted-primary/20">
                <Upload className="w-3.5 h-3.5" />
                Upload Vault
                <input 
                  type="file" 
                  className="hidden" 
                  {...({ webkitdirectory: "", directory: "" } as any)} 
                  onChange={handleFolderUpload}
                />
              </label>
            </div>

            {/* File Explorer */}
            <div className="flex-1 overflow-y-auto p-2">
              <div className="space-y-0.5">
                {filteredFiles.map(file => (
                  <FileTreeItem 
                    key={file.path} 
                    file={file} 
                    level={0} 
                    activePath={vault.activeFilePath}
                    expandedFolders={expandedFolders}
                    onToggleFolder={toggleFolder}
                    onOpenFile={openFile}
                  />
                ))}
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-3 border-t border-hossted-sidebar-border flex items-center justify-between text-hossted-sidebar-text-muted">
              <div className="flex items-center gap-2 text-xs">
                <Settings className="w-3.5 h-3.5" />
                <span>Settings</span>
              </div>
              <div className="flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5 hover:text-hossted-primary cursor-pointer" />
                <Cpu className="w-3.5 h-3.5 hover:text-hossted-primary cursor-pointer" />
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        {/* Toggle Sidebar Button (when closed) */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute top-4 left-4 z-10 p-2 bg-hossted-sidebar border border-hossted-sidebar-border rounded-md hover:bg-hossted-sidebar-border transition-colors shadow-lg"
          >
            <PanelLeft className="w-4 h-4 text-hossted-sidebar-text-muted" />
          </button>
        )}

        {/* Tabs Bar */}
        <div className="flex bg-hossted-sidebar border-b border-hossted-sidebar-border h-10 overflow-x-auto no-scrollbar">
          {vault.openFiles.map(path => (
            <div
              key={path}
              onClick={() => openFile(path)}
              className={cn(
                "flex items-center gap-2 px-4 h-full border-r border-hossted-sidebar-border cursor-pointer transition-colors min-w-[120px] max-w-[200px]",
                vault.activeFilePath === path ? "bg-hossted-dark text-hossted-text border-t-2 border-t-hossted-primary" : "hover:bg-hossted-sidebar-border text-hossted-sidebar-text-muted"
              )}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs truncate flex-1">{path.split('/').pop()}</span>
              <button 
                onClick={(e) => closeFile(e, path)}
                className="p-0.5 hover:bg-hossted-sidebar-border rounded transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>

        {/* Editor/Viewer Area */}
        <div className="flex-1 overflow-y-auto bg-hossted-dark">
          <div className="max-w-4xl mx-auto px-8 py-12">
            {activeFile ? (
              <motion.div 
                key={activeFile.path}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="markdown-body"
              >
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  components={{
                    a: ({ node, ...props }) => {
                      const href = props.href || "";
                      // Check if it's a wikilink (internal link)
                      if (!href.startsWith('http') && !href.startsWith('#')) {
                        return (
                          <a 
                            {...props} 
                            onClick={(e) => {
                              e.preventDefault();
                              openFile(href);
                            }}
                            className="cursor-pointer text-hossted-primary hover:underline"
                          >
                            {props.children}
                          </a>
                        );
                      }
                      return <a {...props} target="_blank" rel="noopener noreferrer" />;
                    }
                  }}
                >
                  {(activeFile.content || "").replace(/\[\[(.*?)\]\]/g, (match, p1) => {
                    const [target, label] = p1.split('|');
                    // Find the actual file path for the target name
                    const allFiles: VaultFile[] = [];
                    const flatten = (files: VaultFile[]) => {
                      files.forEach(f => {
                        if (f.type === 'file') allFiles.push(f);
                        if (f.children) flatten(f.children);
                      });
                    };
                    flatten(vault.files);
                    
                    const found = allFiles.find(f => f.name.replace('.md', '') === target || f.path === target);
                    const href = found ? found.path : target;
                    return `[${label || target}](${href})`;
                  })}
                </ReactMarkdown>
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-hossted-text-muted gap-8 opacity-50">
                <img 
                  src="https://hossted.com/wp-content/uploads/2024/01/ologogreen--150x150.png" 
                  alt="Hossted Logo" 
                  className="w-48 h-48 object-contain"
                  referrerPolicy="no-referrer"
                />
                <p className="text-xl">Select a file to view its content</p>
                <div className="flex gap-4 mt-4">
                  <div className="flex flex-col items-center gap-2 p-4 border border-hossted-border rounded-xl w-32">
                    <Database className="w-6 h-6" />
                    <span className="text-xs">Tech Wiki</span>
                  </div>
                  <div className="flex flex-col items-center gap-2 p-4 border border-hossted-border rounded-xl w-32">
                    <Cloud className="w-6 h-6" />
                    <span className="text-xs">Cloud Native</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Status Bar */}
        <div className="h-6 bg-hossted-sidebar border-t border-hossted-border px-4 flex items-center justify-between text-[10px] text-hossted-text-muted uppercase tracking-wider font-medium">
          <div className="flex items-center gap-4">
            <span>{vault.name}</span>
            <span>{vault.files.length} Files</span>
          </div>
          <div className="flex items-center gap-4">
            <span>UTF-8</span>
            <span>Markdown</span>
          </div>
        </div>
      </main>

      {/* Right Sidebar (Links/Metadata) */}
      <AnimatePresence initial={false}>
        {isRightSidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col bg-hossted-sidebar border-l border-hossted-sidebar-border overflow-hidden shrink-0 text-hossted-sidebar-text"
          >
            <div className="p-4 border-b border-hossted-sidebar-border flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider">Metadata & Graph</span>
              <button 
                onClick={() => setIsRightSidebarOpen(false)}
                className="p-1 hover:bg-hossted-sidebar-border rounded-md transition-colors"
              >
                <X className="w-3.5 h-3.5 text-hossted-sidebar-text-muted" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Graph Visualizer */}
              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-hossted-sidebar-text-muted uppercase tracking-widest">Local Graph</h3>
                <GraphVisualizer 
                  files={vault.files} 
                  activeFilePath={vault.activeFilePath} 
                  onNodeClick={openFile}
                />
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-hossted-sidebar-text-muted uppercase tracking-widest">Backlinks</h3>
                {backlinks.length > 0 ? (
                  <div className="space-y-1">
                    {backlinks.map(path => (
                      <div 
                        key={path}
                        onClick={() => openFile(path)}
                        className="text-xs text-hossted-primary hover:underline cursor-pointer truncate flex items-center gap-2"
                      >
                        <FileText className="w-3 h-3" />
                        {path.split('/').pop()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-hossted-sidebar-text-muted italic">No backlinks found</div>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-[10px] font-bold text-hossted-sidebar-text-muted uppercase tracking-widest">Outgoing Links</h3>
                {outgoingLinks.length > 0 ? (
                  <div className="space-y-1">
                    {outgoingLinks.map(path => (
                      <div 
                        key={path}
                        onClick={() => openFile(path)}
                        className="text-xs text-hossted-primary hover:underline cursor-pointer truncate flex items-center gap-2"
                      >
                        <FileText className="w-3 h-3" />
                        {path.split('/').pop()}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-hossted-sidebar-text-muted italic">No links found</div>
                )}
              </div>

              <div className="space-y-2">
                <h3 className="text-[10px] font-bold text-hossted-sidebar-text-muted uppercase tracking-widest">Tags</h3>
                <div className="flex flex-wrap gap-1">
                  <span className="px-2 py-0.5 bg-hossted-primary/10 text-hossted-primary rounded text-[10px]">#hossted</span>
                  <span className="px-2 py-0.5 bg-hossted-primary/10 text-hossted-primary rounded text-[10px]">#wiki</span>
                  <span className="px-2 py-0.5 bg-hossted-secondary/10 text-hossted-secondary rounded text-[10px]">#tech</span>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Add/Edit Vault Modal */}
      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-hossted-sidebar border border-hossted-sidebar-border rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-hossted-sidebar-text"
            >
              <div className="p-6 border-b border-hossted-sidebar-border flex items-center justify-between">
                <h2 className="text-xl font-bold">{isEditModalOpen ? 'Edit Technology' : 'Add New Technology'}</h2>
                <button 
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setIsEditModalOpen(false);
                    setEditingVaultId(null);
                  }}
                  className="p-2 hover:bg-hossted-sidebar-border rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-hossted-sidebar-text-muted" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Logo Preview */}
                <div className="flex flex-col items-center justify-center py-4">
                  <label className="text-xs font-semibold text-hossted-sidebar-text-muted uppercase tracking-wider mb-4">Logo Preview</label>
                  <div 
                    className="w-20 h-20 rounded-2xl flex items-center justify-center border-4 shadow-xl transition-all duration-300"
                    style={{ 
                      backgroundColor: '#000000',
                      borderColor: newVaultColor,
                    }}
                  >
                    <span className="text-white font-bold text-2xl tracking-tighter">{getInitials(newVaultName) || "?"}</span>
                  </div>
                </div>

                {/* Name Input */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-hossted-sidebar-text-muted uppercase tracking-wider">Technology Name</label>
                  <input 
                    type="text"
                    placeholder="e.g. Docker Guide"
                    value={newVaultName}
                    onChange={(e) => setNewVaultName(e.target.value)}
                    className="w-full bg-white border border-hossted-sidebar-border rounded-xl py-3 px-4 text-sm focus:outline-none focus:border-hossted-primary transition-colors text-hossted-sidebar-text"
                  />
                </div>

                {/* Color Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-hossted-sidebar-text-muted uppercase tracking-wider">Choose Color</label>
                  <div className="flex flex-wrap gap-3">
                    {AVAILABLE_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewVaultColor(color)}
                        className={cn(
                          "w-8 h-8 rounded-full border-2 transition-all",
                          newVaultColor === color 
                            ? "border-white scale-110 shadow-lg" 
                            : "border-transparent hover:scale-105"
                        )}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-6 bg-gray-50 border-t border-hossted-sidebar-border">
                {isEditModalOpen ? (
                  <button 
                    onClick={updateVault}
                    className="w-full py-4 px-6 bg-hossted-primary hover:bg-hossted-primary/90 text-white rounded-xl transition-all font-bold shadow-lg shadow-hossted-primary/20"
                  >
                    Save Changes
                  </button>
                ) : (
                  <>
                    <label className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-hossted-primary hover:bg-hossted-primary/90 text-white rounded-xl cursor-pointer transition-all font-bold shadow-lg shadow-hossted-primary/20">
                      <Upload className="w-5 h-5" />
                      Select Obsidian Folder
                      <input 
                        type="file" 
                        className="hidden" 
                        {...({ webkitdirectory: "", directory: "" } as any)} 
                        onChange={handleFolderUpload}
                      />
                    </label>
                    <p className="text-[10px] text-hossted-sidebar-text-muted text-center mt-3">
                      Select your Obsidian vault folder to import all markdown files.
                    </p>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FileTreeItem({ 
  file, 
  level, 
  activePath, 
  expandedFolders, 
  onToggleFolder, 
  onOpenFile 
}: { 
  file: VaultFile; 
  level: number; 
  activePath: string | null;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onOpenFile: (path: string) => void;
}) {
  const isExpanded = expandedFolders.has(file.path);
  const isActive = activePath === file.path;

  if (file.type === 'folder') {
    return (
      <div>
        <div 
          onClick={() => onToggleFolder(file.path)}
          className="flex items-center gap-1.5 py-1 px-2 hover:bg-hossted-sidebar-border rounded-md cursor-pointer transition-colors group"
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5 text-hossted-sidebar-text-muted" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5 text-hossted-sidebar-text-muted" />
          )}
          <FolderOpen className="w-4 h-4 text-hossted-primary/70" />
          <span className="text-sm truncate">{file.name}</span>
        </div>
        {isExpanded && file.children && (
          <div className="mt-0.5">
            {file.children.map(child => (
              <FileTreeItem 
                key={child.path} 
                file={child} 
                level={level + 1} 
                activePath={activePath}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onOpenFile={onOpenFile}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      onClick={() => onOpenFile(file.path)}
      className={cn(
        "flex items-center gap-2 py-1 px-2 rounded-md cursor-pointer transition-colors group",
        isActive ? "bg-hossted-primary/20 text-hossted-primary" : "hover:bg-hossted-sidebar-border"
      )}
      style={{ paddingLeft: `${level * 12 + 24}px` }}
    >
      <FileText className={cn("w-3.5 h-3.5", isActive ? "text-hossted-primary" : "text-hossted-sidebar-text-muted")} />
      <span className="text-sm truncate">{file.name}</span>
    </div>
  );
}
