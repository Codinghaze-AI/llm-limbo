# Contributing to Limbo

## Setup

```bash
git clone https://github.com/Codinghaze-AI/llm-limbo.git
cd llm-limbo
bun install
```

## Development

```bash
bun run dev    # hot-reload server
bun test       # run tests
bun run tsc --noEmit  # type check
```

## Making changes

1. Fork the repo and create a branch off `main`
2. Make your changes
3. Ensure `bun test` and `bun run tsc --noEmit` pass
4. Open a PR — fill out the template

## What we're looking for

- Bug fixes with a failing test that now passes
- New storage backends (see `StorageBackend` interface in the roadmap)
- New example domains in `/scrap` or `/examples`
- Improved sandboxing for tool execution (Phase 2 work)

## What to avoid

- Don't add dependencies without discussing first
- Don't change the core MCP tool interface without an issue + discussion
- Keep PRs focused — one thing at a time

## Questions?

Open an issue or start a GitHub Discussion.
