import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { appStorage, type AppState } from '../utils/storage';

interface AppStateContextType {
  // State
  nodes: any[];
  edges: any[];
  components: Map<string, any>;
  messages: any[];
  orphanMessageIds: string[];
  
  // Actions
  setNodes: (nodes: any[]) => void;
  setEdges: (edges: any[]) => void;
  setComponents: (components: Map<string, any>) => void;
  setMessages: (messages: any[]) => void;
  setOrphanMessageIds: (orphanIds: string[]) => void;
  
  // Storage actions
  saveState: () => Promise<void>;
  loadState: () => Promise<void>;
  clearState: () => Promise<void>;
  exportState: () => Promise<string>;
  importState: (jsonString: string) => Promise<void>;
  
  // Status
  isLoading: boolean;
  lastSaved: Date | null;
  hasUnsavedChanges: boolean;
}

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

interface AppStateProviderProps {
  children: ReactNode;
}

export const AppStateProvider = ({ children }: AppStateProviderProps) => {
  const [nodes, setNodes] = useState<any[]>([]);
  const [edges, setEdges] = useState<any[]>([]);
  const [components, setComponents] = useState<Map<string, any>>(new Map());
  const [messages, setMessages] = useState<any[]>([]);
  const [orphanMessageIds, setOrphanMessageIds] = useState<string[]>([]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Save state function
  const saveState = async () => {
    try {
      setIsLoading(true);
      const state: Partial<AppState> = {
        nodes,
        edges,
        components,
        messages,
        orphanMessageIds,
      };
      
      await appStorage.saveState(state);
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to save state:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Load state function
  const loadState = async () => {
    try {
      setIsLoading(true);
      const state = await appStorage.loadState();
      
      if (state) {
        setNodes(state.nodes);
        setEdges(state.edges);
        setComponents(state.components);
        setMessages(state.messages);
        setOrphanMessageIds(state.orphanMessageIds);
        setLastSaved(state.lastSaved);
        setHasUnsavedChanges(false);
      }
    } catch (error) {
      console.error('Failed to load state:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Clear state function
  const clearState = async () => {
    try {
      setIsLoading(true);
      await appStorage.clearState();
      setNodes([]);
      setEdges([]);
      setComponents(new Map());
      setMessages([]);
      setOrphanMessageIds([]);
      setLastSaved(null);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to clear state:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Export state function
  const exportState = async (): Promise<string> => {
    try {
      const state: Partial<AppState> = {
        nodes,
        edges,
        components,
        messages,
        orphanMessageIds,
      };
      
      return await appStorage.exportState(state);
    } catch (error) {
      console.error('Failed to export state:', error);
      throw error;
    }
  };

  // Import state function
  const importState = async (jsonString: string) => {
    try {
      setIsLoading(true);
      const state = await appStorage.importState(jsonString);
      
      setNodes(state.nodes);
      setEdges(state.edges);
      setComponents(state.components);
      setMessages(state.messages);
      setOrphanMessageIds(state.orphanMessageIds);
      setLastSaved(state.lastSaved);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('Failed to import state:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-save functionality
  useEffect(() => {
    const saveFunction = () => ({
      nodes,
      edges,
      components,
      messages,
      orphanMessageIds,
    });

    appStorage.startAutoSave(saveFunction);

    return () => {
      appStorage.stopAutoSave();
    };
  }, [nodes, edges, components, messages, orphanMessageIds]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [nodes, edges, components, messages, orphanMessageIds]);

  // Load state on mount
  useEffect(() => {
    loadState().catch(console.error);
  }, []);

  const value: AppStateContextType = {
    // State
    nodes,
    edges,
    components,
    messages,
    orphanMessageIds,
    
    // Actions
    setNodes,
    setEdges,
    setComponents,
    setMessages,
    setOrphanMessageIds,
    
    // Storage actions
    saveState,
    loadState,
    clearState,
    exportState,
    importState,
    
    // Status
    isLoading,
    lastSaved,
    hasUnsavedChanges,
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
};

export const useAppState = (): AppStateContextType => {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}; 