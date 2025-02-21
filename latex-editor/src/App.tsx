import { useState, useRef, useEffect } from 'react'
import styled from '@emotion/styled'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f9fa;
`

const Header = styled.header`
  background-color: #1a1a1a;
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`

const Logo = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #61dafb;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`

const MainContent = styled.div`
  display: flex;
  flex: 1;
  padding: 24px;
  gap: 24px;
  overflow: hidden;
`

const EditorPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  min-width: 0;
`

const PreviewPane = styled.div`
  flex: 1;
  padding: 24px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
  line-height: 1.6;
  font-size: 16px;
  min-width: 0;
`

const EditorContainer = styled.div`
  position: relative;
  flex: 1;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`

const LineNumbers = styled.div`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 50px;
  padding: 15px 0;
  background-color: #f8f9fa;
  border-right: 1px solid #e9ecef;
  font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  color: #6c757d;
  text-align: right;
  user-select: none;
  overflow: hidden;
  z-index: 2;

  & > div {
    padding: 0 10px;
    height: 21px;
  }
`

const TextArea = styled.textarea`
  width: 100%;
  height: 100%;
  padding: 15px 15px 15px 60px;
  font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  border: none;
  border-radius: 12px;
  resize: none;
  position: absolute;
  top: 0;
  left: 0;
  background: transparent;
  z-index: 1;
  
  &:focus {
    outline: none;
  }
`

const SuggestionOverlay = styled.div`
  width: 100%;
  height: 100%;
  padding: 15px 15px 15px 60px;
  font-family: 'SF Mono', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
  line-height: 1.5;
  border: none;
  border-radius: 12px;
  resize: none;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 2;
  overflow: hidden;
  white-space: pre-wrap;
  pointer-events: none;
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
  padding: 12px 24px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 500;
  transition: all 0.2s;

  &:hover {
    background-color: #45a049;
    transform: translateY(-1px);
  }

  &:active {
    transform: translateY(0);
  }
`

const SuggestionBox = styled.div`
  position: absolute;
  left: 15px;
  right: 15px;
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  padding: 8px;
  margin-top: 4px;
  font-family: monospace;
  font-size: 14px;
  white-space: pre-wrap;
  pointer-events: none;
  z-index: 2;
`

const ContextText = styled.div`
  color: #6c757d;
  opacity: 0.8;
  padding: 2px 0;
`

const SuggestionText = styled.div`
  color: #007bff;
  padding: 4px 0;
  border-left: 2px solid #007bff;
  margin-left: 4px;
  padding-left: 8px;
