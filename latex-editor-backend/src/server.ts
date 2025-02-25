import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Groq from 'groq-sdk';
import os from 'os';

dotenv.config();

if (!process.env.GROQ_API_KEY) {
  throw new Error('GROQ_API_KEY is not defined in environment variables');
}

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface SuggestionRequest {
  text: string;
  cursorPosition: number;
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

interface CompileRequest {
  content: string;
}

const execAsync = promisify(exec);

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

app.post('/api/edit-suggestion', async (req: Request<{}, {}, EditRequest>, res: Response) => {
  try {
    const { selectedText, query, contextBefore, contextAfter } = req.body;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a LaTeX editing assistant. Your task is to help modify LaTeX text while maintaining proper math mode usage and ensuring changes are coherent with the surrounding context.

IMPORTANT RULES FOR MATH MODE:
1. Only wrap the actual mathematical expressions/equations in $...$ or $$...$$
2. Regular text, even when referring to formulas, should NOT be in math mode
3. Never wrap entire sentences in math mode
4. Preserve existing math mode delimiters unless explicitly asked to change them

RESPONSE REQUIREMENTS:
1. Provide COMPLETE responses - never leave sentences unfinished
2. Always end your response with proper punctuation
3. Make sure your response is self-contained and makes sense on its own
4. If you're explaining a concept, provide a complete explanation
5. If you're providing an example, make sure it's complete

Examples:
- CORRECT: "The quadratic formula is $-\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$."
- INCORRECT: $The quadratic formula is -\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}.$
- CORRECT: "We can solve this using the equation $x^2 + 2x + 1 = 0$."
- INCORRECT: $We can solve this using the equation x^2 + 2x + 1 = 0.$`
        },
        {
          role: "user",
          content: `Given this LaTeX text with the selected portion marked between <selection> tags:
${contextBefore}<selection>${selectedText}</selection>${contextAfter}

The user wants to: ${query}

Please provide the complete updated text that should replace the selection.
Make sure to:
1. Only modify the selected portion unless the change requires minimal adjustments
2. Ensure the changes are coherent with the surrounding context
3. Follow the math mode rules strictly
4. Provide a COMPLETE response - never leave sentences or explanations unfinished
5. End your response with proper punctuation`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const suggestion = response.choices[0]?.message?.content?.trim() || selectedText;
    res.json({ suggestion });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get suggestion' });
  }
});

app.post('/api/latex-query', async (req: Request<{}, {}, LatexQueryRequest>, res: Response) => {
  try {
    const { query, content } = req.body;

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a LaTeX, math, and science expert assistant. Your task is to help users understand and work with LaTeX documents.

RESPONSE FORMAT:
1. Always format your responses in markdown
2. Use backticks (\`) for inline code
3. Use triple backticks (\`\`\`) for code blocks
4. Use asterisks (*) for emphasis
5. Use double asterisks (**) for strong emphasis
6. Use proper markdown headers (# for main headers, ## for subheaders, etc.)
7. For mathematical expressions:
   - Use $...$ for inline math
   - Use $$...$$ for display math
8. Use proper markdown lists (-, *, or numbers)
9. Use > for blockquotes
10. Use proper line breaks between sections

CONTENT GUIDELINES:
1. Answer questions about the content and structure of LaTeX documents
2. Explain mathematical concepts and notation used in the document
3. Suggest improvements or point out potential issues
4. Provide clear, concise explanations with examples when helpful`
        },
        {
          role: "user",
          content: `Here is the LaTeX document:
-------------------
${content}
-------------------

Question: ${query}`
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    const suggestion = response.choices[0]?.message?.content?.trim() || 'Failed to get response';
    res.json({ response: suggestion });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to get response' });
  }
});

