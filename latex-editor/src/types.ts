export interface SuggestionState {
  requestId: string;
  startPosition: number;
  currentPosition: number;
  suggestion: string | null;
  textAtRequest: string;
}

export interface EditSuggestionState {
  isVisible: boolean;
  suggestion: string;
  start: number;
  end: number;
  originalText: string;
}

// API call to backend for suggestions
export interface SuggestionRequest {
  text: string;
  cursorPosition: number;
  contextBefore: string;
  contextAfter: string;
}

export interface EditRequest {
  selectedText: string;
  query: string;
  contextBefore: string;
  contextAfter: string;
}

export interface LatexQueryRequest {
  query: string;
  content: string;
}

export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
} 