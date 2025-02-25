import styled from 'styled-components';

export const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f8f9fa;
`;

export const Header = styled.header`
  background-color: #1a1a1a;
  color: white;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

export const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

export const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const Logo = styled.h1`
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #61dafb;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

export const MainContent = styled.div`
  display: flex;
  flex: 1;
  padding: 24px;
  gap: 24px;
  overflow: hidden;
`;

export const EditorPane = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  position: relative;
  min-width: 0;
`;

export const PreviewPane = styled.div`
  flex: 1;
  padding: 24px;
  background-color: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow-y: auto;
  line-height: 1.6;
  font-size: 16px;
  min-width: 0;
  position: relative;
`;

export const EditorContainer = styled.div`
  position: relative;
  flex: 1;
  border-radius: 12px;
  background-color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  overflow: hidden;
`;

export const TextArea = styled.textarea`
  width: 100%;
  height: 100%;
  padding: 15px;
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
`;

export const SuggestionOverlay = styled.div`
  width: 100%;
  height: 100%;
  padding: 15px;
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
  overflow-y: auto;
  white-space: pre-wrap;
  pointer-events: none;
  color: transparent;  /* Make the duplicate text invisible */
  
  /* Make sure the overlay scrolls with the textarea */
  &::-webkit-scrollbar {
    display: none;
  }
  -ms-overflow-style: none;
  scrollbar-width: none;
  
  /* Enable pointer events for specific elements and ensure they have visible text */
  span[class*="Highlighted"], div[class*="Suggestion"], button {
    pointer-events: auto;
    color: initial; /* Reset color to make text visible */
  }
`;

export const MatchedText = styled.span`
  color: #000;
  background: transparent;
`;

export const UnmatchedText = styled.span`
  color: #aaa;
  background: transparent;
`;

export const SuggestionContent = styled.div<{ indent: number }>`
  position: absolute;
  top: ${(props: { indent: number }) => props.indent}px;
  left: 15px;
  right: 15px;
  white-space: pre-wrap;
`;

export const CompileButton = styled.button`
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
`;

export const SuggestionBox = styled.div`
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
`;

export const ContextText = styled.div`
  color: #6c757d;
  opacity: 0.8;
  padding: 2px 0;
`;

export const SuggestionText = styled.div`
  color: #007bff;
  padding: 4px 0;
  border-left: 2px solid #007bff;
  margin-left: 4px;
  padding-left: 8px;
`;

export const Modal = styled.div<{ isOpen: boolean }>`
  display: ${(props: { isOpen: boolean }) => props.isOpen ? 'flex' : 'none'};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

export const InlineModal = styled.div<{ isOpen: boolean; top: number; left: number }>`
  display: ${(props: { isOpen: boolean }) => props.isOpen ? 'block' : 'none'};
  position: absolute;
  top: ${(props: { top: number }) => props.top}px;
  left: ${(props: { left: number }) => props.left}px;
  z-index: 1000;
  max-width: 90%;
  transform: translateY(-100%);
  margin-top: -10px;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
  
  &:after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 20px;
    border-width: 10px 10px 0;
    border-style: solid;
    border-color: white transparent transparent;
  }
`;

export const InlineModalContent = styled.div`
  background-color: white;
  padding: 15px;
  border-radius: 8px;
  width: 350px;
`;

export const ModalContent = styled.div`
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  width: 500px;
  max-width: 90%;
`;

export const QueryInput = styled.input`
  width: 100%;
  padding: 10px;
  font-size: 16px;
  border: 1px solid #ddd;
  border-radius: 4px;
  margin-bottom: 10px;
`;

export const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 10px;
`;

export const Button = styled.button`
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
`;

export const HighlightedText = styled.span`
  background-color: #e3f2fd;
  border-radius: 2px;
  position: relative;
  display: inline-block;
  color: #333; /* Ensure text is visible */
`;

