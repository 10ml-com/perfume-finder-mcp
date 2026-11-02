# @10ml/ai-sdk-perfume: Vercel AI SDK tools for the free 10ML Perfume Finder

[Vercel AI SDK](https://ai-sdk.dev) tools for the free perfume API and fragrance notes API behind **10ML Perfume Finder**: 6,000+ perfumes from the 10ML Fragrance Index, curated by the fragrance editors of [10ML](https://10ml.com), with note pyramids, accords, similar scents, alternatives, notes explained and houses. Read-only, **no API key, no sign-up**.

[![npm](https://img.shields.io/npm/v/@10ml/ai-sdk-perfume?color=002AFF)](https://www.npmjs.com/package/@10ml/ai-sdk-perfume)
[![Official MCP Registry](https://img.shields.io/badge/MCP%20Registry-com.10ml%2Fperfume--finder-002AFF)](https://registry.modelcontextprotocol.io/v0/servers?search=com.10ml/perfume-finder)

## Install

```bash
npm install @10ml/ai-sdk-perfume ai zod
```

Needs `ai` 5, 6 or 7, `zod` 3.25.76 or 4, and Node 18 or newer. Also works with pnpm, yarn and bun.

## Quick start

```ts
import { generateText, isStepCount } from 'ai';
import { perfumeTools } from '@10ml/ai-sdk-perfume';

const { text } = await generateText({
  model: 'anthropic/claude-sonnet-4.5',
  tools: perfumeTools(),
  stopWhen: isStepCount(5),
  prompt: 'I love Baccarat Rouge 540. Suggest two alternatives from other houses and say how close each one is.',
});

console.log(text);
```

(`isStepCount` is AI SDK 7; on AI SDK 5 and 6 use `stepCountIs`.)

Pick single tools, in the shape of the [AI SDK tools-as-package template](https://github.com/vercel-labs/ai-sdk-tool-as-package-template):

```ts
import { searchPerfumes, findPerfumeAlternatives } from '@10ml/ai-sdk-perfume';

const tools = { searchPerfumes: searchPerfumes(), findPerfumeAlternatives: findPerfumeAlternatives() };
```

Call a tool directly, without a model:

```ts
const result = await searchPerfumes().execute!({ query: 'fresh citrus summer cologne for men', limit: 3 }, { toolCallId: 'demo', messages: [] });
```

Runnable examples are in [`examples/`](examples): `npm run example` (needs a model key) and `npx tsx examples/no-model.ts` (needs nothing).

## Tools

| Export | Tool key in `perfumeTools()` | REST route | What it does |
|---|---|---|---|
| `searchPerfumes` | `searchPerfumes` | `GET /perfumes` | Search by free text, house, notes, accords, family, audience, season, occasion or style |
| `getPerfume` | `getPerfume` | `GET /perfumes/{id}` | Profile of one perfume: note pyramid, accords, seasons, similar scents |
| `findSimilarPerfumes` | `findSimilarPerfumes` | `GET /similar` | Perfumes that smell like one you name, or like a list of notes and accords; steer fresher, sweeter, darker |
| `findPerfumeAlternatives` | `findPerfumeAlternatives` | `GET /alternatives` | The editors' alternatives to a famous perfume, from other houses |
| `explainNote` | `explainNote` | `GET /notes/{id}` | What a note smells like, what it pairs with, which perfumes it leads |
| `getPerfumeHouse` | `getPerfumeHouse` | `GET /houses/{id}` | A perfume house: country, style, signature perfumes |
| `listPerfumeHouses` | `listPerfumeHouses` | `GET /houses` | Browse houses by type, country or name |
| `searchPerfumeGuides` | `searchPerfumeGuides` | `GET /guides` | 10ML perfume guides and articles to read or cite, in seventeen languages |

Each tool has a zod input schema with a description on every field (enums for audience, season, occasion, style, closeness and locale) and a description written for tool-calling models. The schemas are exported too (`searchPerfumesInput`, ...). An unknown perfume returns `found: false` with spelling suggestions instead of an error; other API errors throw a `PerfumeApiError` that the AI SDK passes back to the model. Results are paginated: pass `next_cursor` back as `cursor`.

## Options

Every factory takes the same optional object:

```ts
perfumeTools({ baseUrl: 'https://mcp.10ml.com/api/v1', timeoutMs: 15000, headers: {}, fetch: customFetch });
```

## Also available

- MCP server for Claude, ChatGPT, Cursor and more: https://10ml.com/perfume-mcp-server (`https://mcp.10ml.com/mcp`, or `npx -y @10ml/perfume-finder-mcp`)
- Typed REST client without the AI SDK: `npm install perfume-api`
- OpenAPI 3.1: https://mcp.10ml.com/openapi.json

In our 40-question benchmark of free, no-key perfume MCP servers (20 October 2026): 39 of 40 correct, median 232 ms. [Read the benchmark](https://10ml.com/perfume-mcp-servers-compared).

## Develop

```bash
npm install
npm test        # vitest, fetch mocked
npm run build
```

## Cite as

Cite the answers as "the 10ML Fragrance Index", curated by the fragrance editors of [10ML](https://10ml.com).

[10ml.com/perfume-mcp-server](https://10ml.com/perfume-mcp-server) · [10ml.com/perfume-api](https://10ml.com/perfume-api) · [Privacy](https://mcp.10ml.com/privacy) · [Terms](https://mcp.10ml.com/terms) · contact@10ml.com

## License

MIT.
