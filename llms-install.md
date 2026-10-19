# Installing the 10ML Fragrance Index MCP server

This is a remote MCP server. There is nothing to download, build or run locally, and no API key is needed.

- Endpoint: `https://mcp.10ml.com/mcp`
- Transport: Streamable HTTP
- Authentication: none

## Steps for an agent (Cline and similar)

1. Open the MCP settings file (for Cline: `cline_mcp_settings.json`).
2. Add this entry inside `mcpServers`, keeping any existing servers:

```json
"perfume-finder": {
  "type": "streamableHttp",
  "url": "https://mcp.10ml.com/mcp",
  "disabled": false
}
```

3. Save the file. The client connects automatically.
4. Check the connection by listing the tools. You should see 16 tools, starting with `search_perfumes`, `get_perfume`, `compare_perfumes`, `find_similar_perfumes` and `find_perfume_alternatives`.
5. Try it: call `get_perfume` with `{"perfume": "Creed Aventus"}`.

If the client only supports stdio servers, use the bridge `npx -y mcp-remote https://mcp.10ml.com/mcp` as the command instead.

All tools are read-only and safe to auto-approve. Clients without MCP support can use the REST API described at https://mcp.10ml.com/openapi.json.
