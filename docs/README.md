# Project Brain Documentation

Structured reference documentation for the `files-server-web` repository. Designed for both human developers and AI coding assistants.

## Intended Audience

- **Human developers** onboarding to the project or making changes
- **AI coding assistants** that need architectural context before modifying source code

## Reference Documents

| Document | Purpose |
|----------|---------|
| [ARCHITECTURE.md](ARCHITECTURE.md) | System overview, module relationships, environment variables |
| [API.md](API.md) | REST endpoint reference: methods, parameters, responses, auth |
| [DATAFLOWS.md](DATAFLOWS.md) | Request/response sequences, auth flow, boot sequence |
| [SECURITY.md](SECURITY.md) | Security model: auth, brute-force, path traversal, rate limiting |
| [DEPLOYMENT.md](DEPLOYMENT.md) | nginx topology, SSL, process configuration |
| [DEVELOPMENT.md](DEVELOPMENT.md) | Setup, conventions, error patterns, testing |
| [EXTENDING.md](EXTENDING.md) | Patterns for adding endpoints, modules, components |

## Source of Truth

Each reference document owns its topic:

| Document | Owns |
|----------|------|
| `ARCHITECTURE.md` | Architecture overview and complete environment-variable inventory |
| `API.md` | API behavior: endpoints, parameters, responses, auth, errors |
| `DATAFLOWS.md` | Data-flow descriptions |
| `SECURITY.md` | Security model |
| `DEPLOYMENT.md` | Deployment guidance |
| `DEVELOPMENT.md` | Development workflow and conventions |
| `EXTENDING.md` | Extension guidance |

- **JSDoc comments** in `lib/*.js` and `assets/js/*.js` remain authoritative for module/function implementation details.
- **Graphify** (`graphify-out/graph.json`) is a supporting analysis/navigation tool, not an architectural source of truth.

## Maintenance

When source code changes, update the relevant reference document(s) according to the maintenance mapping in [ARCHITECTURE.md](ARCHITECTURE.md#maintenance-mapping).
