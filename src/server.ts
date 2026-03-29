import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { createDomain, listDomains, describeDomain, deleteDomain } from "./registry";
import { generateTool, executeTool, listTools } from "./tools/runtime";

const BUILTIN_TOOLS: Tool[] = [
  {
    name: "limbo_create_domain",
    description: "Register a new data domain. The LLM defines the name, purpose, and data file pattern.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Domain name (lowercase, alphanumeric, hyphens, underscores)" },
        purpose: { type: "string", description: "Human-readable description of what this domain tracks" },
        dataPattern: { type: "string", description: "File path pattern for data files, e.g. domains/calories/data/{date}.json" },
      },
      required: ["name", "purpose", "dataPattern"],
    },
  },
  {
    name: "limbo_list_domains",
    description: "List all registered data domains and their metadata.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "limbo_describe_domain",
    description: "Get full details about a specific domain including its registered tools.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Domain name to describe" },
      },
      required: ["name"],
    },
  },
  {
    name: "limbo_delete_domain",
    description: "Delete a domain and all its data. Requires explicit confirmation.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Domain name to delete" },
        confirm: { type: "boolean", description: "Must be true to proceed with deletion" },
      },
      required: ["name", "confirm"],
    },
  },
  {
    name: "limbo_generate_tool",
    description: "Generate and register a new tool for a domain. Provide the tool name, description, parameter schema, and JavaScript handler source.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: 'Tool name in "domain_action" format, e.g. "calories_log_meal"' },
        domain: { type: "string", description: "Domain this tool belongs to" },
        description: { type: "string", description: "What this tool does" },
        parameters: {
          type: "object",
          description: 'Parameter schema as a map of param name to { type, description, required, default }',
        },
        handlerSource: {
          type: "string",
          description: "JavaScript function body. Has access to: readJSON(path, fallback), writeJSON(path, data), listFiles(pattern), deleteFile(path), lastNDays(n), today(), domain. Must end with a return statement returning the result.",
        },
      },
      required: ["name", "domain", "description", "parameters", "handlerSource"],
    },
  },
  {
    name: "limbo_execute_tool",
    description: "Execute a previously generated tool by name with the given arguments.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: 'Tool name, e.g. "calories_log_meal"' },
        args: { type: "object", description: "Arguments matching the tool's parameter schema" },
      },
      required: ["name"],
    },
  },
  {
    name: "limbo_list_tools",
    description: "List all generated tools, optionally filtered by domain.",
    inputSchema: {
      type: "object",
      properties: {
        domain: { type: "string", description: "Filter by domain name (optional)" },
      },
    },
  },
];

function ok(data: unknown) {
  return {
    content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }],
  };
}

function err(message: string) {
  return {
    content: [{ type: "text" as const, text: `Error: ${message}` }],
    isError: true,
  };
}

export function createServer(): Server {
  const server = new Server(
    { name: "limbo", version: "0.1.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: BUILTIN_TOOLS,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params;

    try {
      switch (name) {
        case "limbo_create_domain": {
          const { name: dName, purpose, dataPattern } = args as {
            name: string;
            purpose: string;
            dataPattern: string;
          };
          const domain = await createDomain(dName, purpose, dataPattern);
          return ok({ domainName: dName, ...domain });
        }

        case "limbo_list_domains": {
          const domains = await listDomains();
          return ok({ domains });
        }

        case "limbo_describe_domain": {
          const { name: dName } = args as { name: string };
          const domain = await describeDomain(dName);
          return ok(domain);
        }

        case "limbo_delete_domain": {
          const { name: dName, confirm } = args as { name: string; confirm: boolean };
          await deleteDomain(dName, confirm);
          return ok({ deleted: dName });
        }

        case "limbo_generate_tool": {
          const { name: tName, domain, description, parameters, handlerSource } = args as {
            name: string;
            domain: string;
            description: string;
            parameters: Record<string, unknown>;
            handlerSource: string;
          };
          await generateTool({
            name: tName,
            domain,
            description,
            parameters: parameters as Record<string, import("./types").ToolParam>,
            handlerSource,
          });
          return ok({ generated: tName, domain });
        }

        case "limbo_execute_tool": {
          const { name: tName, args: toolArgs = {} } = args as {
            name: string;
            args?: Record<string, unknown>;
          };
          const result = await executeTool(tName, toolArgs);
          return ok(result);
        }

        case "limbo_list_tools": {
          const { domain } = args as { domain?: string };
          const tools = await listTools(domain);
          return ok({ tools });
        }

        default:
          return err(`Unknown tool: ${name}`);
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return err(message);
    }
  });

  return server;
}

export async function startServer(): Promise<void> {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Limbo MCP server running on stdio");
}
