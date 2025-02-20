import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface SuggestionRequest {
  text: string;
  cursorPosition: number;
}

interface SuggestionResponse {
  suggestion: string;
  textAtRequest: string;
  cursorAtRequest: number;
}

interface MathModeInfo {
  inMathMode: boolean;
  isInline: boolean;
  mathContent: string;
  mathStart: number;
}

function detectMathMode(text: string, cursorPosition: number): MathModeInfo {
  // Look backwards from cursor to find the last unmatched $ or $$
  let i = cursorPosition - 1;
  let dollarCount = 0;
  let mathStart = -1;
  
  while (i >= 0) {
    if (text[i] === '$') {
      // Check if it's $$ by looking at previous character
      if (i > 0 && text[i - 1] === '$') {
        if (mathStart === -1) {
          mathStart = i - 1;
          dollarCount = 2;
        } else {
          // Found matching $$ before cursor
          return {
            inMathMode: false,
            isInline: false,
            mathContent: '',
            mathStart: -1
          };
        }
        i--; // Skip the second $
      } else {
        if (mathStart === -1) {
          mathStart = i;
          dollarCount = 1;
        } else {
          // Found matching $ before cursor
          return {
            inMathMode: false,
            isInline: false,
            mathContent: '',
            mathStart: -1
          };
        }
      }
    }
    i--;
  }

  // If we found a math start and haven't found its end
  if (mathStart !== -1) {
    const mathContent = text.slice(mathStart + dollarCount, cursorPosition);
    return {
      inMathMode: true,
      isInline: dollarCount === 1,
      mathContent,
      mathStart
    };
  }

  return {
    inMathMode: false,
    isInline: false,
    mathContent: '',
    mathStart: -1
  };
}