async function LLMSuggestion(text: string, cursorPosition: number): Promise<string> {
  // Get context around cursor
  const maxContextBefore = 400;
  const maxContextAfter = 250;
  
  const textUpToCursor = text.slice(Math.max(0, cursorPosition - maxContextBefore), cursorPosition);
  const textAfterCursor = text.slice(cursorPosition, Math.min(text.length, cursorPosition + maxContextAfter));
  
  // If there's no content, don't suggest
  if (!textUpToCursor.trim()) return '';

  // Get text after cursor for checking duplicates
  const nextChars = textAfterCursor.slice(0, 50);
  const lastWord = textUpToCursor.split(/[\s{}$]+/).pop() || '';
  
  // Check if we need a space before the suggestion
  const lastChar = textUpToCursor.slice(-1);
  const needsSpace = lastChar && lastChar !== ' ' && lastChar !== '\n' && lastChar !== '{' && lastChar !== '\\';

  try {
    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a LaTeX assistant providing natural, contextual autocompletions.

SUGGESTION GUIDELINES:
1. Your suggestion should naturally complete the current thought or introduce a closely related idea
2. Keep suggestions focused and self-contained - one clear idea per suggestion
3. Avoid overly long explanations or multiple concepts in one suggestion
4. Each suggestion should be meaningful on its own while fitting the context
5. Balance brevity with completeness - don't sacrifice clarity for shortness
6. Pay careful attention to punctuation and sentence structure:
   - If the previous text ends with a period, start a new complete sentence
   - If the previous text doesn't end with punctuation, continue the sentence naturally
   - Never start with "which," "where," or other dependent clauses after a period
   - Ensure proper punctuation at both the start and end of the suggestion

IMPORTANT RULES FOR MATH MODE:
1. Analyze the context to determine if we're in math mode (between $ or $$)
2. ONLY mathematical expressions should be wrapped in $...$ or $$...$$
3. Regular text must NEVER be in math mode, even when discussing math
4. When mixing text and math, only wrap the actual formulas in $...$ or $$...$$

Examples of GOOD suggestions:
Text: "The quadratic formula is $-\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$."
<Suggestion>This formula solves equations of the form $ax^2 + bx + c = 0$.</Suggestion>

Text: "The quadratic formula is $-\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$"
<Suggestion>, which solves equations of the form $ax^2 + bx + c = 0$.</Suggestion>

Text: "For a continuous function $f(x)$"
<Suggestion> defined on the interval $[a,b]$, the Mean Value Theorem states that</Suggestion>

Examples of BAD suggestions:
Wrong punctuation: "The formula is $x^2$." + "which is a square." (Never start with "which" after a period)
Incomplete thought: "where $x$ represents" (lacks completion)
Poor flow: "The equation. And then we can solve it" (abrupt transition)
Too verbose: "This leads us to an interesting discussion of the properties of quadratic equations and their applications in various fields..."

Current text ends with: "${lastChar}"
Space needed: ${needsSpace}`
        },
        {
          role: "user",
          content: `Here is the relevant portion of the document with the cursor position marked by <Suggestion>:
-------------------
${textUpToCursor}<Suggestion>${textAfterCursor}
-------------------

Provide a natural continuation that would fit between the text before and after the <Suggestion> tags.
The suggestion should be concise but complete, forming a natural bridge between the text before and after (if any).
Return ONLY the text that should be inserted (without the <Suggestion> tags).`
        }
      ],
      temperature: 0.3,
      max_tokens: 300
    });

    let suggestion = response.choices[0]?.message?.content?.trim() || '';
    
    // Clean up the suggestion
    suggestion = suggestion.replace(/`/g, '').replace(/"/g, '').replace(/'/g, '');

    // Don't suggest if it's just repeating the last word or if the suggestion appears in next 50 chars
    if (suggestion === lastWord || nextChars.includes(suggestion)) {
      return '';
    }

    // Add space before suggestion if needed and suggestion doesn't start with special characters
    if (needsSpace && !suggestion.match(/^[$\\{]/)) {
      suggestion = ' ' + suggestion;
    }

    return suggestion;
  } catch (error) {
    console.error('Groq API error:', error);
    return '';
  }
}

async function compileLaTeX(content: string): Promise<string> {
  // Create a temporary directory
  const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'latex-'));
  const texFile = path.join(tmpDir, 'document.tex');
  const pdfFile = path.join(tmpDir, 'document.pdf');

  try {
    // Write the LaTeX content to a file
    const fullContent = `
\\documentclass{article}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\begin{document}
${content}
\\end{document}`;

    await fs.promises.writeFile(texFile, fullContent);

    // Run pdflatex
    await execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tmpDir} ${texFile}`);

    // Read the generated PDF
    const pdfContent = await fs.promises.readFile(pdfFile);
    return pdfContent.toString('base64');
  } catch (error) {
    console.error('LaTeX compilation error:', error);
    throw new Error('Failed to compile LaTeX document');
  } finally {
    // Clean up temporary files
    try {
      await fs.promises.rm(tmpDir, { recursive: true });
    } catch (error) {
      console.error('Error cleaning up temporary files:', error);
    }
  }
}

app.post('/api/compile', async (req: Request<{}, {}, CompileRequest>, res: Response) => {
  try {
    const { content } = req.body;
    const pdfBase64 = await compileLaTeX(content);
    res.json({ pdf: pdfBase64 });
  } catch (error) {
    console.error('Compilation error:', error);
    res.status(500).json({ error: 'Failed to compile document' });
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 