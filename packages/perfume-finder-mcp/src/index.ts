#!/usr/bin/env node
/**
 * 10ML Fragrance Index: stdio front for the remote MCP server at https://mcp.10ml.com/mcp.
 * Clients that only start local commands (Claude Desktop, Cursor, Goose) run this with `npx -y`;
 * every request is passed straight through to the remote server and answered by it.
 */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  CallToolResultSchema,
  CompleteRequestSchema,
  CompleteResultSchema,
  GetPromptRequestSchema,
  GetPromptResultSchema,
  ListPromptsRequestSchema,
  ListPromptsResultSchema,
  ListResourcesRequestSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesRequestSchema,
  ListResourceTemplatesResultSchema,
  ListToolsRequestSchema,
  ListToolsResultSchema,
  ReadResourceRequestSchema,
  ReadResourceResultSchema,
} from '@modelcontextprotocol/sdk/types.js';

const REMOTE_URL = 'https://mcp.10ml.com/mcp';
const PACKAGE_VERSION = '2.6.1';

async function main(): Promise<void> {
  const remote = new Client({ name: '10ml-perfume-finder-stdio', version: PACKAGE_VERSION });
  await remote.connect(new StreamableHTTPClientTransport(new URL(REMOTE_URL)));

  const caps = remote.getServerCapabilities() ?? {};
  const info = remote.getServerVersion();
  const server = new Server(
    { name: info?.name ?? '10ML Fragrance Index', title: info?.title, version: info?.version ?? PACKAGE_VERSION, icons: info?.icons },
    {
      capabilities: {
        ...(caps.tools ? { tools: {} } : {}),
        ...(caps.prompts ? { prompts: {} } : {}),
        ...(caps.resources ? { resources: {} } : {}),
        ...(caps.completions ? { completions: {} } : {}),
      },
      instructions: remote.getInstructions(),
    },
  );

  if (caps.tools) {
    server.setRequestHandler(ListToolsRequestSchema, (req) => remote.request({ method: 'tools/list', params: req.params }, ListToolsResultSchema));
    server.setRequestHandler(CallToolRequestSchema, (req) => remote.request({ method: 'tools/call', params: req.params }, CallToolResultSchema));
  }
  if (caps.prompts) {
    server.setRequestHandler(ListPromptsRequestSchema, (req) => remote.request({ method: 'prompts/list', params: req.params }, ListPromptsResultSchema));
    server.setRequestHandler(GetPromptRequestSchema, (req) => remote.request({ method: 'prompts/get', params: req.params }, GetPromptResultSchema));
  }
  if (caps.resources) {
    server.setRequestHandler(ListResourcesRequestSchema, (req) => remote.request({ method: 'resources/list', params: req.params }, ListResourcesResultSchema));
    server.setRequestHandler(ListResourceTemplatesRequestSchema, (req) => remote.request({ method: 'resources/templates/list', params: req.params }, ListResourceTemplatesResultSchema));
    server.setRequestHandler(ReadResourceRequestSchema, (req) => remote.request({ method: 'resources/read', params: req.params }, ReadResourceResultSchema));
  }
  if (caps.completions) {
    server.setRequestHandler(CompleteRequestSchema, (req) => remote.request({ method: 'completion/complete', params: req.params }, CompleteResultSchema));
  }

  const stop = async () => {
    await Promise.allSettled([server.close(), remote.close()]);
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  server.onclose = () => void remote.close().finally(() => process.exit(0));

  await server.connect(new StdioServerTransport());
}

main().catch((err) => {
  console.error(`10ML Fragrance Index: could not reach ${REMOTE_URL}: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
