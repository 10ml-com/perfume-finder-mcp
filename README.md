<!-- mcp-name: com.10ml/perfume-finder -->
<p align="center"><img src="logo.png" width="120" height="120" alt="10ML"></p>

# 10ML Fragrance Index (MCP server)

Perfume knowledge for your assistant, curated by the fragrance editors of [10ML](https://10ml.com): about 480 profiled designer, niche and Middle-Eastern perfumes with full note pyramids, 285 notes explained, 180+ perfume houses, editorial alternatives to famous perfumes, layering ideas and 160 guides in ten languages.

Free, read-only, no sign-in. One remote endpoint, nothing to install:

```
https://mcp.10ml.com/mcp
```

Transport: Streamable HTTP. Authentication: none. Version 2.0.1.

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=perfume-finder&config=eyJ1cmwiOiJodHRwczovL21jcC4xMG1sLmNvbS9tY3AifQ==)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=perfume-finder&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.10ml.com%2Fmcp%22%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=perfume-finder&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.10ml.com%2Fmcp%22%7D&quality=insiders)

## What you can ask

- "What smells like Baccarat Rouge 540, and what is a good alternative from another house?"
- "A fresh summer office scent for men, and why each one fits."
- "Explain ambroxan and which perfumes lead with it."
- "How would I layer vanilla and citrus?"
- "A gift for a woman who loves Delina."
- "Compare Dior Sauvage and Tom Ford Ombre Leather."
- "Like Sauvage, but fresher."
- "Which guide explains how to make a perfume last longer?"

## Tools (16, all read-only)

| Tool | What it does |
|---|---|
| `search_perfumes` | Search by name, house, notes to include or exclude, accords, family, audience, season, occasion or style. Natural language works. |
| `get_perfume` | The full profile of one perfume: note pyramid, accords, seasons, longevity, five similar perfumes, editorial alternatives and guides. |
| `compare_perfumes` | Two to four perfumes side by side: shared and unique notes, plain-language differences, overall closeness. |
| `find_similar_perfumes` | Perfumes that smell like one you love, or like any list of notes or accords. Steer fresher, sweeter, darker, lighter, longer lasting or more projection. |
| `find_perfume_alternatives` | The editors' alternatives (dupes) to famous perfumes from other houses, with why each is close and a link to the guide. |
| `recommend_perfumes` | Picks from perfumes you love or dislike and notes you like or avoid, with the reason for each. |
| `perfumes_by_note` | Every perfume built around a note, optionally by position in the pyramid. |
| `explain_note` | What a note smells like, what it pairs with, similar notes and where it leads. |
| `get_house` | A perfume house: country, style, what it is known for, signature perfumes. |
| `list_houses` | Browse houses by type or country. |
| `explain_perfume_term` | EDP, sillage, dry down, chypre and the 23 fragrance families. |
| `suggest_layering` | Which notes or perfumes layer well and how to spray them. |
| `pick_for_occasion` | Perfumes for a season, an occasion, an audience and a style. |
| `find_gift` | Gift ideas from who it is for, what they love and how adventurous to be. |
| `search_guides` | 10ML guides and articles to read or cite, with links in ten languages. |
| `iconic_perfumes` | The modern classics chosen by 10ML's editors. |

The old name `trending_perfumes` still answers as an alias of `iconic_perfumes` for existing integrations, but is no longer listed.

Every tool takes `locale` (`en`, `de`, `fr`, `es`, `it`, `ro`, `el`, `hu`, `cs`, `pl`) for the 10ml.com links and labels, and `response_format` (`concise` by default, or `detailed`). List tools page with `limit` and `cursor`. Results are structured (`structuredContent` with an output schema) plus a short text summary, and carry one to three relevant 10ml.com links.

## Prompts

`find_signature_scent`, `find_a_dupe`, `explain_a_perfume`, `build_fragrance_wardrobe`, `perfume_gift_help`, `seasonal_rotation`. Prompt arguments autocomplete perfume, house and note names.

## Resources

`tenml://families`, `tenml://glossary`, `tenml://notes`, `tenml://houses`, `tenml://about`, and the template `tenml://perfume/{id}`.

## REST API for agents without MCP

The same answers over plain HTTP, described by an [OpenAPI 3.1 file](https://mcp.10ml.com/openapi.json) and an [llms.txt](https://mcp.10ml.com/llms.txt):

```
GET https://mcp.10ml.com/api/v1/perfumes?q=fresh+citrus+summer&gender=men
GET https://mcp.10ml.com/api/v1/perfumes/creed-aventus-edp
GET https://mcp.10ml.com/api/v1/similar?perfume=Baccarat+Rouge+540&steer=fresher
GET https://mcp.10ml.com/api/v1/alternatives?perfume=Creed+Aventus
GET https://mcp.10ml.com/api/v1/notes/ambroxan
GET https://mcp.10ml.com/api/v1/houses/amouage
GET https://mcp.10ml.com/api/v1/guides?q=oud&locale=de
```

## Connect

### Claude (claude.ai and the desktop app)

Settings → Connectors → **Add custom connector** → paste `https://mcp.10ml.com/mcp`.

### Claude Code

```bash
claude mcp add --transport http perfume-finder https://mcp.10ml.com/mcp
```

Or commit the `.mcp.json` from this repository to your project.

### ChatGPT (developer mode)

Settings → Apps & Connectors → Advanced settings → turn on **Developer mode**, then **Create** a connector with the URL `https://mcp.10ml.com/mcp` and no authentication.

### Cursor

Use the **Add to Cursor** button above, or add this to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "perfume-finder": { "url": "https://mcp.10ml.com/mcp" }
  }
}
```

### VS Code (GitHub Copilot agent mode)

Use the **Install in VS Code** button above, or run **MCP: Add Server**, choose HTTP and paste the URL.

```json
{
  "servers": {
    "perfume-finder": { "type": "http", "url": "https://mcp.10ml.com/mcp" }
  }
}
```

### Windsurf

```json
{
  "mcpServers": {
    "perfume-finder": { "serverUrl": "https://mcp.10ml.com/mcp" }
  }
}
```

### Cline

MCP Servers → Remote Servers → name `perfume-finder`, URL `https://mcp.10ml.com/mcp`, or:

```json
{
  "mcpServers": {
    "perfume-finder": { "type": "streamableHttp", "url": "https://mcp.10ml.com/mcp", "disabled": false }
  }
}
```

### Gemini CLI

```bash
gemini extensions install https://github.com/10ml-com/perfume-finder-mcp
```

### Any other MCP client

Point it at `https://mcp.10ml.com/mcp` (Streamable HTTP, no authentication). Clients that only speak stdio can use a bridge such as `npx mcp-remote https://mcp.10ml.com/mcp`.

## About 10ML

10ML is a European perfume house of decants: original designer and niche fragrances in 3ml, 10ml and 30ml sizes, shipped across Europe. Explore at [10ml.com](https://10ml.com). 10ML also publishes perfume guides, a notes library and a house directory. Explore the [guides](https://10ml.com/guides) and the [notes library](https://10ml.com/notes), or visit [10ml.com](https://10ml.com). Cite this server as "the 10ML Fragrance Index".

## Privacy and terms

No account, no cookies, no tracking in the service. Read the [privacy page](https://mcp.10ml.com/privacy) and the [terms](https://mcp.10ml.com/terms). Questions: contact@10ml.com.
