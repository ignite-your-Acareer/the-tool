// Utility for saving and loading default state

export interface DefaultState {
  nodes: any[];
  edges: any[];
  components: Record<string, any>;
  messages: any[];
  orphanMessageIds: string[];
  lastSaved: string;
}

const STORAGE_KEY = 'the-tool-default-state';

export const saveDefaultState = (state: Omit<DefaultState, 'lastSaved'>) => {
  try {
    const fullState: DefaultState = {
      ...state,
      lastSaved: new Date().toISOString(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fullState));
    console.log('Default state saved successfully');
    return true;
  } catch (error) {
    console.error('Failed to save default state:', error);
    return false;
  }
};

export const loadDefaultState = (): DefaultState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) {
      console.log('No default state found');
      return null;
    }
    
    const state = JSON.parse(saved) as DefaultState;
    console.log('Default state loaded successfully');
    return state;
  } catch (error) {
    console.error('Failed to load default state:', error);
    return null;
  }
};

export const clearDefaultState = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Default state cleared successfully');
    return true;
  } catch (error) {
    console.error('Failed to clear default state:', error);
    return false;
  }
};

export const hasDefaultState = (): boolean => {
  return localStorage.getItem(STORAGE_KEY) !== null;
}; 