app.post('/api/latex-suggestion', async (req: Request<{}, {}, SuggestionRequest>, res: Response) => {
  try {
    const { text, cursorPosition } = req.body;
    const suggestion = await LLMSuggestion(text, cursorPosition);
    res.json({
      suggestion: suggestion,
      textAtRequest: text,
      cursorAtRequest: cursorPosition
    });
  } catch (error) {
    console.error('Error getting suggestion:', error);
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

async function LLMSuggestion(text: string, cursorPosition: number): Promise<string> {
  // Get only the relevant context before the cursor (last 100 characters)
  const contextWindow = 100;
  const start = Math.max(0, cursorPosition - contextWindow);
  const textUpToCursor = text.slice(start, cursorPosition);
  
  // If there's no content, don't suggest
  if (!textUpToCursor.trim()) return '';

  const mathMode = detectMathMode(text, cursorPosition);

  // Count unclosed braces in math content
  let openBraces = 0;
  if (mathMode.inMathMode) {
    for (const char of mathMode.mathContent) {
      if (char === '{') openBraces++;
      if (char === '}') openBraces--;
    }
  }

  // Check if the text after cursor contains similar content
  const nextChars = text.slice(cursorPosition, cursorPosition + 50);
  const lastWord = textUpToCursor.split(/[\s{}$]+/).pop() || '';
  
  // Check if we need a space before the suggestion
  const lastChar = textUpToCursor.slice(-1);
  const needsSpace = lastChar && lastChar !== ' ' && lastChar !== '\n' && lastChar !== '{' && lastChar !== '\\';

  const mathModeCommands = `Commands that MUST be in math mode ($...$ or $$...$$):
- Any numbers or mathematical operations (+, -, *, /, =, etc.)
- \\texttt when containing numbers, symbols, or technical identifiers (e.g., $\\texttt{SHA-256}$)
- All subscripts and superscripts (_x, ^2)
- Mathematical symbols (\\alpha, \\beta, \\sum, \\prod, etc.)
- Fractions (\\frac{}{})
- Matrices and arrays
- Equation environments
- Any mathematical expressions or identifiers

Commands that can be used outside math mode:
- \\textit for plain text
- \\textbf for plain text
- \\emph
- \\section, \\subsection
- \\begin{itemize}, \\begin{enumerate}
- Text formatting without mathematical content

IMPORTANT SPACING RULES:
1. If the text before your suggestion ends with a letter, number, or punctuation (like a period), START your suggestion with a space.
2. Do NOT start with a space if the text ends with a space, newline, opening brace, or backslash.
3. Do NOT add extra spaces if your suggestion starts with $, \\, or {.

IMPORTANT COMPLETION RULES:
1. The user has already typed: "${textUpToCursor}"
2. ONLY provide the remaining part of the text/expression
3. NEVER repeat what the user has already written
4. Start your completion from where the cursor is

Current text ends with: "${lastChar}"
Space needed: ${needsSpace}`;

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini-2024-07-18",
        messages: [
          {
            role: "system",
            content: mathMode.inMathMode
              ? `You are a LaTeX math assistant. The user is currently writing ${mathMode.isInline ? 'inline' : 'display'} math between ${mathMode.isInline ? 'single $' : 'double $$'} delimiters. Rules:
1. Complete the mathematical expression including ALL closing delimiters.
2. If there are unclosed braces '{', include the matching '}'.
3. For inline math ($...$), make sure to end with a single $.
4. For display math ($$...$$), make sure to end with $$.
5. Never include explanatory text, only the completion.
6. Never repeat text that's already written.
7. Focus on completing the current expression.
8. ONLY provide the remaining part, starting from the cursor position.
9. If no meaningful completion is possible, return an empty string.

Current number of unclosed braces: ${openBraces}
Text already written: "${mathMode.mathContent}"`
              : `You are a LaTeX text assistant. The user is currently writing in text mode (not between $ signs). Rules:
1. Suggest only text mode LaTeX commands or regular text.
2. If suggesting a command that uses braces (like \\section{...}), always include the closing brace.
3. If suggesting an environment, always include both \\begin and \\end.
4. Never repeat text that's already written.
5. Focus on completing the current sentence or command.
6. ONLY provide the remaining part, starting from the cursor position.
7. If no meaningful completion is possible, return an empty string.
8. IMPORTANT: Some commands must be wrapped in math mode delimiters. Follow these rules:

${mathModeCommands}`
          },
          {
            role: "user",
            content: mathMode.inMathMode
              ? `Complete this LaTeX math expression, providing ONLY the part that comes after: ${mathMode.mathContent}`
              : `Complete this text, providing ONLY the part that comes after: ${textUpToCursor}`
          }
        ],
        temperature: 0.3,
        max_tokens: 100,
        stream: false
      },
      {
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let suggestion = response.data.choices[0].message.content.trim();
    
    // Clean up the suggestion
    suggestion = suggestion.replace(/`/g, '').replace(/"/g, '').replace(/'/g, '');

    // Don't suggest if it's just repeating the last word or if the suggestion appears in next 50 chars
    if (suggestion === lastWord || nextChars.includes(suggestion)) {
      return '';
    }

    // If we're not in math mode and the suggestion contains commands that require math mode,
    // wrap the suggestion in math delimiters
    if (!mathMode.inMathMode) {
      const requiresMathMode = (text: string): boolean => {
        const patterns = [
          /\\texttt\{[^}]*[0-9_^\\]/, // texttt with numbers, subscripts, or commands
          /[0-9]+/,                    // numbers
          /[+\-*/=]/,                  // mathematical operators
          /\\(?:alpha|beta|gamma|delta|sum|prod|frac|sqrt)/, // math commands
          /[_^]/                       // subscripts and superscripts
        ];
        return patterns.some(pattern => pattern.test(text));
      };

      if (requiresMathMode(suggestion)) {
        suggestion = `$${suggestion}$`;
      }
    }

    // Add space before suggestion if needed and suggestion doesn't start with special characters
    if (needsSpace && !suggestion.match(/^[$\\{]/)) {
      suggestion = ' ' + suggestion;
    }

    // Remove any part that repeats the existing text
    const existingText = textUpToCursor.toLowerCase();
    const suggestionLower = suggestion.toLowerCase();
    if (suggestionLower.startsWith(existingText)) {
      suggestion = suggestion.slice(existingText.length);
    }

    return suggestion;
  } catch (error) {
    console.error('OpenAI API error:', error);
    return '';
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 