`

const Modal = styled.div<{ isOpen: boolean }>`
  display: ${props => props.isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  z-index: 1000;
`

const ModalContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
`

const QueryInput = styled.input`
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
`

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`

const Button = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  
  &.primary {
    background-color: #007bff;
    color: white;
    
    &:hover {
      background-color: #0056b3;
    }
  }
  
  &.secondary {
    background-color: #6c757d;
    color: white;
    
    &:hover {
      background-color: #545b62;
    }
  }
`

const HighlightedText = styled.span`
  background-color: #e3f2fd;
  border-radius: 2px;
`

const SuggestionContainer = styled.div`
  position: relative;
  margin: 8px 0;
  padding: 12px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-family: monospace;
  z-index: 3;
  pointer-events: auto;
`

const SuggestionActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  z-index: 3;
  pointer-events: auto;
  
  button {
    pointer-events: auto;
    cursor: pointer;
  }
`

const AcceptButton = styled(Button)`
  &.primary {
    background-color: #28a745;
    &:hover {
      background-color: #218838;
    }
  }
`

const DeclineButton = styled(Button)`
  &.secondary {
    background-color: #dc3545;
    &:hover {
      background-color: #c82333;
    }
  }
`

const RightFlap = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${props => props.isOpen ? '0' : '-500px'};
  width: 500px;
  height: 100vh;
  background-color: white;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  transition: right 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`

const FlapHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const FlapTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #333;
`

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`

const ChatHistory = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
`

const Message = styled.div<{ type: 'user' | 'assistant' }>`
  max-width: ${props => props.type === 'user' ? '85%' : '95%'};
  ${props => props.type === 'user' ? 'margin-left: auto;' : 'margin: 0 12px;'}
  padding: 12px 16px;
  border-radius: 12px;
  ${props => props.type === 'user' 
    ? 'background-color: #007bff; color: white;' 
    : 'background-color: #f8f9fa; border: 1px solid #e9ecef;'}
  
  pre {
    background-color: ${props => props.type === 'user' ? '#0056b3' : '#f1f1f1'};
    border-radius: 4px;
    padding: 8px;
    overflow-x: auto;
  }

  code {
    background-color: ${props => props.type === 'user' ? '#0056b3' : '#f1f1f1'};
    padding: 2px 4px;
    border-radius: 3px;
  }

  /* Add better spacing for lists */
  ul, ol {
    margin: 0.75em 0;
    padding-left: 2em;
  }

  li {
    margin: 0.5em 0;
    padding-left: 0.5em;
  }

  /* Improve overall content spacing */
  p {
    margin: 0.75em 0;
  }

  h1, h2, h3, h4, h5, h6 {
    margin: 1em 0 0.5em 0;
  }
`

const ComposerArea = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 12px;
  border-top: 1px solid #e9ecef;
  background-color: white;
`

const QueryTextArea = styled.textarea`
  width: 100%;
  min-height: 100px;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  resize: vertical;
  font-family: inherit;
  
  &:focus {
    outline: none;
    border-color: #007bff;
  }
`

const ResponseArea = styled.div`
  flex: 1;
  padding: 15px;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1.6;
  overflow-y: auto;
  font-family: inherit;

  /* Style markdown elements */
  h1, h2, h3, h4, h5, h6 {
    margin-top: 1em;
    margin-bottom: 0.5em;
    font-weight: 600;
  }

  p {
    margin: 0.5em 0;
  }

  ul, ol {
    margin: 0.5em 0;
    padding-left: 1.5em;
  }

  li {
    margin: 0.25em 0;
  }

  code {
    background-color: #f1f1f1;
    padding: 0.2em 0.4em;
    border-radius: 3px;
    font-family: monospace;
  }

  pre {
    background-color: #f1f1f1;
    padding: 1em;
    border-radius: 4px;
    overflow-x: auto;
  }

  blockquote {
    margin: 0.5em 0;
    padding-left: 1em;
    border-left: 3px solid #e9ecef;
    color: #6c757d;
  }
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(255, 255, 255, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1001;
`

const LoadingSpinner = styled.div`
  width: 40px;
  height: 40px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #007bff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`

interface SuggestionState {
  requestId: string;
  startPosition: number;
  currentPosition: number;
  suggestion: string | null;
  textAtRequest: string;
}

interface EditSuggestionState {
  isVisible: boolean;
  suggestion: string;
  start: number;
  end: number;
  originalText: string;
}

// API call to backend for suggestions
interface SuggestionRequest {
  text: string;
  cursorPosition: number;
  contextBefore: string;
  contextAfter: string;
}

interface EditRequest {
  selectedText: string;
  query: string;
  contextBefore: string;
  contextAfter: string;
}

interface LatexQueryRequest {
  query: string;
  content: string;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
}

const getLatexSuggestion = async (text: string, cursorPosition: number): Promise<{
  suggestion: string;
  textAtRequest: string;
  cursorAtRequest: number;
}> => {
  try {
    // Get context before and after cursor
    const contextBefore = text.slice(Math.max(0, cursorPosition - 100), cursorPosition);
    const contextAfter = text.slice(cursorPosition, Math.min(text.length, cursorPosition + 100));

    const response = await fetch('http://localhost:3001/api/latex-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        cursorPosition,
        contextBefore,
        contextAfter,
        prompt: `Given the following text with cursor position marked as |:
${contextBefore}|${contextAfter}

Please provide an autocompletion suggestion that would fit naturally at the cursor position.

IMPORTANT RULES FOR MATH MODE:
1. Only wrap the actual mathematical expressions/equations in $...$ or $$...$$
2. Regular text, even when referring to formulas, should NOT be in math mode
3. Never wrap entire sentences in math mode

Examples:
- CORRECT: "The quadratic formula is $-\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$."
- INCORRECT: $The quadratic formula is -\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}.$
- CORRECT: "We can solve this using the equation $x^2 + 2x + 1 = 0$."
- INCORRECT: $We can solve this using the equation x^2 + 2x + 1 = 0.$

{your suggestion here}`
      } as SuggestionRequest),
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

const getEditSuggestion = async (
  selectedText: string,
  query: string,
  contextBefore: string,
  contextAfter: string
): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3001/api/edit-suggestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        selectedText,
        query,
        contextBefore,
        contextAfter,
        prompt: `You are editing this text:
-------------------
${contextBefore}<SELECT>${selectedText}</SELECT>${contextAfter}
-------------------

The user wants to: ${query}

Your task is to provide a replacement ONLY for the text between <SELECT> tags.
DO NOT repeat or include any text before or after the <SELECT> tags.
DO NOT include the entire document.
DO NOT include any context.

CRITICAL INSTRUCTIONS:
1. Return ONLY the exact text that should replace "${selectedText}"
2. Your response should be exactly the length of one replacement
3. Do not include any preamble or explanation
4. Do not repeat any text from before or after the selection
5. Preserve correct math mode usage ($...$ for inline, $$...$$ for display)

Example:
If the text is:
-------------------
The solution to ax^2 + bx + c = 0 is given by the <SELECT>quadratic formula</SELECT>, which we use to find roots.
-------------------
And the query is "change to cubic formula"

Your response should be exactly:
cubic formula

Another example:
If the text is:
-------------------
Let's look at the <SELECT>quadratic equation $ax^2 + bx + c = 0$</SELECT> and its properties.
-------------------
And the query is "change to cubic"

Your response should be exactly:
cubic equation $ax^3 + bx^2 + cx + d = 0$

Return ONLY the replacement text:`
      } as EditRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to get edit suggestion');
    }

    const data = await response.json();
    // Remove common preambles and get only the actual replacement text
    let suggestion = data.suggestion.trim();
    
    // Remove any preamble text
    suggestion = suggestion.replace(/^(Here is |The |This is |Updated |Replacement |)?(the |your |updated |new |suggested |replacement |)?(text|version|content|portion|suggestion)( that)?( replaces| for| should be)?[:\s-]*/i, '');
    
    // If the response contains multiple lines and appears to be the full context,
    // try to extract just the replacement part
    if (suggestion.includes(contextBefore) || suggestion.includes(contextAfter)) {
      // Get the last non-empty line as it's likely the actual replacement
      const lines = suggestion.split('\n').filter((line: string) => line.trim());
      suggestion = lines[lines.length - 1];
    }
    
    return suggestion;
  } catch (error) {
    console.error('Error getting edit suggestion:', error);
    return selectedText;
  }
};

