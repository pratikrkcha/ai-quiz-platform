import { z } from 'zod';
import { env } from '../config/env';

export class QuizGenerationError extends Error {
  constructor(message: string, public isRetriable: boolean, public isSecurityIssue: boolean = false) {
    super(message);
    this.name = 'QuizGenerationError';
  }
}

export const QuestionSchema = z.object({
  text: z.string().min(5),
  options: z.array(z.string().min(1)).length(4),
  correctIndex: z.number().int().min(0).max(3)
});

export const QuestionsResponseSchema = z.array(QuestionSchema).min(1).max(15);
export type IQuestion = z.infer<typeof QuestionSchema>;

const FALLBACK_QUESTIONS: IQuestion[] = [
  { text: "What is the capital of Japan?", options: ["Seoul", "Beijing", "Tokyo", "Bangkok"], correctIndex: 2 },
  { text: "Which planet is known as the Red Planet?", options: ["Earth", "Mars", "Jupiter", "Saturn"], correctIndex: 1 },
  { text: "Who wrote 'Romeo and Juliet'?", options: ["Charles Dickens", "William Shakespeare", "Mark Twain", "Jane Austen"], correctIndex: 1 },
  { text: "What is the largest ocean on Earth?", options: ["Atlantic", "Indian", "Arctic", "Pacific"], correctIndex: 3 },
  { text: "What is the chemical symbol for gold?", options: ["Au", "Ag", "Fe", "Cu"], correctIndex: 0 }
];

export const sanitizeTopic = (topic: string): string => {
  if (!topic || typeof topic !== 'string') throw new QuizGenerationError('Invalid topic format', false, true);
  
  let cleaned = topic.trim();
  if (cleaned.length === 0) throw new QuizGenerationError('Topic cannot be empty', false, true);
  if (cleaned.length > 100) throw new QuizGenerationError('Topic exceeds maximum length of 100 characters', false, true);
  
  // Prompt Injection Prevention
  // We check for phrases that attempt to hijack the system prompt or alter instructions
  const injectionPatterns = /(ignore previous|return instead|you are now|system prompt|disregard|forget|new instructions|bypass)/i;
  if (injectionPatterns.test(cleaned)) {
    throw new QuizGenerationError('Topic contains restricted instructional phrases', false, true);
  }
  
  // Strip control characters and unusual symbols to prevent syntax breaks, leaving alphanumeric and standard punctuation
  cleaned = cleaned.replace(/[^\w\s\-\.,\?'"!]/g, '');
  return cleaned;
};

const getPrompt = (topic: string, count: number) => `
You are a highly precise AI quiz generator. Generate exactly ${count} multiple-choice questions about the topic: "${topic}".
Difficulty: Moderate.
Return ONLY a raw JSON array of objects. Do not include markdown formatting, backticks, or any preamble text.

Schema required for each object:
{
  "text": "Question text here?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": integer between 0 and 3 representing the correct option
}

Example output:
[
  {
    "text": "What is the capital of France?",
    "options": ["London", "Berlin", "Paris", "Madrid"],
    "correctIndex": 2
  }
]
`;

export const generateQuestionsRaw = async (topic: string, numQuestions: number = 5): Promise<IQuestion[]> => {
  const cleanedTopic = sanitizeTopic(topic);
  const prompt = getPrompt(cleanedTopic, numQuestions);
  
  let attempt = 0;
  const maxAttempts = 3;
  
  while (attempt < maxAttempts) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout
      
      const apiKey = env.GEMINI_API_KEY;
      if (!apiKey) throw new QuizGenerationError('API Key configuration missing', false);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.7
          }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) {
          throw new QuizGenerationError(`Retriable HTTP Error ${response.status}`, true);
        }
        if (response.status === 400) {
          throw new QuizGenerationError('Content Policy Rejection or Bad Request', false);
        }
        throw new QuizGenerationError(`Non-retriable HTTP Error ${response.status}`, false);
      }
      
      const data = await response.json();
      
      // Safety block detection
      if (data.promptFeedback && data.promptFeedback.blockReason) {
         throw new QuizGenerationError('Topic blocked by AI safety policy', false);
      }
      
      let text = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new QuizGenerationError('Malformed LLM API response structure', true);
      
      // Best-effort recovery: strip markdown fences if the LLM hallucinated them despite instructions
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch (e) {
        throw new QuizGenerationError('LLM returned invalid JSON syntax', true);
      }
      
      // Schema validation via Zod
      const result = QuestionsResponseSchema.safeParse(parsed);
      if (!result.success) {
        throw new QuizGenerationError('LLM returned valid JSON but incorrect schema (e.g., missing options, wrong count)', true);
      }
      
      return result.data;
      
    } catch (err: any) {
       attempt++;
       const isRetriable = err.name === 'AbortError' || err.isRetriable;
       
       if (!isRetriable || attempt >= maxAttempts) {
         throw new QuizGenerationError(err.message || 'Failed to generate questions', false, err.isSecurityIssue);
       }
       
       // Exponential backoff: 1s, 2s, 4s
       const backoff = Math.pow(2, attempt - 1) * 1000;
       await new Promise(res => setTimeout(res, backoff));
    }
  }
  throw new QuizGenerationError('Max retries exceeded', false);
};

export const generateQuestions = async (topic: string, numQuestions: number = 5): Promise<IQuestion[]> => {
  try {
    return await generateQuestionsRaw(topic, numQuestions);
  } catch (err: any) {
    // If the error was a security issue (prompt injection, bad length), we FAIL HARD.
    if (err instanceof QuizGenerationError && err.isSecurityIssue) {
      throw err;
    }
    
    // FALLBACK STRATEGY: 
    // If the API times out, rate limits, or returns malformed schema after all retries,
    // we return a hardcoded pool of general knowledge questions.
    // Rationale: Ruining a live party game with an error screen is terrible UX. 
    // Serving generic questions allows the host and participants to continue playing without interruption.
    console.warn('[LLM Service] Falling back to generic questions due to error:', err.message);
    return FALLBACK_QUESTIONS;
  }
};
