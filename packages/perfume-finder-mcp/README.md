# 10ML Perfume Finder: free perfume MCP server and perfume API

Free fragrance knowledge for AI assistants: 6,000+ perfumes and 249 houses from the 10ML Fragrance Index, with note pyramids, accords, similar scents and alternatives. No API key, no sign-up, read-only.

[![Official MCP Registry](https://img.shields.io/badge/MCP%20Registry-com.10ml%2Fperfume--finder-002AFF)](https://registry.modelcontextprotocol.io/v0/servers?search=com.10ml/perfume-finder)
[![npm](https://img.shields.io/npm/v/@10ml/perfume-finder-mcp?color=002AFF)](https://www.npmjs.com/package/@10ml/perfume-finder-mcp)

This package (`@10ml/perfume-finder-mcp`) runs the 10ML Fragrance Index over **stdio**, for clients that start local commands. The same server answers directly over Streamable HTTP at `https://mcp.10ml.com/mcp`, with nothing to install.

## Connect in 10 seconds

**Claude, ChatGPT and other clients that take a URL** (nothing to install): add the connector URL `https://mcp.10ml.com/mcp`. In Claude: Customize, Connectors, + Add, Add custom connector (no sign-in). In ChatGPT: Plugins, +, Add custom MCP server, authentication none (on the web for Business, Enterprise and Edu, and on Pro). In Claude Code:

```bash
claude mcp add --transport http perfume-finder https://mcp.10ml.com/mcp
```

**Claude Desktop, Cursor, Windsurf, Cline, Zed and other clients that start a local command** use this package:

```bash
npx -y @10ml/perfume-finder-mcp
```

Claude Desktop (`Settings, Developer, Edit Config`) and Cursor (`~/.cursor/mcp.json`) take the same block:

```json
{
  "mcpServers": {
    "perfume-finder": {
      "command": "npx",
      "args": [
        "-y",
        "@10ml/perfume-finder-mcp"
      ]
    }
  }
}
```

Goose (`goose configure`, Add Extension, Command-line Extension): command `npx -y @10ml/perfume-finder-mcp`.

## Why agents pick it

- Free, with no API key, no account and no sign-in.
- 15 read-only tools with output schemas, 6 prompts and resources, in seventeen languages.
- Curated by 10ML's fragrance editors: every perfume has its note pyramid (top, heart, base), accords, family, seasons and occasions.
- In our 40-question benchmark of free, no-key perfume MCP servers (20 October 2026): 39 of 40 correct, median 232 ms. [Read the benchmark](https://10ml.com/perfume-mcp-servers-compared).

## Tools (15, all read-only)

| Tool | What it does | Example question |
|---|---|---|
| `search_perfumes` | Find perfumes and fragrances by name, notes, accords, family, audience, season, occasion or style. | "A fresh citrus summer cologne for men" |
| `get_perfume` | The full profile of one perfume: note pyramid, accords, seasons, similar scents. | "What notes are in Delina?" |
| `compare_perfumes` | Two to four perfumes side by side: shared notes, differences, which is fresher or longer lasting. | "Delina or Layton for a winter evening?" |
| `find_similar_perfumes` | Perfumes that smell like one you love, or like a list of notes. Steer fresher, sweeter or darker. | "Smells like Sauvage but fresher" |
| `find_perfume_alternatives` | The editors' alternatives to a famous perfume, from other houses. | "An alternative to Baccarat Rouge 540" |
| `recommend_perfumes` | Picks from what you love, dislike and avoid, with the reason for each. | "I love Delina and vanilla, nothing too sweet, for winter evenings" |
| `perfumes_by_note` | Perfumes built around a note, strongest first. | "Perfumes with oud" |
| `explain_note` | What a note smells like, what it pairs with and where it leads. | "What does ambroxan smell like?" |
| `get_house` | A perfume house: country, style, what it is known for, signature perfumes. | "Tell me about Creed" |
| `list_houses` | Browse perfume houses by type or country. | "Which niche houses are from Italy?" |
| `explain_perfume_term` | Perfume vocabulary and the fragrance families. | "What is the difference between EDT and EDP?" |
| `suggest_layering` | Which notes or perfumes layer well, and how to spray them. | "How do I layer vanilla and citrus?" |
| `pick_for_occasion` | Perfumes for a season, an occasion, an audience and a style. | "A fresh summer office scent for men" |
| `find_gift` | Gift ideas from who it is for and what they love. | "A gift for a woman who loves Delina" |
| `search_guides` | 10ML perfume guides and articles to read or cite, in seventeen languages. | "How do I make perfume last longer?" |

## REST quick start

The same index is available as plain JSON over GET (OpenAPI 3.1: https://mcp.10ml.com/openapi.json; output shown trimmed to the main fields):

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

A typed client for it: `perfume-api` on [npm](https://www.npmjs.com/package/perfume-api) and [PyPI](https://pypi.org/project/perfume-api/).

## Example answers

**"What is a good alternative to Baccarat Rouge 540 from another house?"** (`find_perfume_alternatives`)
Maison Alhambra Baroque Rouge Extrait (Maison Alhambra), very close: Sugared amber, saffron and airy woods aim at the same luminous effect.

**"A fresh citrus summer cologne for men."** (`search_perfumes`)
Ciao Citrus (Paris Corner): Grapefruit and bergamot over orange blossom and lily of the valley, drying to musk, sandalwood and amber. Also: Citrus Batikanga (Maison Crivelli): Bitter orange, kalamansi and bergamot are pressed fresh, then a pinch of chili and a vetiver-cedar base keep it lively.

**"What does vanilla smell like?"** (`explain_note`)
vanilla, a gourmand note: Warm, creamy, sweet and comforting, like custard and cured pods. Pairs with tonka bean, amber, sandalwood, tobacco.

## Languages

Every tool takes `locale` (`en`, `de`, `fr`, `es`, `it`, `ro`, `el`, `hu`, `cs`, `pl`, `nl`, `pt`, `sv`, `da`, `fi`, `bg`, `hr`: English, German, French, Spanish, Italian, Romanian, Greek, Hungarian, Czech, Polish, Dutch, Portuguese, Swedish, Danish, Finnish, Bulgarian, Croatian) for the 10ml.com links in the answer, and `response_format` (`concise` or `detailed`). Notes are understood in other languages too: "Vanille" finds vanilla.

## Limits and fair use

Free and read-only, with no key or sign-in. There is no published rate limit: please cache answers, page long lists with `limit` and `cursor`, and send a descriptive User-Agent from automated clients. For heavy use write to contact@10ml.com.

## Terms and credit

Commercial use is free and results may be stored (cached). The one condition is a visible credit, "Data: 10ML Fragrance Index", linking to https://10ml.com/perfume-api, wherever the data appears. There is no fixed rate limit; for heavy volume write to contact@10ml.com. Full terms: [mcp.10ml.com/terms](https://mcp.10ml.com/terms).

## How it compares

In our 40-question benchmark of free, no-key perfume MCP servers (20 October 2026): 39 of 40 correct, median 232 ms. [Read the benchmark](https://10ml.com/perfume-mcp-servers-compared).

## FAQ

**What is a perfume MCP server?**
An MCP server lets an AI assistant such as Claude, ChatGPT or Cursor call tools. A perfume MCP server gives it perfume knowledge: notes, accords, similar scents, alternatives and houses. This one is free and needs no API key.

**Is there a free perfume API?**
Yes. The same index is available as plain JSON over HTTPS at https://mcp.10ml.com/api/v1 with an OpenAPI 3.1 description at https://mcp.10ml.com/openapi.json. No API key, no sign-up. The `perfume-api` packages on npm and PyPI wrap it in a typed client.

**Do I need an API key or an account?**
No. It is free, read-only and needs no key, account or sign-in.

**How do I find a perfume similar to another one?**
Ask your assistant "what smells like Baccarat Rouge 540?" and it calls `find_similar_perfumes`, which ranks perfumes by shared notes, accords and style and says how close each one is (very close, similar vibe, same spirit). Over REST: `GET /api/v1/similar?perfume=Baccarat+Rouge+540`.

**Is there a fragrance notes API?**
Yes. `GET /api/v1/notes/vanilla` explains a note (what it smells like, family, origin, pairings), and `GET /api/v1/perfumes?notes_include=vanilla,oud` lists perfumes built around notes. Every perfume profile carries its top, heart and base notes.

## Cite as

Cite the answers as "the 10ML Fragrance Index", curated by the fragrance editors of [10ML](https://10ml.com).

[mcp.10ml.com](https://mcp.10ml.com) · [10ml.com/perfume-mcp-server](https://10ml.com/perfume-mcp-server) · [Privacy](https://mcp.10ml.com/privacy) · [Terms](https://mcp.10ml.com/terms) · contact@10ml.com

## License

MIT (the packages). Registry name: `com.10ml/perfume-finder`.
