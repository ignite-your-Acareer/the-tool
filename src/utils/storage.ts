// Storage utility for saving/loading app state
// Supports both Local Storage and IndexedDB (future enhancement)

export interface AppState {
  // Canvas state
  nodes: any[];
  edges: any[];
  components: Map<string, any>;
  
  // Chat state
  messages: any[];
  orphanMessageIds: string[];
  
  // Metadata
  lastSaved: Date;
  version: string;
}

export interface StorageOptions {
  autoSave?: boolean;
  saveInterval?: number; // milliseconds
  storageType?: 'localStorage' | 'indexedDB';
}

class AppStorage {
  private autoSave: boolean;
  private saveInterval: number;
  private storageType: 'localStorage' | 'indexedDB';
  private autoSaveTimer: number | null = null;
  private readonly STORAGE_KEY = 'the-tool-app-state';
  private readonly VERSION = '1.0.0';

  constructor(options: StorageOptions = {}) {
    this.autoSave = options.autoSave ?? true;
    this.saveInterval = options.saveInterval ?? 30000; // 30 seconds
    this.storageType = options.storageType ?? 'localStorage';
  }

  // Convert Map to serializable object
  private serializeComponents(components: Map<string, any>): Record<string, any> {
    const serialized: Record<string, any> = {};
    components.forEach((value, key) => {
      serialized[key] = value;
    });
    return serialized;
  }

  // Convert serializable object back to Map
  private deserializeComponents(serialized: Record<string, any>): Map<string, any> {
    const components = new Map<string, any>();
    Object.entries(serialized).forEach(([key, value]) => {
      components.set(key, value);
    });
    return components;
  }

  // Save app state
  async saveState(state: Partial<AppState>): Promise<void> {
    try {
      const fullState: AppState = {
        nodes: state.nodes || [],
        edges: state.edges || [],
        components: state.components || new Map(),
        messages: state.messages || [],
        orphanMessageIds: state.orphanMessageIds || [],
        lastSaved: new Date(),
        version: this.VERSION,
      };

      const serializedState = {
        ...fullState,
        components: this.serializeComponents(fullState.components),
      };

      if (this.storageType === 'localStorage') {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(serializedState));
      } else {
        // IndexedDB implementation would go here
        await this.saveToIndexedDB(serializedState);
      }

      console.log('App state saved successfully');
    } catch (error) {
      console.error('Failed to save app state:', error);
      throw error;
    }
  }

  // Load app state
  async loadState(): Promise<AppState | null> {
    try {
      let serializedState: string | null = null;

      if (this.storageType === 'localStorage') {
        serializedState = localStorage.getItem(this.STORAGE_KEY);
      } else {
        // IndexedDB implementation would go here
        serializedState = await this.loadFromIndexedDB();
      }

      if (!serializedState) {
        console.log('No saved state found');
        return null;
      }

      const parsedState = JSON.parse(serializedState);
      
      // Validate version compatibility
      if (parsedState.version !== this.VERSION) {
        console.warn('Version mismatch, attempting to migrate...');
        // Migration logic would go here
      }

      const state: AppState = {
        ...parsedState,
        components: this.deserializeComponents(parsedState.components),
        lastSaved: new Date(parsedState.lastSaved),
      };

      console.log('App state loaded successfully');
      return state;
    } catch (error) {
      console.error('Failed to load app state:', error);
      return null;
    }
  }

  // Clear saved state
  async clearState(): Promise<void> {
    try {
      if (this.storageType === 'localStorage') {
        localStorage.removeItem(this.STORAGE_KEY);
      } else {
        // IndexedDB implementation would go here
        await this.clearIndexedDB();
      }
      console.log('App state cleared successfully');
    } catch (error) {
      console.error('Failed to clear app state:', error);
      throw error;
    }
  }

  // Start auto-save functionality
  startAutoSave(saveFunction: () => Partial<AppState>): void {
    if (!this.autoSave) return;

    this.stopAutoSave(); // Clear any existing timer

    this.autoSaveTimer = setInterval(async () => {
      try {
        const state = saveFunction();
        await this.saveState(state);
      } catch (error) {
        console.error('Auto-save failed:', error);
      }
    }, this.saveInterval);

    console.log(`Auto-save started (${this.saveInterval}ms interval)`);
  }

  // Stop auto-save functionality
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
      console.log('Auto-save stopped');
    }
  }

  // Export state as JSON file
  async exportState(state: Partial<AppState>): Promise<string> {
    const fullState: AppState = {
      nodes: state.nodes || [],
      edges: state.edges || [],
      components: state.components || new Map(),
      messages: state.messages || [],
      orphanMessageIds: state.orphanMessageIds || [],
      lastSaved: new Date(),
      version: this.VERSION,
    };

    const serializedState = {
      ...fullState,
      components: this.serializeComponents(fullState.components),
    };

    return JSON.stringify(serializedState, null, 2);
  }

  // Import state from JSON file
  async importState(jsonString: string): Promise<AppState> {
    try {
      const parsedState = JSON.parse(jsonString);
      
      // Validate version compatibility
      if (parsedState.version !== this.VERSION) {
        console.warn('Version mismatch, attempting to migrate...');
        // Migration logic would go here
      }

      const state: AppState = {
        ...parsedState,
        components: this.deserializeComponents(parsedState.components),
        lastSaved: new Date(parsedState.lastSaved),
      };

      // Save the imported state
      await this.saveState(state);
      
      console.log('State imported successfully');
      return state;
    } catch (error) {
      console.error('Failed to import state:', error);
      throw error;
    }
  }

  // Placeholder methods for IndexedDB (future enhancement)
  private async saveToIndexedDB(_state: any): Promise<void> {
    // IndexedDB implementation would go here
    throw new Error('IndexedDB not implemented yet');
  }

  private async loadFromIndexedDB(): Promise<string | null> {
    // IndexedDB implementation would go here
    throw new Error('IndexedDB not implemented yet');
  }

  private async clearIndexedDB(): Promise<void> {
    // IndexedDB implementation would go here
    throw new Error('IndexedDB not implemented yet');
  }

  // Get storage info
  getStorageInfo(): { type: string; size: number; available: boolean } {
    if (this.storageType === 'localStorage') {
      const used = new Blob([localStorage.getItem(this.STORAGE_KEY) || '']).size;
      return {
        type: 'localStorage',
        size: used,
        available: true,
      };
    }
    
    return {
      type: 'indexedDB',
      size: 0,
      available: false,
    };
  }
}

// Create singleton instance
export const appStorage = new AppStorage({
  autoSave: true,
  saveInterval: 30000, // 30 seconds
  storageType: 'localStorage',
});

export default AppStorage; 