const getLatexResponse = async (query: string, content: string): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3001/api/latex-query', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        content,
      } as LatexQueryRequest),
    });

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();
    return data.response;
  } catch (error) {
    console.error('Error getting response:', error);
    return 'Failed to get response. Please try again.';
  }
};

function App() {
  const [text, setText] = useState('')
  const [compiledContent, setCompiledContent] = useState<React.ReactNode[]>([])
  const [suggestion, setSuggestion] = useState<SuggestionState>({
    requestId: '',
    startPosition: 0,
    currentPosition: 0,
    suggestion: null,
    textAtRequest: ''
  })
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const suggestionTimeoutRef = useRef<NodeJS.Timeout | null>(null)  // Fix the type here
  const lastRequestRef = useRef<{
    text: string;
    cursorPosition: number;
  } | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [selectionStart, setSelectionStart] = useState(0);
  const [selectionEnd, setSelectionEnd] = useState(0);
  const [editSuggestion, setEditSuggestion] = useState<EditSuggestionState>({
    isVisible: false,
    suggestion: '',
    start: 0,
    end: 0,
    originalText: ''
  });
  const [isRightFlapOpen, setIsRightFlapOpen] = useState(false);
  const [latexQuery, setLatexQuery] = useState('');
  const [queryResponse, setQueryResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isEditLoading, setIsEditLoading] = useState(false);

  // Update line numbers calculation
  const calculateLineNumbers = () => {
    // Count both explicit newlines and wrapped lines
    const lines = text.split('\n');
    let totalLines = 0;
    
    lines.forEach(line => {
      // Estimate wrapped lines based on character count and editor width
      // Assuming average of 80 characters per line
      const wrappedLines = Math.max(1, Math.ceil(line.length / 80));
      totalLines += wrappedLines;
    });
    
    // Ensure at least one line number
    return Math.max(1, totalLines);
  };

  const lineCount = calculateLineNumbers();
  const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

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
        currentPosition: cursorPosition,
        suggestion: null,
        textAtRequest: newText
      });

      try {
        const { suggestion: suggestedText, textAtRequest, cursorAtRequest } = await getLatexSuggestion(newText, cursorPosition);
        
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
            suggestion: suggestedText,
            currentPosition: cursorPosition
          };
        });
      } catch (error) {
        console.error('Error getting suggestion:', error);
      }
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion.suggestion) {
      e.preventDefault()
      // Get the unmatched part of the suggestion
      const typedPart = text.slice(suggestion.startPosition, suggestion.currentPosition);
      const remainingSuggestion = suggestion.suggestion.slice(typedPart.length);
      
      const newText = text.slice(0, suggestion.currentPosition) + remainingSuggestion + text.slice(suggestion.currentPosition)
      setText(newText)
      setSuggestion({
        requestId: '',
        startPosition: 0,
        currentPosition: 0,
        suggestion: null,
        textAtRequest: ''
      })
      
      // Set cursor position after the inserted suggestion
      const newCursorPosition = suggestion.currentPosition + remainingSuggestion.length
      setTimeout(() => {
        if (textAreaRef.current) {
          textAreaRef.current.selectionStart = newCursorPosition
          textAreaRef.current.selectionEnd = newCursorPosition
        }
      }, 0)
    }

    // Command+K handler
    if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      const textarea = textAreaRef.current;
      if (textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        if (start !== end) {  // Text is selected
          setSelectedText(text.slice(start, end));
          setSelectionStart(start);
          setSelectionEnd(end);
          setIsModalOpen(true);
          // Blur the textarea to prevent accidental deletion
          textarea.blur();
          // Add small delay to ensure modal is rendered before focusing
          setTimeout(() => {
            const modalInput = document.querySelector<HTMLInputElement>('input[type="text"]');
            if (modalInput) {
              modalInput.focus();
            }
          }, 50);
        }
      }
    }

    // Command+L handler
    if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      setIsRightFlapOpen(true);
      setTimeout(() => {
        const queryTextArea = document.querySelector<HTMLTextAreaElement>('#latex-query-textarea');
        if (queryTextArea) {
          queryTextArea.focus();
        }
      }, 100);
      return;
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
    const afterText = text.slice(suggestion.currentPosition);
    
    // Get the text that's been typed after the suggestion started
    const typedPart = text.slice(suggestion.startPosition, suggestion.currentPosition);

    // Check if the typed part matches the start of the suggestion
    if (!suggestion.suggestion.startsWith(typedPart)) {
      return text;  // If it doesn't match, don't show suggestion
    }

    // Get the remaining part of the suggestion
    const remainingSuggestion = suggestion.suggestion.slice(typedPart.length);

    // Always treat as if we're in the middle of a line if there's text after the cursor
    const hasTextAfter = afterText.trim().length > 0;

    if (hasTextAfter) {
      // If there's text after, always show suggestion on new line and shift following text down
      return (
        <>
          {beforeText}
          {'\n'}
          <MatchedText>{typedPart}</MatchedText>
          {remainingSuggestion && <UnmatchedText>{remainingSuggestion}</UnmatchedText>}
          {'\n'}
          {afterText}
        </>
      );
    }

    // If we're at the end of a line or in an empty line, show inline
    return (
      <>
        {beforeText}
        <MatchedText>{typedPart}</MatchedText>
        {remainingSuggestion && <UnmatchedText>{remainingSuggestion}</UnmatchedText>}
        {afterText}
      </>
    );
  };

  // Helper function to get cursor coordinates
  const getCursorCoordinates = (textarea: HTMLTextAreaElement, position: number) => {
    // Create a div to measure text
    const div = document.createElement('div');
    div.style.cssText = window.getComputedStyle(textarea, null).cssText;
    div.style.height = 'auto';
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap';
    
    // Add text up to cursor position
    div.textContent = textarea.value.substring(0, position);
    
    // Create a span for cursor position
    const span = document.createElement('span');
    span.textContent = '.';
    div.appendChild(span);
    
    document.body.appendChild(div);
    const coords = {
      top: span.offsetTop - textarea.scrollTop,
      left: span.offsetLeft - textarea.scrollLeft,
    };
    document.body.removeChild(div);
    
    return coords;
  };

  const handleEditQuerySubmit = async () => {
    if (!selectedText || !query) return;

    setIsEditLoading(true);
    const contextBefore = text.slice(0, selectionStart);
    const contextAfter = text.slice(selectionEnd);

    try {
      const updatedText = await getEditSuggestion(
        selectedText,
        query,
        contextBefore,
        contextAfter
      );

      setEditSuggestion({
        isVisible: true,
        suggestion: updatedText,
        start: selectionStart,
        end: selectionEnd,
        originalText: selectedText
      });
    } catch (error) {
      console.error('Error getting edit suggestion:', error);
    } finally {
      setIsEditLoading(false);
      setIsModalOpen(false);
      setQuery('');
    }
  };

  const handleLatexQuerySubmit = async () => {
    if (!latexQuery.trim()) return;
    
    const currentQuery = latexQuery;
    setLatexQuery(''); // Clear input immediately
    setIsLoading(true);

    // Add user message to chat
    const userMessageId = Date.now().toString();
    setChatHistory(prev => [...prev, {
      id: userMessageId,
      type: 'user',
      content: currentQuery
    }]);

    try {
      const response = await getLatexResponse(currentQuery, text);
      
      // Add assistant response to chat
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response
      }]);
    } catch (error) {
      console.error('Error:', error);
      // Add error message to chat
      setChatHistory(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: 'Failed to get response. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptSuggestion = () => {
    const newText = text.slice(0, editSuggestion.start) + editSuggestion.suggestion + text.slice(editSuggestion.end);
    setText(newText);
    setEditSuggestion(prev => ({ ...prev, isVisible: false }));
  };

  const handleDeclineSuggestion = () => {
    setEditSuggestion(prev => ({ ...prev, isVisible: false }));
  };

  const renderTextWithSuggestion = () => {
    if (!editSuggestion.isVisible) {
      return text;
    }

    return (
      <>
        {text.slice(0, editSuggestion.start)}
        <HighlightedText>{editSuggestion.originalText}</HighlightedText>
        {text.slice(editSuggestion.end)}
        <SuggestionContainer>
          <SuggestionActions>
            <AcceptButton className="primary" onClick={handleAcceptSuggestion}>
              Accept
            </AcceptButton>
            <DeclineButton className="secondary" onClick={handleDeclineSuggestion}>
              Decline
            </DeclineButton>
          </SuggestionActions>
          <div style={{ margin: '8px 0', borderLeft: '2px solid #007bff', paddingLeft: '8px' }}>
            {editSuggestion.suggestion}
          </div>
        </SuggestionContainer>
      </>
    );
  };

  return (
    <Container>
      <Header>
        <Logo>LatexAI</Logo>
      </Header>
      <MainContent>
        <EditorPane>
          <EditorContainer>
            <LineNumbers>
              {lineNumbers.map(num => (
                <div key={num}>{num}</div>
              ))}
            </LineNumbers>
            <TextArea
              ref={textAreaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter text and LaTeX math (use $ for inline math and $$ for block math)..."
            />
            <SuggestionOverlay>
              {editSuggestion.isVisible ? renderTextWithSuggestion() : getSuggestionOverlayContent()}
            </SuggestionOverlay>
          </EditorContainer>
          <CompileButton onClick={handleCompile}>
            Compile
          </CompileButton>
        </EditorPane>
        <PreviewPane>
          {compiledContent}
        </PreviewPane>
      </MainContent>
      
      <Modal isOpen={isModalOpen} onClick={(e) => e.stopPropagation()}>
        <ModalContent>
          {isEditLoading && (
            <LoadingOverlay>
              <LoadingSpinner />
            </LoadingOverlay>
          )}
          <QueryInput
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What changes would you like to make to the selected text?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleEditQuerySubmit();
              } else if (e.key === 'Escape') {
                setIsModalOpen(false);
              }
            }}
          />
          <ButtonGroup>
            <Button 
              className="secondary" 
              onClick={() => setIsModalOpen(false)}
              disabled={isEditLoading}
            >
              Cancel
            </Button>
            <Button 
              className="primary" 
              onClick={handleEditQuerySubmit}
              disabled={isEditLoading}
            >
              {isEditLoading ? 'Applying...' : 'Apply Changes'}
            </Button>
          </ButtonGroup>
        </ModalContent>
      </Modal>

      <RightFlap isOpen={isRightFlapOpen}>
        <FlapHeader>
          <FlapTitle>LaTeX Assistant</FlapTitle>
          <CloseButton onClick={() => setIsRightFlapOpen(false)}>&times;</CloseButton>
        </FlapHeader>
        <ChatHistory>
          {chatHistory.map(message => (
            <Message key={message.id} type={message.type}>
              {message.type === 'assistant' ? (
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                  components={{
                    code: ({ children, className, ...props }) => {
                      if (className?.includes('language-')) {
                        return (
                          <pre>
                            <code className={className} {...props}>
                              {children}
                            </code>
                          </pre>
                        );
                      }
                      return <code {...props}>{children}</code>;
                    }
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </Message>
          ))}
        </ChatHistory>
        <ComposerArea>
          <QueryTextArea
            id="latex-query-textarea"
            value={latexQuery}
            onChange={(e) => setLatexQuery(e.target.value)}
            placeholder="Ask a question about your LaTeX document..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                if (e.shiftKey) {
                  // Allow shift+enter for newline
                  return;
                }
                e.preventDefault();
                handleLatexQuerySubmit();
              }
            }}
          />
          <Button className="primary" onClick={handleLatexQuerySubmit} disabled={isLoading}>
            {isLoading ? 'Loading...' : 'Ask Question'}
          </Button>
        </ComposerArea>
      </RightFlap>
    </Container>
  )
}

export default App
