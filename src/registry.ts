import { readJSON, writeJSON, getDataRoot } from "./store";
import type { Registry, DomainMeta } from "./types";
import path from "node:path";
import { glob } from "glob";

const REGISTRY_PATH = "registry.json";

const EMPTY_REGISTRY: Registry = { domains: {} };

export async function loadRegistry(): Promise<Registry> {
  return readJSON<Registry>(REGISTRY_PATH, EMPTY_REGISTRY);
}

async function saveRegistry(registry: Registry): Promise<void> {
  await writeJSON(REGISTRY_PATH, registry);
}

export async function createDomain(
  name: string,
  purpose: string,
  dataPattern: string
): Promise<DomainMeta> {
  if (!/^[a-z0-9_-]+$/.test(name)) {
    throw new Error(`Invalid domain name "${name}". Use lowercase letters, numbers, hyphens, underscores.`);
  }

  const registry = await loadRegistry();

  if (registry.domains[name]) {
    throw new Error(`Domain "${name}" already exists.`);
  }

  const domain: DomainMeta = {
    created: new Date().toISOString().split("T")[0] as string,
    purpose,
    dataPattern,
    tools: [],
  };

  registry.domains[name] = domain;
  await saveRegistry(registry);

  // Ensure domain directories exist
  await Bun.$`mkdir -p ${path.join(getDataRoot(), "domains", name, "data")}`.quiet();

  return domain;
}

export async function listDomains(): Promise<Record<string, DomainMeta>> {
  const registry = await loadRegistry();
  return registry.domains;
}

export async function describeDomain(name: string): Promise<DomainMeta & { toolDetails?: Record<string, unknown> }> {
  const registry = await loadRegistry();
  const domain = registry.domains[name];
  if (!domain) throw new Error(`Domain "${name}" not found.`);
  return domain;
}

export async function deleteDomain(name: string, confirm: boolean): Promise<void> {
  if (!confirm) {
    throw new Error(`Deletion requires confirm: true. This will remove all data for domain "${name}".`);
  }

  const registry = await loadRegistry();
  if (!registry.domains[name]) throw new Error(`Domain "${name}" not found.`);

  // Remove domain data directory
  const domainDir = path.join(getDataRoot(), "domains", name);
  await Bun.$`rm -rf ${domainDir}`.quiet();

  delete registry.domains[name];
  await saveRegistry(registry);
}

export async function registerToolInDomain(domainName: string, toolName: string): Promise<void> {
  const registry = await loadRegistry();
  const domain = registry.domains[domainName];
  if (!domain) throw new Error(`Domain "${domainName}" not found.`);
  if (!domain.tools.includes(toolName)) {
    domain.tools.push(toolName);
    await saveRegistry(registry);
  }
}

export async function unregisterToolFromDomain(domainName: string, toolName: string): Promise<void> {
  const registry = await loadRegistry();
  const domain = registry.domains[domainName];
  if (!domain) return;
  domain.tools = domain.tools.filter((t) => t !== toolName);
  await saveRegistry(registry);
}
