declare module 'groq-sdk' {
  interface Message {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }

  interface Choice {
    message?: {
      content: string;
      role: string;
    };
    index: number;
    finish_reason: string;
  }

  interface ChatCompletion {
    id: string;
    choices: Choice[];
    created: number;
    model: string;
    object: string;
  }

  interface ChatCompletionOptions {
    messages: Message[];
    model: string;
    temperature?: number;
    max_tokens?: number;
    stream?: boolean;
  }

  interface GroqClient {
    chat: {
      completions: {
        create(options: ChatCompletionOptions): Promise<ChatCompletion>;
      };
    };
  }

  class Groq {
    constructor(options: { apiKey: string });
    chat: GroqClient['chat'];
  }

  export default Groq;
} 