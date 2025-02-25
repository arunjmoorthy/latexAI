import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { PreviewPane, PDFViewer, DownloadButton, LoadingSpinner } from '../styles/StyledComponents';

interface PreviewProps {
  compiledText: string;
  pdfData: string | null;
  onDownload: () => void;
  isGeneratingPDF?: boolean;
  showDownloadButton?: boolean;
}

const Preview: React.FC<PreviewProps> = ({ 
  compiledText, 
  pdfData, 
  onDownload, 
  isGeneratingPDF = false,
  showDownloadButton = false
}) => {
  return (
    <PreviewPane>
      {pdfData ? (
        <>
          <PDFViewer 
            src={`data:application/pdf;base64,${pdfData}`} 
            title="PDF Preview"
          />
          <DownloadButton 
            onClick={onDownload}
            title="Download PDF"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </DownloadButton>
        </>
      ) : (
        compiledText ? (
          <>
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
              {compiledText}
            </ReactMarkdown>
            
            {showDownloadButton && (
              <DownloadButton 
                onClick={onDownload}
                title="Generate and Download PDF"
                disabled={isGeneratingPDF}
              >
                {isGeneratingPDF ? (
                  <LoadingSpinner style={{ width: '20px', height: '20px' }} />
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                )}
              </DownloadButton>
            )}
          </>
        ) : (
          <div style={{ color: '#6c757d', textAlign: 'center', marginTop: '40px' }}>
            <p>Click the "Preview" button to see your LaTeX document.</p>
            <p>Your compiled document will appear here.</p>
          </div>
        )
      )}
    </PreviewPane>
  );
};

export default Preview; 