export const SuggestionContainer = styled.div`
  position: absolute;
  top: calc(100% + 10px);
  left: 0;
  min-width: 300px;
  max-width: 500px;
  padding: 12px;
  background-color: #ffffff;
  border: 1px solid #e9ecef;
  border-radius: 4px;
  font-family: monospace;
  z-index: 100;
  pointer-events: auto;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  color: #333;
  
  &:before {
    content: '';
    position: absolute;
    top: -8px;
    left: 15px;
    width: 0;
    height: 0;
    border-left: 8px solid transparent;
    border-right: 8px solid transparent;
    border-bottom: 8px solid #ffffff;
    filter: drop-shadow(0 -2px 2px rgba(0, 0, 0, 0.03));
  }
`;

export const SuggestionActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 8px;
  z-index: 3;
  pointer-events: auto;
  color: initial; /* Ensure text is visible */
  
  button {
    pointer-events: auto;
    cursor: pointer;
    color: white; /* Ensure button text is visible */
  }
`;

export const AcceptButton = styled(Button)`
  &.primary {
    background-color: #28a745;
    &:hover {
      background-color: #218838;
    }
  }
`;

export const DeclineButton = styled(Button)`
  &.secondary {
    background-color: #dc3545;
    &:hover {
      background-color: #c82333;
    }
  }
`;

export const RightFlap = styled.div<{ isOpen: boolean }>`
  position: fixed;
  top: 0;
  right: ${(props: { isOpen: boolean }) => props.isOpen ? '0' : '-500px'};
  width: 500px;
  height: 100vh;
  background-color: white;
  box-shadow: -2px 0 5px rgba(0, 0, 0, 0.1);
  transition: right 0.3s ease;
  z-index: 1000;
  display: flex;
  flex-direction: column;
`;

export const FlapHeader = styled.div`
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

export const FlapTitle = styled.h2`
  margin: 0;
  font-size: 18px;
  color: #333;
`;

export const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #666;
  
  &:hover {
    color: #333;
  }
`;

export const ChatHistory = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
  overflow-y: auto;
`;

export const Message = styled.div<{ type: 'user' | 'assistant' }>`
  max-width: ${(props: { type: 'user' | 'assistant' }) => props.type === 'user' ? '85%' : '95%'};
  ${(props: { type: 'user' | 'assistant' }) => props.type === 'user' ? 'margin-left: auto;' : 'margin: 0 12px;'}
  padding: 12px 16px;
  border-radius: 12px;
  ${(props: { type: 'user' | 'assistant' }) => props.type === 'user' 
    ? 'background-color: #007bff; color: white;' 
    : 'background-color: #f8f9fa; border: 1px solid #e9ecef;'}
  
  pre {
    background-color: ${(props: { type: 'user' | 'assistant' }) => props.type === 'user' ? '#0056b3' : '#f1f1f1'};
    border-radius: 4px;
    padding: 8px;
    overflow-x: auto;
  }

  code {
    background-color: ${(props: { type: 'user' | 'assistant' }) => props.type === 'user' ? '#0056b3' : '#f1f1f1'};
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
`;

export const ComposerArea = styled.div`
  display: flex;
  flex-direction: column;
  padding: 20px;
  gap: 12px;
  border-top: 1px solid #e9ecef;
  background-color: white;
`;

export const QueryTextArea = styled.textarea`
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
`;

export const ResponseArea = styled.div`
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
`;

export const LoadingOverlay = styled.div`
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
`;

export const LoadingSpinner = styled.div`
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
`;

export const PDFViewer = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

export const ErrorMessage = styled.div`
  color: #dc3545;
  padding: 15px;
  margin: 10px 0;
  background-color: #f8d7da;
  border: 1px solid #f5c6cb;
  border-radius: 4px;
`;

export const DownloadButton = styled.button`
  position: absolute;
  bottom: 24px;
  right: 24px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background-color: #4CAF50;
  color: white;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  transition: all 0.2s;
  opacity: ${(props: { disabled?: boolean }) => props.disabled ? 0.5 : 1};
  pointer-events: ${(props: { disabled?: boolean }) => props.disabled ? 'none' : 'auto'};

  &:hover {
    background-color: #45a049;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }

  &:active {
    transform: translateY(0);
  }

  svg {
    width: 24px;
    height: 24px;
  }
`; 