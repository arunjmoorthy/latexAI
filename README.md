# LaTeX Copilot

An AI-powered LaTeX editor with real-time suggestions, PDF compilation, and intelligent editing capabilities.

## Features

- **Real-time LaTeX Suggestions**: Get intelligent autocompletions as you type
- **PDF Compilation**: Compile your LaTeX documents to PDF with a single click
- **Smart Editing**: Select text and use AI to edit or improve it
- **LaTeX Assistant**: Ask questions about LaTeX and get helpful responses
- **Modern UI**: Clean, intuitive interface with dark mode support

## Project Structure

The project consists of two main parts:

1. **Frontend** (`latex-editor/`): React application with the editor interface
2. **Backend** (`latex-editor-backend/`): Node.js server handling AI requests and LaTeX compilation

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- pdfLaTeX installed on your system
- GROQ API key for AI capabilities

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/latex-copilot.git
   cd latex-copilot
   ```

2. Install dependencies for all components:
   ```
   npm run install-all
   ```

3. Create a `.env` file in the `latex-editor-backend` directory:
   ```
   GROQ_API_KEY=your_groq_api_key_here
   PORT=3001
   ```

## Running the Application

Start both the frontend and backend with a single command:

```
npm start
```

- Frontend will be available at: http://localhost:3000
- Backend will be running at: http://localhost:3001

## Usage

1. **Writing LaTeX**: Type in the editor pane and use Tab to accept suggestions
2. **Compiling**: Click the "Compile" button to generate a PDF
3. **Editing Text**: Select text and press Cmd+K (or Ctrl+K) to edit with AI
4. **Getting Help**: Press Cmd+L (or Ctrl+L) to open the LaTeX Assistant

## License

MIT
