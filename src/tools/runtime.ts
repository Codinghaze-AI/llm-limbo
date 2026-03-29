import path from "node:path";
import { readJSON, writeJSON, listFiles, deleteFile, getDataRoot } from "../store";
import { registerToolInDomain, unregisterToolFromDomain, loadRegistry } from "../registry";
import type { ToolDefinition, ToolManifest, ToolParam } from "../types";

const TOOLS_FILE = "tools.json";

function toolsPath(domain: string): string {
  return path.join("domains", domain, TOOLS_FILE);
}

async function loadToolManifest(domain: string): Promise<ToolManifest> {
  return readJSON<ToolManifest>(toolsPath(domain), { tools: {} });
}

async function saveToolManifest(domain: string, manifest: ToolManifest): Promise<void> {
  await writeJSON(toolsPath(domain), manifest);
}

/** Build the sandbox context injected into every tool handler. */
function buildContext(domain: string) {
  const domainDataPrefix = path.join("domains", domain, "data") + path.sep;

  function assertDomainPath(relPath: string) {
    // Tools may only read/write within their own domain's data directory
    const normalized = path.normalize(relPath);
    if (!normalized.startsWith(domainDataPrefix) && !relPath.startsWith(`domains/${domain}/data/`)) {
      throw new Error(`Tool tried to access path outside its domain: ${relPath}`);
    }
  }

  return {
    readJSON: async (relPath: string, fallback: unknown) => {
      assertDomainPath(relPath);
      return readJSON(relPath, fallback);
    },
    writeJSON: async (relPath: string, data: unknown) => {
      assertDomainPath(relPath);
      return writeJSON(relPath, data);
    },
    listFiles: async (pattern: string) => {
      assertDomainPath(pattern);
      return listFiles(pattern);
    },
    deleteFile: async (relPath: string) => {
      assertDomainPath(relPath);
      return deleteFile(relPath);
    },
    // Utility helpers exposed to tool handlers
    lastNDays: (n: number): string[] => {
      const days: string[] = [];
      for (let i = 0; i < n; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        days.push(d.toISOString().split("T")[0] as string);
      }
      return days;
    },
    today: () => new Date().toISOString().split("T")[0] as string,
    domain,
  };
}

export async function generateTool(definition: ToolDefinition): Promise<void> {
  const { name, domain, description, parameters, handlerSource } = definition;

  if (!/^[a-z0-9_-]{1,64}$/.test(name)) {
    throw new Error(`Invalid tool name "${name}". Use lowercase letters, numbers, hyphens, underscores (e.g. "calories_log_meal").`);
  }

  if (!name.startsWith(`${domain}_`)) {
    throw new Error(`Tool name "${name}" must start with domain prefix "${domain}_".`);
  }

  // Validate the handler source compiles
  try {
    new Function("context", `"use strict";\nreturn async (args) => { const { readJSON, writeJSON, listFiles, deleteFile, lastNDays, today, domain } = context;\n${handlerSource}\n};`);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`Handler source failed to parse: ${msg}`);
  }

  const manifest = await loadToolManifest(domain);

  manifest.tools[name] = { domain, description, parameters, handlerSource };
  await saveToolManifest(domain, manifest);
  await registerToolInDomain(domain, name);
}

export async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const registry = await loadRegistry();
  const domain = Object.keys(registry.domains).find((d) => name.startsWith(`${d}_`));
  if (!domain) throw new Error(`No domain found for tool "${name}". Tool names must start with a registered domain prefix.`);

  const manifest = await loadToolManifest(domain);
  const tool = manifest.tools[name];
  if (!tool) throw new Error(`Tool "${name}" not found in domain "${domain}".`);

  const context = buildContext(domain);

  // Build and execute handler using new Function for Phase 0
  // Phase 2 will replace this with a proper sandbox (isolated-vm)
  const handler = new Function(
    "context",
    `"use strict";\nreturn async (args) => { const { readJSON, writeJSON, listFiles, deleteFile, lastNDays, today, domain } = context;\n${tool.handlerSource}\n};`
  )(context);

  return handler(args);
}

export async function listTools(domainFilter?: string): Promise<Array<{ name: string; domain: string; description: string; parameters: Record<string, ToolParam> }>> {
  const registry = await loadRegistry();
  const domains = domainFilter ? [domainFilter] : Object.keys(registry.domains);
  const results = [];

  for (const d of domains) {
    if (!registry.domains[d]) continue;
    const manifest = await loadToolManifest(d);
    for (const [toolName, tool] of Object.entries(manifest.tools)) {
      results.push({
        name: toolName,
        domain: d,
        description: tool.description,
        parameters: tool.parameters,
      });
    }
  }

  return results;
}
