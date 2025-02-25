import { useState, useRef, useEffect } from 'react'
import 'katex/dist/katex.min.css'
import { SuggestionState, EditSuggestionState } from './types'
import { compileLaTeX, getEditSuggestion } from './services/api'
import { downloadPDF } from './utils/pdfUtils'
import { 
  Container, 
  Header, 
  Logo, 
  MainContent, 
  EditorPane, 
  CompileButton, 
  ErrorMessage,
  HighlightedText,
  SuggestionContainer,
  SuggestionActions,
  AcceptButton,
  DeclineButton,
  Modal,
  ModalContent
} from './styles/StyledComponents'
import Editor from './components/Editor'
import Preview from './components/Preview'
import EditModal from './components/EditModal'
import LatexAssistant from './components/LatexAssistant'

function App() {
  // State for text and compilation
  const [text, setText] = useState('')
  const [compiledText, setCompiledText] = useState('')
  const [pdfData, setPdfData] = useState<string | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [isCompiling, setIsCompiling] = useState(false)
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)
  
  // State for suggestions
  const [suggestion, setSuggestion] = useState<SuggestionState>({
    requestId: '',
    startPosition: 0,
    currentPosition: 0,
    suggestion: null,
    textAtRequest: ''
  })
  
  // State for edit suggestions
  const [editSuggestion, setEditSuggestion] = useState<EditSuggestionState>({
    isVisible: false,
    suggestion: '',
    start: 0,
    end: 0,
    originalText: ''
  })
  const [isEditLoading, setIsEditLoading] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [selectionStart, setSelectionStart] = useState(0)
  const [selectionEnd, setSelectionEnd] = useState(0)
  
  // State for LaTeX assistant
  const [isRightFlapOpen, setIsRightFlapOpen] = useState(false)
  
  // Refs
  const textAreaRef = useRef<HTMLTextAreaElement>(null)
  const editorRef = useRef<HTMLDivElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab' && suggestion.suggestion) {
      e.preventDefault()
      // Get the unmatched part of the suggestion
      const typedPart = text.slice(suggestion.startPosition, suggestion.currentPosition)
      const remainingSuggestion = suggestion.suggestion.slice(typedPart.length)
      
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
      e.preventDefault()
      const textarea = textAreaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        if (start !== end) {  // Text is selected
          setSelectedText(text.slice(start, end))
          setSelectionStart(start)
          setSelectionEnd(end)
          setIsModalOpen(true)
        }
      }
    }

    // Command+L handler
    if (e.key === 'l' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      setIsRightFlapOpen(true)
      setTimeout(() => {
        const queryTextArea = document.querySelector<HTMLTextAreaElement>('#latex-query-textarea')
        if (queryTextArea) {
          queryTextArea.focus()
        }
      }, 100)
      return
    }
  }

  const handleCompile = () => {
    // Just update the preview text without generating PDF
    setIsCompiling(true)
    setCompileError(null)
    
    try {
      setCompiledText(text)
    } catch (error) {
      console.error('Compilation error:', error)
      setCompileError('Failed to compile LaTeX document. Please check your syntax.')
    } finally {
      setIsCompiling(false)
    }
  }

  const handleGeneratePDF = async () => {
    try {
      setIsGeneratingPDF(true)
      setCompileError(null)
      const pdfBase64 = await compileLaTeX(text)
      setPdfData(pdfBase64)
      downloadPDF(pdfBase64)
    } catch (error) {
      console.error('PDF generation error:', error)
      setCompileError('Failed to generate PDF. Please check your LaTeX syntax.')
    } finally {
      setIsGeneratingPDF(false)
    }
  }

  const handleEditQuerySubmit = async (query: string) => {
    if (!selectedText || !query) return

    setIsEditLoading(true)
    const contextBefore = text.slice(0, selectionStart)
    const contextAfter = text.slice(selectionEnd)

    try {
      const updatedText = await getEditSuggestion(
        selectedText,
        query,
        contextBefore,
        contextAfter
      )

      console.log('Received suggestion:', updatedText)
      
      // Check if the suggestion is incomplete (ends without proper punctuation)
      const isIncomplete = /[a-zA-Z0-9,;:]$/.test(updatedText) && !updatedText.endsWith('.');
      
      // If the suggestion is empty, the same as the original text, or incomplete, provide a default message
      let finalSuggestion;
      if (!updatedText || updatedText === selectedText) {
        finalSuggestion = "No changes suggested. Try a different query.";
      } else if (isIncomplete) {
        finalSuggestion = "Received incomplete suggestion. Please try again with a more specific query.";
      } else {
        finalSuggestion = updatedText;
      }

      setEditSuggestion({
        isVisible: true,
        suggestion: finalSuggestion,
        start: selectionStart,
        end: selectionEnd,
        originalText: selectedText
      })
    } catch (error) {
      console.error('Error getting edit suggestion:', error)
      setEditSuggestion({
        isVisible: true,
        suggestion: "Error getting suggestion. Please try again.",
        start: selectionStart,
        end: selectionEnd,
        originalText: selectedText
      })
    } finally {
      setIsEditLoading(false)
      setIsModalOpen(false) // Close the modal after getting the suggestion
    }
  }

  const handleAcceptSuggestion = () => {
    const newText = text.slice(0, editSuggestion.start) + editSuggestion.suggestion + text.slice(editSuggestion.end)
    setText(newText)
    setEditSuggestion(prev => ({ ...prev, isVisible: false }))
  }

  const handleDeclineSuggestion = () => {
    setEditSuggestion(prev => ({ ...prev, isVisible: false }))
  }

  const renderTextWithSuggestion = () => {
    if (!editSuggestion.isVisible) {
      return null
    }

    return (
      <>
        {text.slice(0, editSuggestion.start)}
        <HighlightedText>
          {editSuggestion.originalText}
          <SuggestionContainer>
            <div style={{ 
              borderLeft: '2px solid #007bff', 
              paddingLeft: '8px',
              marginBottom: '8px',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#333', /* Ensure text is visible */
              fontWeight: 'normal'
            }}>
              {editSuggestion.suggestion || "No suggestion available"}
            </div>
            <SuggestionActions>
              <AcceptButton className="primary" onClick={handleAcceptSuggestion}>
                Accept
              </AcceptButton>
              <DeclineButton className="secondary" onClick={handleDeclineSuggestion}>
                Decline
              </DeclineButton>
            </SuggestionActions>
          </SuggestionContainer>
        </HighlightedText>
        {text.slice(editSuggestion.end)}
      </>
    )
  }

  return (
    <Container>
      <Header>
        <Logo>LatexAI</Logo>
      </Header>
      <MainContent>
        <EditorPane ref={editorRef}>
          <Editor
            text={text}
            setText={setText}
            onKeyDown={handleKeyDown}
            suggestion={suggestion}
            setSuggestion={setSuggestion}
            editSuggestionContent={renderTextWithSuggestion()}
            textAreaRef={textAreaRef}
          />
          <CompileButton onClick={handleCompile} disabled={isCompiling}>
            {isCompiling ? 'Compiling...' : 'Preview'}
          </CompileButton>
          {compileError && <ErrorMessage>{compileError}</ErrorMessage>}
        </EditorPane>
        <Preview
          compiledText={compiledText}
          pdfData={null} // Always pass null to prevent showing PDF directly
          onDownload={handleGeneratePDF}
          isGeneratingPDF={isGeneratingPDF}
          showDownloadButton={compiledText.length > 0}
        />
      </MainContent>
      
      {/* Only show the modal for entering the query */}
      <Modal isOpen={isModalOpen} onClick={(e) => e.stopPropagation()}>
        <ModalContent>
          <EditModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSubmit={handleEditQuerySubmit}
            isLoading={isEditLoading}
          />
        </ModalContent>
      </Modal>

      <LatexAssistant
        isOpen={isRightFlapOpen}
        onClose={() => setIsRightFlapOpen(false)}
        content={text}
      />
    </Container>
  )
}

export default App
