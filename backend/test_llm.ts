import { generateQuestionsRaw } from './src/services/llmService.js';

generateQuestionsRaw('Cats')
  .then(res => console.log('Success:', res))
  .catch(err => console.error('Error:', err));
