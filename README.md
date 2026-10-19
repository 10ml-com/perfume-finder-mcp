<!-- mcp-name: com.10ml/perfume-finder -->
<p align="center"><img src="logo.png" width="120" height="120" alt="10ML"></p>

# 10ML Fragrance Index (MCP server)

Expert perfume knowledge for your AI assistant, curated by the fragrance editors of [10ML](https://10ml.com). Ask about note pyramids, accords, fragrance families, similar scents, perfume houses and the stories behind iconic designer, niche and Middle-Eastern perfumes, and get links to 10ML's guides and note pages.

Free, read-only, no sign-in. One remote endpoint, nothing to install:

```
https://mcp.10ml.com/mcp
```

Transport: Streamable HTTP. Authentication: none.

[![Add to Cursor](https://cursor.com/deeplink/mcp-install-dark.svg)](https://cursor.com/en/install-mcp?name=10ml&config=eyJ1cmwiOiJodHRwczovL21jcC4xMG1sLmNvbS9tY3AifQ==)
[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Server-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=10ml&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.10ml.com%2Fmcp%22%7D)
[![Install in VS Code Insiders](https://img.shields.io/badge/VS_Code_Insiders-Install_Server-24bfa5?style=flat-square&logo=visualstudiocode&logoColor=white)](https://insiders.vscode.dev/redirect/mcp/install?name=10ml&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fmcp.10ml.com%2Fmcp%22%7D&quality=insiders)

## What you can ask

- "What does Baccarat Rouge 540 smell like, and what is similar?"
- "Suggest a fresh citrus perfume for men for summer days at the office."
- "What is oud, and which perfumes use it beautifully?"
- "Iconic vanilla perfumes for winter."
- "Which houses are known for amber perfumes?"
- "I love Tobacco Vanille. What else should I try?"

## Tools

| Tool | What it does |
|---|---|
| `search_perfumes` | Search by name, house, note, mood, fragrance family, audience, season or occasion. Natural language works. |
| `get_perfume` | The full profile of one perfume: top, heart and base notes, accords, family, seasons, occasions, an editorial character note and the house. |
| `find_similar_perfumes` | Perfumes similar to one you like, ranked by shared notes and accords, each showing what it shares. Works from a list of notes too. |
| `perfumes_by_note` | What a note smells like and the perfumes built around it (vanilla, oud, bergamot, iris, tonka bean...). |
| `trending_perfumes` | Iconic perfumes chosen by 10ML's editors, by audience, family or season. |
| `list_houses` | Perfume houses with country, style and signature perfumes. |

Every answer links back to 10ML: a "Try it at 10ML" link for each perfume, plus guides, note pages and house pages on 10ml.com.

## Connect

### Claude (claude.ai and the desktop app)

Settings → Connectors → **Add custom connector** → paste `https://mcp.10ml.com/mcp`.

### Claude Code

```bash
claude mcp add --transport http 10ml https://mcp.10ml.com/mcp
```

Or commit the `.mcp.json` from this repository to your project.

### ChatGPT (developer mode)

Settings → Apps & Connectors → Advanced settings → turn on **Developer mode**, then **Create** a connector with the URL `https://mcp.10ml.com/mcp` and no authentication.

### Cursor

Use the **Add to Cursor** button above, or add this to `~/.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "10ml": { "url": "https://mcp.10ml.com/mcp" }
  }
}
```

### VS Code (GitHub Copilot agent mode)

Use the **Install in VS Code** button above, or add this to `.vscode/mcp.json`:

```json
{
  "servers": {
    "10ml": { "type": "http", "url": "https://mcp.10ml.com/mcp" }
  }
}
```

### Windsurf

Add this to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "10ml": { "serverUrl": "https://mcp.10ml.com/mcp" }
  }
}
```

### Cline

MCP Servers → Remote Servers → name `10ml`, URL `https://mcp.10ml.com/mcp`, or add this to `cline_mcp_settings.json`:

```json
{
  "mcpServers": {
    "10ml": { "type": "streamableHttp", "url": "https://mcp.10ml.com/mcp", "disabled": false }
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

10ML is a European perfume decant shop: original designer and niche perfumes in small decants, so you can try a scent properly before committing to a full bottle. Explore the [10ML guides](https://10ml.com/guides), the [notes library](https://10ml.com/notes) and the [perfume houses](https://10ml.com/brands), or visit [10ml.com](https://10ml.com).

Official MCP Registry name: `com.10ml/perfume-finder`. Server page: [mcp.10ml.com](https://mcp.10ml.com).

## License

The documentation and configuration files in this repository are released under the [MIT License](LICENSE).
