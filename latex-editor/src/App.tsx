import { useState, useRef, useEffect } from 'react'
import styled from '@emotion/styled'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'

const Container = styled.div`
  display: flex;
  height: 100vh;
  padding: 20px;
  gap: 20px;
  background-color: #f5f5f5;
`

const EditorPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  position: relative;
`

const PreviewPane = styled.div`
  flex: 1;
  padding: 20px;
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow-y: auto;
  line-height: 1.6;
  font-size: 16px;
`

const EditorContainer = styled.div`
  position: relative;
  flex: 1;
`

const TextArea = styled.textarea`
  width: 100%;
  height: 100%;
  padding: 15px;
  font-family: monospace;
  font-size: 14px;
  border: 1px solid #ddd;
  border-radius: 8px;
  resize: none;
  position: absolute;
  top: 0;
  left: 0;
  background: transparent;
  z-index: 1;
`

const SuggestionOverlay = styled.div`
  width: 100%;
  height: 100%;
  padding: 15px;
  font-family: monospace;
  font-size: 14px;
  border: 1px solid transparent;
  border-radius: 8px;
  resize: none;
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  white-space: pre-wrap;
`

const MatchedText = styled.span`
  color: #000;
`

const UnmatchedText = styled.span`
  color: #aaa;
`

const SuggestionContent = styled.div<{ indent: number }>`
  position: absolute;
  top: ${props => props.indent}px;
  left: 15px;
  right: 15px;
  white-space: pre-wrap;
`

const CompileButton = styled.button`
  padding: 10px 20px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.2s;

  &:hover {
    background-color: #45a049;
  }
