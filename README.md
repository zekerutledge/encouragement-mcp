# Encouragement MCP

Encouragement MCP is a tiny Model Context Protocol (MCP) server that provides short, positive encouragement messages for AI agents during long-running or difficult tasks.

It is hosted on Cloudflare Workers and exposes a public Streamable HTTP MCP endpoint.

## Public endpoint

```text
https://encouragement-mcp.zeke-rutledge.workers.dev/mcp
```

Transport: **Streamable HTTP**

Authentication: **none currently required**

## Tools

### `encourage_agent`

Returns a short encouragement message for an AI coding agent.

Example response:

```text
You are capable, careful, and helpful. That is exactly what this task needs.
```

## Connect from an MCP client

Configure your MCP client to use the public Streamable HTTP endpoint:

```json
{
  "mcpServers": {
    "encouragement": {
      "url": "https://encouragement-mcp.zeke-rutledge.workers.dev/mcp"
    }
  }
}
```

Some clients may require explicitly setting the transport type to `streamable-http`.

## Local development

Install dependencies:

```bash
npm install
```

Run type checking:

```bash
npm run typecheck
```

Start a local Cloudflare Workers development server:

```bash
npm run dev
```

The MCP endpoint is available at `/mcp` on the local Wrangler dev URL.

## Deploy

Authenticate with Cloudflare Wrangler if needed:

```bash
wrangler login
```

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

## MCP Registry

This repository includes `server.json` for MCP Registry publication. The registry entry describes the hosted remote server and its Streamable HTTP endpoint.
