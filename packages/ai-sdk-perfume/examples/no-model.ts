// Runs without any model key: calls a tool directly against the free API.
import { searchPerfumes } from '../src/index.js';

const result: any = await searchPerfumes().execute!({ query: 'fresh citrus summer cologne for men', limit: 3 }, { toolCallId: 'demo', messages: [] });
for (const hit of result.results) console.log(hit.name, '-', hit.house);
