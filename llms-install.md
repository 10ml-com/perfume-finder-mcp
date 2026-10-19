# Installing the 10ML Fragrance Index MCP server

This is a remote MCP server. There is nothing to download, build or run locally, and no API key is needed.

- Endpoint: `https://mcp.10ml.com/mcp`
- Transport: Streamable HTTP
- Authentication: none

## Steps for an AI agent (Cline and similar)

1. Open the MCP settings file (for Cline: `cline_mcp_settings.json`).
2. Add this entry inside `mcpServers`, keeping any existing servers:

```json
"10ml": {
  "type": "streamableHttp",
  "url": "https://mcp.10ml.com/mcp",
  "disabled": false
}
```

3. Save the file. The client connects automatically.
4. Check the connection by listing the tools. You should see: `search_perfumes`, `get_perfume`, `find_similar_perfumes`, `perfumes_by_note`, `trending_perfumes`, `list_houses`.
5. Try it: call `get_perfume` with `{"name": "Aventus", "house": "Creed"}`.

If the client only supports stdio servers, use the bridge `npx -y mcp-remote https://mcp.10ml.com/mcp` as the command instead.

All tools are read-only and safe to auto-approve.
