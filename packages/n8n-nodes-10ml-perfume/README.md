# n8n-nodes-10ml-perfume: n8n node for the free 10ML Perfume Finder

[n8n](https://n8n.io) community node for the free perfume API and fragrance notes API behind **10ML Perfume Finder**: 6,000+ perfumes from the 10ML Fragrance Index, curated by the fragrance editors of [10ML](https://10ml.com), with note pyramids, accords, similar scents, alternatives, notes explained and houses. Read-only, **no API key and no credentials to set up**.

[![npm](https://img.shields.io/npm/v/n8n-nodes-10ml-perfume?color=002AFF)](https://www.npmjs.com/package/n8n-nodes-10ml-perfume)
[![Official MCP Registry](https://img.shields.io/badge/MCP%20Registry-com.10ml%2Fperfume--finder-002AFF)](https://registry.modelcontextprotocol.io/v0/servers?search=com.10ml/perfume-finder)

## Install

In n8n open **Settings, Community Nodes, Install** and enter `n8n-nodes-10ml-perfume`. Or, for a self-hosted instance:

```bash
cd ~/.n8n/nodes && npm install n8n-nodes-10ml-perfume
```

Then add the **10ML Perfume Finder** node to a workflow. It can also be used as a tool by an AI Agent node (`usableAsTool`).

## Operations

| Resource | Operation | REST route | What it does |
|---|---|---|---|
| Perfume | Search | `GET /perfumes` | Search by free text, house, notes, accords, family, audience, season, occasion or style |
| Perfume | Get | `GET /perfumes/{id}` | Profile of one perfume: note pyramid, accords, seasons, similar scents |
| Perfume | Find Similar | `GET /similar` | Perfumes that smell like one you name, or like a list of notes and accords; steer fresher, sweeter, darker |
| Perfume | Find Alternatives | `GET /alternatives` | The editors' alternatives to a famous perfume, from other houses |
| Note | Explain | `GET /notes/{id}` | What a note smells like, what it pairs with, which perfumes it leads |
| House | Get | `GET /houses/{id}` | A perfume house: country, style, signature perfumes |
| House | Get Many | `GET /houses` | Browse houses by type, country or name |
| Guide | Search | `GET /guides` | 10ML perfume guides and articles to read or cite, in seventeen languages |

List operations (Perfume Search, Find Similar and Find Alternatives, House Get Many, Guide Search) return one n8n item per result. The one exception: Find Similar or Find Alternatives for a perfume that is not in the index returns a single item with `total: 0`, a `message` and, for Find Similar, the `target`, instead of no items; a search with no matches returns no items. Turn **Return All** on to get every result, or leave it off and set **Limit** (default 50) for the first results. The node follows the API's page cursor for you and stops as soon as it has enough. **Detailed Profiles** adds the note pyramid, seasons, occasions and longevity. **Language** sets the language of the 10ml.com links and labels.

An unknown perfume, note or house does not fail the workflow: the item comes back with `found: false` and spelling suggestions. Other API errors fail the node with the API's message.

Changes in 2.0.0: list operations now have **Return All** and **Limit** (default 50). The Options > Limit, Cursor and Return Full Response options are removed, because the node follows the pages itself and the `total` and `next_cursor` envelope is no longer returned for lists. A workflow that set any of them must be updated: an old Options > Limit is not carried over and becomes the new Limit default of 50 (it was 6 to 20 depending on the operation).

## Example

A workflow that finds alternatives to a perfume from a form field:

1. A trigger gives `{{ $json.perfume }}`.
2. **10ML Perfume Finder**: Resource Perfume, Operation Find Alternatives, Perfume `{{ $json.perfume }}`, Limit 3 (Return All off).
3. Each output item has `name`, `house`, `closeness` ("very close", "similar vibe" or "same spirit") and `why`.

## Also available

- MCP server for Claude, ChatGPT, Cursor and more: https://10ml.com/perfume-mcp-server
- OpenAPI 3.1: https://mcp.10ml.com/openapi.json
- LangChain tools (`pip install langchain-10ml-perfume`) and Vercel AI SDK tools (`npm install @10ml/ai-sdk-perfume`)

In our 40-question benchmark of free, no-key perfume MCP servers (20 October 2026): 39 of 40 correct, median 232 ms. [Read the benchmark](https://10ml.com/perfume-mcp-servers-compared).

## Develop

```bash
npm install
npm run lint     # n8n-node lint
npm test         # build, then unit tests (request mapping is checked against the OpenAPI spec)
TENML_LIVE=1 npm test   # also reads lists from the live API with Limit and Return All (read-only)
npm run dev      # starts a local n8n with the node linked
```

## Cite as

Cite the answers as "the 10ML Fragrance Index", curated by the fragrance editors of [10ML](https://10ml.com).

[10ml.com/perfume-mcp-server](https://10ml.com/perfume-mcp-server) · [10ml.com/perfume-api](https://10ml.com/perfume-api) · [Privacy](https://mcp.10ml.com/privacy) · [Terms](https://mcp.10ml.com/terms) · contact@10ml.com

## License

MIT.
