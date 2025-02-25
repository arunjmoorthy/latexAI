import { SuggestionRequest, EditRequest, LatexQueryRequest } from '../types';

export const getLatexSuggestion = async (text: string, cursorPosition: number): Promise<{
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

export const getEditSuggestion = async (
  selectedText: string,
  query: string,
  contextBefore: string,
  contextAfter: string
): Promise<string> => {
  try {
    console.log('Sending edit request:', { selectedText, query });
    
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
      } as EditRequest),
    });

    if (!response.ok) {
      console.error('API response not OK:', response.status, response.statusText);
      throw new Error(`Failed to get edit suggestion: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('Raw API response:', data);
    
    // If no suggestion was returned, return the original text
    if (!data.suggestion) {
      console.warn('No suggestion returned from API');
      return selectedText;
    }
    
    // Process the suggestion to ensure it's complete
    let suggestion = data.suggestion.trim();
    
    // Check if the suggestion ends with an incomplete sentence
    const endsWithIncomplete = /[a-zA-Z0-9,;:]$/.test(suggestion) && !suggestion.endsWith('.');
    
    // If it appears to be incomplete and doesn't end with proper punctuation, 
    // return a message indicating it's incomplete
    if (endsWithIncomplete) {
      console.warn('Received incomplete suggestion:', suggestion);
      return selectedText;
    }
    
    // Remove any preamble text
    suggestion = suggestion.replace(/^(Here is |The |This is |Updated |Replacement |)?(the |your |updated |new |suggested |replacement |)?(text|version|content|portion|suggestion)( that)?( replaces| for| should be)?[:\s-]*/i, '');
    
    // If the response contains multiple lines and appears to be the full context,
    // try to extract just the replacement part
    if (suggestion.includes(contextBefore) || suggestion.includes(contextAfter)) {
      // Get the last non-empty line as it's likely the actual replacement
      const lines = suggestion.split('\n').filter((line: string) => line.trim());
      suggestion = lines[lines.length - 1];
    }
    
    console.log('Processed suggestion:', suggestion);
    return suggestion;
  } catch (error) {
    console.error('Error getting edit suggestion:', error);
    return `Error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};

export const getLatexResponse = async (query: string, content: string): Promise<string> => {
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

export const compileLaTeX = async (content: string): Promise<string> => {
  try {
    const response = await fetch('http://localhost:3001/api/compile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content }),
    });

    if (!response.ok) {
      throw new Error('Compilation failed');
    }

    const data = await response.json();
    return data.pdf;
  } catch (error) {
    console.error('Compilation error:', error);
    throw error;
  }
}; 