import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { ChatMessage } from '../types';
import { getLatexResponse } from '../services/api';
import { 
  RightFlap, 
  FlapHeader, 
  FlapTitle, 
  CloseButton, 
  ChatHistory, 
  Message, 
  ComposerArea, 
  QueryTextArea, 
  Button 
} from '../styles/StyledComponents';

interface LatexAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  content: string;
}

const LatexAssistant: React.FC<LatexAssistantProps> = ({ isOpen, onClose, content }) => {
  const [latexQuery, setLatexQuery] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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
      const response = await getLatexResponse(currentQuery, content);
      
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

  return (
    <RightFlap isOpen={isOpen}>
      <FlapHeader>
        <FlapTitle>LaTeX Assistant</FlapTitle>
        <CloseButton onClick={onClose}>&times;</CloseButton>
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
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLatexQuery(e.target.value)}
          placeholder="Ask a question about your LaTeX document..."
          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
  );
};

export default LatexAssistant; 