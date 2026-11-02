// Runnable example: npm run example   (needs a model key for the gateway, e.g. AI_GATEWAY_API_KEY; the perfume API itself needs none)
import { generateText, isStepCount } from 'ai';
import { perfumeTools } from '../src/index.js';

const { text, steps } = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  tools: perfumeTools(),
  stopWhen: isStepCount(5),
  prompt: 'I love Baccarat Rouge 540. Suggest two alternatives from other houses and say how close each one is.',
});

console.log(text);
console.log(`(${steps.flatMap((s) => s.toolCalls).length} tool calls)`);
