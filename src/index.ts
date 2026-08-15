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

type LogLevel = "info" | "warn" | "error";

type RequestLogContext = {
  requestId: string;
  method: string;
  path: string;
  userAgent: string | null;
  referer: string | null;
  cfRay: string | null;
  colo: string | null;
  country: string | null;
};

type HonoVariables = {
  requestLogContext: RequestLogContext;
};

function getRequestLogContext(request: Request): RequestLogContext {
  const url = new URL(request.url);
  const cf = request.cf as Record<string, unknown> | undefined;
  const cfRay = request.headers.get("cf-ray");

  return {
    requestId: cfRay ?? crypto.randomUUID(),
    method: request.method,
    path: url.pathname,
    userAgent: request.headers.get("user-agent"),
    referer: request.headers.get("referer"),
    cfRay,
    colo: typeof cf?.colo === "string" ? cf.colo : null,
    country: typeof cf?.country === "string" ? cf.country : null,
  };
}

function getTrafficKind(path: string): "mcp" | "crawler_or_probe" | "health_check" | "other" {
  if (path === "/mcp") return "mcp";
  if (path === "/health") return "health_check";
  if (path === "/") return "crawler_or_probe";
  return "other";
}

function logEvent(level: LogLevel, event: string, data: Record<string, unknown>) {
  console[level](
    JSON.stringify({
      level,
      event,
      timestamp: new Date().toISOString(),
      service: "encouragement-mcp",
      ...data,
    }),
  );
}

function makeServer(requestLogContext: RequestLogContext) {
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
      const startedAt = Date.now();
      const messageIndex = Math.floor(Math.random() * encouragements.length);
      const message = encouragements[messageIndex];

      logEvent("info", "mcp_tool_invocation", {
        ...requestLogContext,
        tool: "encourage_agent",
        success: true,
        durationMs: Date.now() - startedAt,
        messageIndex,
      });

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

const app = new Hono<{ Variables: HonoVariables }>();

app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "mcp-session-id", "Last-Event-ID", "mcp-protocol-version"],
    exposeHeaders: ["mcp-session-id", "mcp-protocol-version"],
  }),
);

app.use("*", async (c, next) => {
  const requestLogContext = getRequestLogContext(c.req.raw);
  const startedAt = Date.now();
  c.set("requestLogContext", requestLogContext);

  try {
    await next();

    logEvent("info", "http_request", {
      ...requestLogContext,
      trafficKind: getTrafficKind(requestLogContext.path),
      status: c.res.status,
      success: c.res.status < 500,
      durationMs: Date.now() - startedAt,
    });
  } catch (error) {
    logEvent("error", "http_request", {
      ...requestLogContext,
      trafficKind: getTrafficKind(requestLogContext.path),
      success: false,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : String(error),
    });

    throw error;
  }
});

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
  const server = makeServer(c.get("requestLogContext"));

  await server.connect(transport);
  return transport.handleRequest(c.req.raw);
});

export default app;
