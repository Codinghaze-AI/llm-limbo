# Limbo

**The LLM-controlled data layer.**

An MCP server where AI agents define schemas, generate their own CRUD tools, and manage structured application data — no database required.

---

## What is Limbo?

Most AI assistants hit a wall when a user wants to track something new. The schema doesn't exist. The API wasn't built for it. The assistant can only apologize.

Limbo removes that wall. When a user says *"start tracking my calories"*, the LLM creates the data domain, generates its own tools to interact with it, and starts managing the data — all on the fly.

**Limbo is not a memory layer.** Memory systems (Mem0, LangMem) store facts *about* users. Limbo stores *user data the LLM manages* — calorie logs, budgets, habit trackers, inventories.

**Limbo is not text-to-SQL.** There's no pre-defined schema. The LLM doesn't query a human-designed database — it builds and operates its own.

---

## How it works

```
┌─────────────────────────────────────────────────┐
│                  LLM Agent                      │
│          (converses with the user)              │
└──────────────────┬──────────────────────────────┘
                   │ MCP Protocol
                   ▼
┌─────────────────────────────────────────────────┐
│              Limbo MCP Server                   │
│                                                 │
│  ┌─────────────┐  ┌──────────────────────────┐  │
│  │  Registry   │  │  Domain Manager          │  │
│  │  (manifest) │  │  (create/evolve domains) │  │
│  └─────────────┘  └──────────────────────────┘  │
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │  Tool Runtime                               ││
│  │  (loads & executes LLM-generated JS tools)  ││
│  └─────────────────────────────────────────────┘│
│                                                 │
│  ┌─────────────────────────────────────────────┐│
│  │  Store (pluggable)                          ││
│  │  v1: JSON files on disk                     ││
│  │  v2: Redis / SQLite / Postgres (roadmap)    ││
│  └─────────────────────────────────────────────┘│
└─────────────────────────────────────────────────┘
```

Three components:

1. **Registry** — a `registry.json` manifest tracking every domain the LLM has created: name, purpose, data pattern, and tool list.
2. **Store** — flat JSON files on disk. No database engine needed. Swappable to Redis/SQLite/Postgres later without changing the tool interface.
3. **Tool Runtime** — the LLM generates JavaScript tool handlers, Limbo registers and executes them. The tools and data co-evolve as the LLM's needs change.

---

## Quickstart

**Prerequisites:** [Bun](https://bun.sh) installed.

```bash
git clone https://github.com/Codinghaze-AI/llm-limbo.git
cd llm-limbo
bun install
bun start
```

The server runs over **stdio** (standard MCP transport). Connect it to any MCP-compatible agent.

---

## Connect to Claude

### Claude Desktop

Add to your `claude_desktop_config.json`:

**Mac:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "limbo": {
      "command": "bun",
      "args": ["run", "/absolute/path/to/llm-limbo/index.ts"],
      "env": {
        "LIMBO_DATA_DIR": "/absolute/path/to/llm-limbo/data"
      }
    }
  }
}
```

Restart Claude Desktop. You'll see Limbo's tools available in the tool picker.

### Claude Code (CLI)

Add to your project's `.mcp.json` or run:

```bash
claude mcp add limbo -- bun run /absolute/path/to/llm-limbo/index.ts
```

---

## Available tools

| Tool | Description |
|------|-------------|
| `limbo:create_domain` | Register a new data domain with a name, purpose, and file pattern |
| `limbo:list_domains` | List all domains and their metadata |
| `limbo:describe_domain` | Get full details on a domain including its tools |
| `limbo:delete_domain` | Delete a domain and all its data (requires `confirm: true`) |
| `limbo:generate_tool` | Generate and register a JS tool handler for a domain |
| `limbo:execute_tool` | Execute a previously generated tool by name |
| `limbo:list_tools` | List all generated tools, optionally filtered by domain |

---

## Example: Calorie tracker

Tell Claude: *"I want to start tracking my calories."*

Claude will:
1. Call `limbo:create_domain` to register a `calories` domain
2. Call `limbo:generate_tool` to generate `calories:log_meal`, `calories:daily_total`, and `calories:weekly_summary`
3. Use those tools to log meals and query totals — all in the same conversation

The data lives in `data/domains/calories/data/YYYY-MM-DD.json`. The tools live in `data/domains/calories/tools.json`. Everything is readable, editable, and portable.

---

## Configuration

| Env var | Default | Description |
|---------|---------|-------------|
| `LIMBO_DATA_DIR` | `./data` | Where Limbo stores all domain data and the registry |

---

## Roadmap

- **Phase 0** (now) — Core MCP server, registry, flat JSON store, tool runtime
- **Phase 1** — Tool versioning, schema migration, input validation, CI hardening
- **Phase 2** — JS sandbox (`isolated-vm`), multi-tenancy, auth, audit logging
- **Phase 3** — Pluggable storage backends (Redis, SQLite, Postgres)
- **Phase 4** — Cross-domain queries, domain analytics, schema inference
- **Phase 5** — npm package, Docker image, docs site, agent integration guides

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT
