# perfume-api: free perfume API client (10ML Fragrance Index)

Free perfume API client: perfumes, note pyramids, accords, similar scents, notes and houses from the 10ML Fragrance Index, curated by the fragrance editors of [10ML](https://10ml.com). No API key, no dependencies, typed for TypeScript.

[![Official MCP Registry](https://img.shields.io/badge/MCP%20Registry-com.10ml%2Fperfume--finder-002AFF)](https://registry.modelcontextprotocol.io/v0/servers?search=com.10ml/perfume-finder)
[![npm](https://img.shields.io/npm/v/perfume-api?color=002AFF)](https://www.npmjs.com/package/perfume-api)

## Install

```bash
npm install perfume-api
```

Needs Node.js 18 or newer (it uses the global `fetch`).

## Quick start

```ts
import { searchPerfumes, perfumeAlternatives, explainNote, comparePerfumes } from 'perfume-api';

const found = await searchPerfumes({ q: 'fresh citrus summer cologne for men', limit: 3 });
console.log(found.results[0].name, found.results[0].accords);

const alts = await perfumeAlternatives({ perfume: 'Baccarat Rouge 540' });
console.log(alts.alternatives.map((a) => `${a.name} (${a.closeness})`));

const note = await explainNote('vanilla');
if (note.found) console.log(note.note.smells_like);

const cmp = await comparePerfumes(['Delina', 'Layton']);
console.log(cmp.shared_notes, cmp.only);
```

## Functions

| Function | REST route | What it does |
|---|---|---|
| `searchPerfumes(params)` | `GET /perfumes` | Search by free text, house, notes, accords, family, audience, season, occasion or style |
| `getPerfume(id, params)` | `GET /perfumes/{id}` | Full profile of one perfume: note pyramid, accords, seasons, similar scents |
| `similarPerfumes(params)` | `GET /similar` | Perfumes that smell like one you name, or like a list of notes and accords |
| `perfumeAlternatives(params)` | `GET /alternatives` | The editors' alternatives to a famous perfume, from other houses |
| `explainNote(id, params)` | `GET /notes/{id}` | What a note smells like, what it pairs with, where it leads |
| `getHouse(id, params)` | `GET /houses/{id}` | A perfume house: country, style, signature perfumes |
| `listHouses(params)` | `GET /houses` | Browse houses by type, country or name |
| `searchGuides(params)` | `GET /guides` | 10ML perfume guides and articles to read or cite |
| `comparePerfumes(names)` | `GET /perfumes/{id} x 2-4` | Shared and distinct notes and accords of 2 to 4 perfumes (built from their profiles; the REST API has no compare route) |

## What comes back

Plain JSON, as the REST API sends it (shown trimmed to the main fields). For example `GET /alternatives` and `GET /notes/vanilla`:

```bash
curl -s "https://mcp.10ml.com/api/v1/alternatives?perfume=Baccarat+Rouge+540&limit=2"
```

```json
{
  "total": 6,
  "original": {
    "name": "Maison Francis Kurkdjian Baccarat Rouge 540",
    "id": "maison-francis-kurkdjian-baccarat-rouge-540-edp"
  },
  "alternatives": [
    {
      "name": "Maison Alhambra Baroque Rouge Extrait",
      "closeness": "very close",
      "why": "Sugared amber, saffron and airy woods aim at the same luminous effect.",
      "id": "maison-alhambra-baroque-rouge-extrait",
      "house": "Maison Alhambra",
      "source": "editors"
    },
    {
      "name": "Dossier Ambery Saffron",
      "closeness": "similar vibe",
      "why": "Saffron and amber with sweet woods share the glowing amber idea.",
      "id": "dossier-ambery-saffron",
      "house": "Dossier",
      "source": "editors"
    }
  ],
  "source": "10ML Fragrance Index"
}
```

```bash
curl -s "https://mcp.10ml.com/api/v1/notes/vanilla"
```

```json
{
  "found": true,
  "note": {
    "id": "vanilla",
    "name": "vanilla",
    "family": "gourmand",
    "smells_like": "Warm, creamy, sweet and comforting, like custard and cured pods.",
    "mood": "comforting, sweet, warm",
    "pairs_with": [
      "tonka bean",
      "amber",
      "sandalwood",
      "tobacco",
      "caramel",
      "patchouli"
    ]
  },
  "source": "10ML Fragrance Index"
}
```

## Errors

An unknown id or name is not an error: the call returns the body with `found: false` and suggestions. A bad request (HTTP 400) or any other failure throws `PerfumeApiError` with `status`, `code`, `message` and the parsed `body`.

## Configure

```ts
import { createClient } from 'perfume-api';

const api = createClient({
  baseUrl: 'https://mcp.10ml.com/api/v1', // the default
  timeoutMs: 15000,
  headers: { 'user-agent': 'my-app/1.0' },
  // fetch: myFetch,                      // optional: your own fetch
});
const houses = await api.listHouses({ type: 'niche', limit: 5 });
```

Parameters and response fields use the API's own names (`notes_include`, `key_notes`, `next_cursor`). List parameters such as `notes_include` take a string or an array. Responses are fully typed (`SearchPerfumesResponse`, `Perfume`, `Pyramid`, ...), generated from the OpenAPI file.

## Example answers

**"What is a good alternative to Baccarat Rouge 540 from another house?"** (`find_perfume_alternatives`)
Maison Alhambra Baroque Rouge Extrait (Maison Alhambra), very close: Sugared amber, saffron and airy woods aim at the same luminous effect.

**"A fresh citrus summer cologne for men."** (`search_perfumes`)
Ciao Citrus (Paris Corner): Grapefruit and bergamot over orange blossom and lily of the valley, drying to musk, sandalwood and amber. Also: Citrus Batikanga (Maison Crivelli): Bitter orange, kalamansi and bergamot are pressed fresh, then a pinch of chili and a vetiver-cedar base keep it lively.

**"What does vanilla smell like?"** (`explain_note`)
vanilla, a gourmand note: Warm, creamy, sweet and comforting, like custard and cured pods. Pairs with tonka bean, amber, sandalwood, tobacco.

## Languages

Every call takes `locale` (`en`, `de`, `fr`, `es`, `it`, `ro`, `el`, `hu`, `cs`, `pl`, `nl`, `pt`, `sv`, `da`, `fi`, `bg`, `hr`) for the 10ml.com links in the answer, and `format` (`concise` or `detailed`). Notes are understood in other languages too: "Vanille" finds vanilla.

## Limits and fair use

Free and read-only, with no key or sign-in. There is no published rate limit: please cache answers, page long lists with `limit` and `cursor`, and send a descriptive User-Agent from automated clients. For heavy use write to contact@10ml.com.

## How it compares

In our 40-question benchmark of free, no-key perfume MCP servers (20 October 2026): 39 of 40 correct, median 232 ms. [Read the benchmark](https://10ml.com/perfume-mcp-servers-compared).

## FAQ

**Is there a free perfume API?**
Yes. This client talks to the 10ML Fragrance Index API at https://mcp.10ml.com/api/v1: JSON over HTTPS, OpenAPI 3.1 at https://mcp.10ml.com/openapi.json, no API key and no sign-up.

**Does it have dependencies?**
No. The npm package uses the built-in `fetch` (Node 18+), the PyPI package uses `urllib` (Python 3.9+).

**Is there a fragrance notes API?**
Yes: `explainNote` / `explain_note` describes a note (what it smells like, family, origin, pairings), and `searchPerfumes` with `notes_include` lists perfumes built around notes.

**Can an AI assistant use it directly?**
Yes, through the 10ML Perfume Finder MCP server (`https://mcp.10ml.com/mcp`, or `npx -y perfume-mcp` / `uvx perfume-mcp`).

**What do I get for a perfume?**
House, launch year, audience, concentration, family, accords, the note pyramid (top, heart, base), seasons and occasions, an editorial character line and links to 10ml.com guides.

## Cite as

Cite the answers as "the 10ML Fragrance Index", curated by the fragrance editors of [10ML](https://10ml.com).

[mcp.10ml.com](https://mcp.10ml.com) · [10ml.com/perfume-api](https://10ml.com/perfume-api) · [Privacy](https://mcp.10ml.com/privacy) · [Terms](https://mcp.10ml.com/terms) · contact@10ml.com

## License

MIT.
