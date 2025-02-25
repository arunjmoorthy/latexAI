import React, { useRef, useEffect } from 'react';
import { SuggestionState } from '../types';
import { getLatexSuggestion } from '../services/api';
import { 
  EditorContainer, 
  TextArea, 
  SuggestionOverlay,
  MatchedText,
  UnmatchedText
} from '../styles/StyledComponents';

interface EditorProps {
  text: string;
  setText: (text: string) => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  suggestion: SuggestionState;
  setSuggestion: React.Dispatch<React.SetStateAction<SuggestionState>>;
  editSuggestionContent: React.ReactNode;
  textAreaRef?: React.RefObject<HTMLTextAreaElement>;
}

const Editor: React.FC<EditorProps> = ({ 
  text, 
  setText, 
  onKeyDown, 
  suggestion, 
  setSuggestion,
  editSuggestionContent,
  textAreaRef: externalTextAreaRef
}) => {
  const internalTextAreaRef = useRef<HTMLTextAreaElement>(null);
  const textAreaRef = externalTextAreaRef || internalTextAreaRef;
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRequestRef = useRef<{
    text: string;
    cursorPosition: number;
  } | null>(null);

  // Sync scrolling between textarea and suggestion overlay
  useEffect(() => {
    const textArea = textAreaRef.current;
    if (!textArea) return;

    const handleScroll = () => {
      const overlay = document.querySelector('.suggestion-overlay');
      if (overlay) {
        overlay.scrollTop = textArea.scrollTop;
        overlay.scrollLeft = textArea.scrollLeft;
      }
    };

    textArea.addEventListener('scroll', handleScroll);
    return () => {
      textArea.removeEventListener('scroll', handleScroll);
    };
  }, [textAreaRef]);

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setText(newText);

    // Update current position in suggestion state
    setSuggestion(prev => ({
      ...prev,
      currentPosition: cursorPosition
    }));

    // Get the character that changed
    const lastChar = newText.charAt(cursorPosition - 1);
    const isSpaceOrBackspace = lastChar === ' ' || newText.length < text.length;

    // If it's space/backspace and we have a suggestion, just verify but don't make new request
    if (isSpaceOrBackspace && suggestion.suggestion !== null) {
      return;
    }
    
    // Clear any pending suggestion request
    if (suggestionTimeoutRef.current) {
      clearTimeout(suggestionTimeoutRef.current);
    }

    // Start a new suggestion request after a delay
    suggestionTimeoutRef.current = setTimeout(async () => {
      const requestId = Math.random().toString();
      lastRequestRef.current = {
        text: newText,
        cursorPosition
      };
      
      setSuggestion({
        requestId,
        startPosition: cursorPosition,
        currentPosition: cursorPosition,
        suggestion: null,
        textAtRequest: newText
      });

      try {
        const { suggestion: suggestedText, textAtRequest, cursorAtRequest } = await getLatexSuggestion(newText, cursorPosition);
        
        setSuggestion(prev => {
          if (prev.requestId !== requestId) return prev;
          
          return {
            ...prev,
            suggestion: suggestedText,
            currentPosition: cursorPosition
          };
        });
      } catch (error) {
        console.error('Error getting suggestion:', error);
      }
    }, 400);
  };

  const getSuggestionOverlayContent = () => {
    if (!suggestion.suggestion) return '';

    // Get the text before the cursor
    const beforeText = text.slice(0, suggestion.startPosition);
    const afterText = text.slice(suggestion.currentPosition);
    
    // Get the text that's been typed after the suggestion started
    const typedPart = text.slice(suggestion.startPosition, suggestion.currentPosition);

    // Check if the typed part matches the start of the suggestion
    if (!suggestion.suggestion.startsWith(typedPart)) {
      return text;  // If it doesn't match, don't show suggestion
    }

    // Get the remaining part of the suggestion
    const remainingSuggestion = suggestion.suggestion.slice(typedPart.length);

    return (
      <>
        <span style={{ color: 'transparent' }}>{beforeText}</span>
        <MatchedText>{typedPart}</MatchedText>
        {remainingSuggestion && <UnmatchedText>{remainingSuggestion}</UnmatchedText>}
        <span style={{ color: 'transparent' }}>{afterText}</span>
      </>
    );
  };

  return (
    <EditorContainer>
      <TextArea
        ref={textAreaRef}
        value={text}
        onChange={handleTextChange}
        onKeyDown={onKeyDown}
        placeholder="Enter LaTeX content..."
      />
      <SuggestionOverlay className="suggestion-overlay">
        {editSuggestionContent || getSuggestionOverlayContent()}
      </SuggestionOverlay>
    </EditorContainer>
  );
};

export default Editor; 