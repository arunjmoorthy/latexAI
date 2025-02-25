"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const os_1 = __importDefault(require("os"));
dotenv_1.default.config();
if (!process.env.GROQ_API_KEY) {
    throw new Error('GROQ_API_KEY is not defined in environment variables');
}
const client = new groq_sdk_1.default({
    apiKey: process.env.GROQ_API_KEY,
});
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const execAsync = (0, util_1.promisify)(child_process_1.exec);
function detectMathMode(text, cursorPosition) {
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
                }
                else {
                    // Found matching $$ before cursor
                    return {
                        inMathMode: false,
                        isInline: false,
                        mathContent: '',
                        mathStart: -1
                    };
                }
                i--; // Skip the second $
            }
            else {
                if (mathStart === -1) {
                    mathStart = i;
                    dollarCount = 1;
                }
                else {
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
app.post('/api/latex-suggestion', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { text, cursorPosition } = req.body;
        const suggestion = yield LLMSuggestion(text, cursorPosition);
        res.json({
            suggestion: suggestion,
            textAtRequest: text,
            cursorAtRequest: cursorPosition
        });
    }
    catch (error) {
        console.error('Error getting suggestion:', error);
        res.status(500).json({ error: 'Failed to get suggestion' });
    }
}));
app.post('/api/edit-suggestion', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { selectedText, query, contextBefore, contextAfter } = req.body;
        const response = yield client.chat.completions.create({
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
        const suggestion = ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || selectedText;
        res.json({ suggestion });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get suggestion' });
    }
}));
app.post('/api/latex-query', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const { query, content } = req.body;
        const response = yield client.chat.completions.create({
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
        const suggestion = ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || 'Failed to get response';
        res.json({ response: suggestion });
    }
    catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'Failed to get response' });
    }
}));
function LLMSuggestion(text, cursorPosition) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b, _c;
        // Get context around cursor
        const maxContextBefore = 400;
        const maxContextAfter = 250;
        const textUpToCursor = text.slice(Math.max(0, cursorPosition - maxContextBefore), cursorPosition);
        const textAfterCursor = text.slice(cursorPosition, Math.min(text.length, cursorPosition + maxContextAfter));
        // If there's no content, don't suggest
        if (!textUpToCursor.trim())
            return '';
        // Get text after cursor for checking duplicates
        const nextChars = textAfterCursor.slice(0, 50);
        const lastWord = textUpToCursor.split(/[\s{}$]+/).pop() || '';
        // Check if we need a space before the suggestion
        const lastChar = textUpToCursor.slice(-1);
        const needsSpace = lastChar && lastChar !== ' ' && lastChar !== '\n' && lastChar !== '{' && lastChar !== '\\';
        try {
            const response = yield client.chat.completions.create({
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
            let suggestion = ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || '';
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
        }
        catch (error) {
            console.error('Groq API error:', error);
            return '';
        }
    });
}
function compileLaTeX(content) {
    return __awaiter(this, void 0, void 0, function* () {
        // Create a temporary directory
        const tmpDir = yield fs_1.default.promises.mkdtemp(path_1.default.join(os_1.default.tmpdir(), 'latex-'));
        const texFile = path_1.default.join(tmpDir, 'document.tex');
        const pdfFile = path_1.default.join(tmpDir, 'document.pdf');
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
            yield fs_1.default.promises.writeFile(texFile, fullContent);
            // Run pdflatex
            yield execAsync(`pdflatex -interaction=nonstopmode -output-directory=${tmpDir} ${texFile}`);
            // Read the generated PDF
            const pdfContent = yield fs_1.default.promises.readFile(pdfFile);
            return pdfContent.toString('base64');
        }
        catch (error) {
            console.error('LaTeX compilation error:', error);
            throw new Error('Failed to compile LaTeX document');
        }
        finally {
            // Clean up temporary files
            try {
                yield fs_1.default.promises.rm(tmpDir, { recursive: true });
            }
            catch (error) {
                console.error('Error cleaning up temporary files:', error);
            }
        }
    });
}
app.post('/api/compile', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { content } = req.body;
        const pdfBase64 = yield compileLaTeX(content);
        res.json({ pdf: pdfBase64 });
    }
    catch (error) {
        console.error('Compilation error:', error);
        res.status(500).json({ error: 'Failed to compile document' });
    }
}));
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
