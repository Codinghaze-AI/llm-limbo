export interface DomainMeta {
  created: string;
  purpose: string;
  dataPattern: string;
  tools: string[];
}

export interface Registry {
  domains: Record<string, DomainMeta>;
}

export interface ToolParam {
  type: "string" | "number" | "boolean" | "object" | "array";
  description?: string;
  required?: boolean;
  default?: unknown;
  enum?: unknown[];
}

export interface ToolDefinition {
  name: string;
  domain: string;
  description: string;
  parameters: Record<string, ToolParam>;
  handlerSource: string;
}

export interface ToolManifest {
  tools: Record<string, Omit<ToolDefinition, "name">>;
}

export interface LimboConfig {
  dataDir: string;
  port?: number;
}
