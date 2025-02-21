import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { OpenAI } from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.GROK_API_KEY,
  baseURL: "https://api.x.ai/v1",
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
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: `You are a LaTeX editing assistant. Your task is to help modify LaTeX text while maintaining proper math mode usage and ensuring changes are coherent with the surrounding context.

IMPORTANT RULES FOR MATH MODE:
1. Only wrap the actual mathematical expressions/equations in $...$ or $$...$$
2. Regular text, even when referring to formulas, should NOT be in math mode
3. Never wrap entire sentences in math mode
4. Preserve existing math mode delimiters unless explicitly asked to change them

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
3. Follow the math mode rules strictly`
        }
      ],
      temperature: 0.3,
      max_tokens: 500
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
      model: "grok-2-latest",
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
  // Get all text up to cursor position
  const textUpToCursor = text.slice(0, cursorPosition);
  
  // If there's no content, don't suggest
  if (!textUpToCursor.trim()) return '';

  // Get text after cursor for checking duplicates
  const nextChars = text.slice(cursorPosition, cursorPosition + 50);
  const lastWord = textUpToCursor.split(/[\s{}$]+/).pop() || '';
  
  // Check if we need a space before the suggestion
  const lastChar = textUpToCursor.slice(-1);
  const needsSpace = lastChar && lastChar !== ' ' && lastChar !== '\n' && lastChar !== '{' && lastChar !== '\\';

  try {
    const response = await client.chat.completions.create({
      model: "grok-2-latest",
      messages: [
        {
          role: "system",
          content: `You are a LaTeX assistant. Your task is to provide intelligent autocompletions based on the context.
You will be given the entire document up to the cursor position to understand the full context.
Analyze what topics have been covered and what would be logical to discuss next.

IMPORTANT RULES FOR MATH MODE:
1. Analyze the context to determine if we're in math mode (between $ or $$)
2. ONLY mathematical expressions should be wrapped in $...$ or $$...$$
3. Regular text must NEVER be in math mode, even when discussing math
4. When mixing text and math, only wrap the actual formulas in $...$ or $$...$$

CRITICAL: Math mode ($...$ or $$...$$) is ONLY for:
- Actual mathematical expressions and equations
- Individual mathematical symbols
- Numbers when they are part of a mathematical expression

Math mode is NEVER for:
- Regular words or sentences
- Explanatory text about math
- Punctuation marks outside the math
- Text that merely references or describes math

Examples of CORRECT usage:
✓ "The quadratic formula is $-\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}$."
✓ "When $x > 0$, the function increases."
✓ "Let $\\alpha$ be the angle between vectors $\\vec{u}$ and $\\vec{v}$."
✓ "The equation $x^2 + 2x + 1 = 0$ has one solution."

Examples of INCORRECT usage:
✗ $The quadratic formula is -\\frac{b \\pm \\sqrt{b^2 - 4ac}}{2a}.$
✗ $When x > 0, the function increases$
✗ $Let \\alpha$ be the angle between $\\vec{u}$ and $\\vec{v}$
✗ $The equation x^2 + 2x + 1 = 0 has one solution$

Current text ends with: "${lastChar}"
Space needed: ${needsSpace}`
        },
        {
          role: "user",
          content: `Here is the entire document up to the cursor position:
-------------------
${textUpToCursor}
-------------------

Based on this context, provide a completion that would naturally continue from this point.
Return ONLY the text that should be inserted at the cursor position.`
        }
      ],
      temperature: 0.3,
      max_tokens: 150
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
    console.error('Grok API error:', error);
    return '';
  }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
}); 