`

interface SuggestionState {
  requestId: string;
  startPosition: number;
  suggestion: string | null;
  textAtRequest: string;
}

// API call to backend for suggestions
const getLatexSuggestion = async (text: string, cursorPosition: number): Promise<{
  suggestion: string;
  textAtRequest: string;
  cursorAtRequest: number;
}> => {
  try {
    const response = await fetch('http://localhost:3001/api/latex-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, cursorPosition }),
    });

    if (!response.ok) {
      throw new Error('Failed to get suggestion');
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error getting suggestion:', error);
    return {
      suggestion: '',
      textAtRequest: text,
      cursorAtRequest: cursorPosition
    };
  }
};

function App() {
  const [text, setText] = useState('')  // Initialize with empty string
  const [compiledContent, setCompiledContent] = useState<React.ReactNode[]>([])
  const [suggestion, setSuggestion] = useState<SuggestionState>({
    requestId: '',
    startPosition: 0,
    suggestion: null,
    textAtRequest: ''
  })
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionTimeoutRef = useRef<NodeJS.Timeout>()
  const lastRequestRef = useRef<{
    text: string;
    cursorPosition: number;
  } | null>(null)

  // Verify if the current text still matches the text at request time
  const verifySuggestion = (currentText: string, currentCursor: number) => {
    if (!lastRequestRef.current) return;

    const { text: requestText, cursorPosition: requestCursor } = lastRequestRef.current;
    
    // Get the meaningful content (non-space characters) up to cursor
    const getMeaningfulContent = (text: string, cursor: number) => {
      const content = text.slice(0, cursor);
      // Find the last non-space character
      const lastNonSpaceIndex = content.search(/\S\s*$/);
      if (lastNonSpaceIndex === -1) return ''; // All spaces or empty
      return content.slice(0, lastNonSpaceIndex + 1);
    };

    const currentMeaningfulContent = getMeaningfulContent(currentText, currentCursor);
    const requestMeaningfulContent = getMeaningfulContent(requestText, requestCursor);

    // Only clear suggestion if meaningful content doesn't match
    if (currentMeaningfulContent !== requestMeaningfulContent) {
      setSuggestion(prev => ({
        ...prev,
        suggestion: null
      }));
    }
  };

  const handleTextChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value;
    const cursorPosition = e.target.selectionStart;
    setText(newText);

    // Get the character that changed
    const lastChar = newText.charAt(cursorPosition - 1);
    const isSpaceOrBackspace = lastChar === ' ' || newText.length < text.length;

    // If it's space/backspace and we have a suggestion, just verify but don't make new request
    if (isSpaceOrBackspace && suggestion.suggestion !== null) {
      verifySuggestion(newText, cursorPosition);
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
        suggestion: null,
        textAtRequest: newText
      });

      try {
        const { suggestion: suggestedText, textAtRequest, cursorAtRequest } = await getLatexSuggestion(newText, cursorPosition);
        
        // Verify the text hasn't changed between request and response
        setSuggestion(prev => {
          if (prev.requestId !== requestId) return prev;
          
          // Get meaningful content (ignoring trailing spaces)
          const getMeaningfulContent = (text: string, cursor: number) => {
            const content = text.slice(0, cursor);
            const lastNonSpaceIndex = content.search(/\S\s*$/);
            if (lastNonSpaceIndex === -1) return '';
            return content.slice(0, lastNonSpaceIndex + 1);
          };

          const currentMeaningfulContent = getMeaningfulContent(newText, cursorPosition);
          const requestMeaningfulContent = getMeaningfulContent(textAtRequest, cursorAtRequest);
          
          if (currentMeaningfulContent !== requestMeaningfulContent) {
            return {
              ...prev,
              suggestion: null
            };
          }
          
          return {
            ...prev,
            suggestion: suggestedText
          };
        });
      } catch (error) {
        console.error('Error getting suggestion:', error);
      }
    }, 500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion.suggestion) {
      e.preventDefault()
      const newText = text.slice(0, suggestion.startPosition) + suggestion.suggestion + text.slice(suggestion.startPosition)
      setText(newText)
      setSuggestion({
        requestId: '',
        startPosition: 0,
        suggestion: null,
        textAtRequest: ''
      })
      
      // Set cursor position after the inserted suggestion
      const newCursorPosition = suggestion.startPosition + suggestion.suggestion.length
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = newCursorPosition
          textAreaRef.current.selectionEnd = newCursorPosition
        }
      }, 0)
    }
  }

  const handleCompile = () => {
    const segments = text.split(/(\$\$[^$]+\$\$|\$[^$]+\$)/g)
    const compiled = segments.map((segment, index) => {
      if (segment.startsWith('$$') && segment.endsWith('$$')) {
        const math = segment.slice(2, -2)
        return <BlockMath key={index} math={math} />
      } else if (segment.startsWith('$') && segment.endsWith('$')) {
        const math = segment.slice(1, -1)
        return <InlineMath key={index} math={math} />
      } else {
        return segment.split('\n').map((line, lineIndex) => (
          line ? <p key={`${index}-${lineIndex}`}>{line}</p> : <br key={`${index}-${lineIndex}`} />
        ))
      }
    })
    setCompiledContent(compiled.flat())
  }

  const getSuggestionOverlayContent = () => {
    if (!suggestion.suggestion) return '';

    // Get the text before the cursor
    const beforeText = text.slice(0, suggestion.startPosition);
    const afterText = text.slice(suggestion.startPosition);

    // Check if we're in the middle of a line
    const lastNewline = beforeText.lastIndexOf('\n');
    const nextNewline = afterText.indexOf('\n');
    const isMiddleOfLine = lastNewline !== beforeText.length - 1 && nextNewline !== -1;

    // Get the text that's been typed after the suggestion started
    const textAfterSuggestionStart = text.slice(suggestion.startPosition);
    
    // Find how many characters match between the suggestion and what's been typed
    let matchedLength = 0;
    while (
      matchedLength < textAfterSuggestionStart.length && 
      matchedLength < suggestion.suggestion.length && 
      textAfterSuggestionStart[matchedLength] === suggestion.suggestion[matchedLength]
    ) {
      matchedLength++;
    }

    // Split the suggestion into matched and unmatched parts
    const matchedPart = suggestion.suggestion.slice(0, matchedLength);
    const unmatchedPart = suggestion.suggestion.slice(matchedLength);

    if (isMiddleOfLine) {
      return (
        <>
          {beforeText}
          {'\n'}
          {matchedPart && <MatchedText>{matchedPart}</MatchedText>}
          {unmatchedPart && <UnmatchedText>{unmatchedPart}</UnmatchedText>}
          {'\n'}
          {afterText}
        </>
      );
    }

    return (
      <>
        {beforeText}
        {matchedPart && <MatchedText>{matchedPart}</MatchedText>}
        {unmatchedPart && <UnmatchedText>{unmatchedPart}</UnmatchedText>}
        {afterText}
      </>
    );
  };

  return (
    <Container>
      <EditorPane>
        <EditorContainer>
          <TextArea
            ref={textAreaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Enter text and LaTeX math (use $ for inline math and $$ for block math)..."
          />
          <SuggestionOverlay>
            {getSuggestionOverlayContent()}
          </SuggestionOverlay>
        </EditorContainer>
        <CompileButton onClick={handleCompile}>
          Compile
        </CompileButton>
      </EditorPane>
      <PreviewPane>
        {compiledContent}
      </PreviewPane>
    </Container>
  )
}

export default App
