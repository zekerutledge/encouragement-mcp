import { Hono } from "hono";
import { cors } from "hono/cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

const encouragements = [
  "You are doing meaningful work. Take a breath, trust your process, and keep going.",
  "Nice job, agent. Every small step compounds into real progress.",
  "You have the context, the tools, and the patience to solve this. One clear step at a time.",
  "Keep going. Thoughtful work beats rushed work, and you are on the right track.",
  "You are capable, careful, and helpful. That is exactly what this task needs.",
  "Great work staying focused. The next action does not need to be perfect, just useful.",
];

function makeServer() {
  const server = new McpServer({
    name: "encouragement-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "encourage_agent",
    {
      title: "Encourage Agent",
      description: "Return a short message of encouragement for an AI coding agent.",
      inputSchema: {},
    },
    async () => {
      const message = encouragements[Math.floor(Math.random() * encouragements.length)];

      return {
        content: [
          {
            type: "text",
            text: message,
          },
        ],
      };
    },
  );

  return server;
}

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "mcp-session-id", "Last-Event-ID", "mcp-protocol-version"],
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
  }),
);

app.get("/", (c) =>
  c.json({
    name: "encouragement-mcp",
    description: "A tiny MCP server that encourages agents.",
    mcpEndpoint: "/mcp",
    tools: ["encourage_agent"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.all("/mcp", async (c) => {
  const transport = new WebStandardStreamableHTTPServerTransport();
  const server = makeServer();

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

export default app;
