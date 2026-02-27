# Requirements Document: opencog-cogutil Skill

## Overview

This document captures the requirements and background information for creating the `opencog-cogutil` skill. This skill will help developers work with the OpenCog cogutil C++ utility library.

## Source Reference

- **Repository:** https://github.com/opencog/cogutil
- **Project:** OpenCog Cogutil - C++ utility library for the OpenCog project

## Skill Description

The `opencog-cogutil` skill provides guidance for developers working with the OpenCog cogutil C++ utility library. Cogutil is a collection of utility functions and classes used throughout the OpenCog AI framework, providing:

- **Threading utilities** - Thread pool, concurrent queue, and synchronization primitives
- **Logger functionality** - Flexible logging with multiple severity levels and output targets
- **Configuration management** - Config file parsing and runtime configuration
- **Random number generators** - Various RNG implementations for AI/ML workloads
- **Benchmarking tools** - Performance measurement utilities
- **Unit testing framework** - Testing infrastructure for OpenCog components

## Primary Use Cases

1. **Setting up cogutil development environment** - Building and installing cogutil from source
2. **Using the Logger** - Configuring and using the cogutil logging system
3. **Threading patterns** - Implementing concurrent operations using cogutil's thread pool
4. **Configuration management** - Reading and managing application configuration
5. **Writing unit tests** - Creating tests using cogutil's testing framework
6. **Integrating with OpenCog** - Using cogutil as a foundation for OpenCog development

## Target Audience

- C++ developers working with the OpenCog AI framework
- AI/AGI researchers building on OpenCog
- Developers extending or contributing to OpenCog projects
- Those integrating OpenCog components into their applications

## Key Features to Document

### Build and Installation
- CMake-based build system
- Dependencies (Boost, etc.)
- Platform-specific instructions (Linux, macOS)

### Core Components
- Logger class and usage
- Config class for configuration management  
- Thread pool implementation
- Random number generators
- Benchmark utilities

### Common Patterns
- Logging best practices
- Thread-safe operations
- Configuration file format
- Unit test structure

## Relevant Documentation

### Agent Skills Specification
- Overview: https://agentskills.io/
- Specification: https://agentskills.io/specification
- Best Practices: https://agentskills.io/best-practices

### OpenCog Resources
- Cogutil GitHub: https://github.com/opencog/cogutil
- OpenCog Wiki: https://wiki.opencog.org/
- OpenCog Documentation: https://wiki.opencog.org/w/Category:Documentation

## Technical Requirements

### Cross-Platform Compatibility

Any non-trivial scripts included in the skill should provide both bash (`.sh`) and PowerShell (`.ps1`) versions for compatibility with:
- Linux environments
- macOS environments  
- Windows environments

Trivial one-liners may use bash only.

### Tool Preference

- This skill is primarily for cogutil development, a C++ utility library unrelated to Azure
- No Azure-specific tooling (azd, Azure CLI) is required for this skill

### Relevant MCP Tools

Since cogutil is a C++ development library (not Azure-specific), relevant MCP tools are limited:

| Tool | Description |
|------|-------------|
| `file_operations` | Reading/writing configuration files |
| `terminal` | Running build commands (cmake, make) |
| `documentation` | Accessing cogutil documentation |

> **Note:** This skill focuses on local C++ development rather than Azure services, so Azure MCP tools may not be directly applicable.

## Testing Requirements

Tests must be created following the patterns documented in `/tests/AGENTS.md`:

### 1. Unit Tests (`tests/opencog-cogutil/unit.test.ts`)
- Validate SKILL.md metadata (name, description)
- Test description length and trigger phrase inclusion
- Verify frontmatter format compliance

### 2. Trigger Tests (`tests/opencog-cogutil/triggers.test.ts`)

**Should Trigger (at least 5):**
- "How do I install cogutil?"
- "Help me configure the OpenCog logger"
- "What threading utilities does cogutil provide?"
- "How do I build OpenCog from source?"
- "Show me cogutil configuration examples"

**Should NOT Trigger (at least 5):**
- "What is the weather today?"
- "Help me deploy to Azure"
- "Write a poem about clouds"
- "How do I use AWS Lambda?"
- "Explain Kubernetes networking"

### 3. Integration Tests (`tests/opencog-cogutil/integration.test.ts`)
- Mock MCP tool interactions (if applicable)
- Test error handling for build failures
- Test cogutil-specific scenarios

### Test Setup
```bash
cp -r tests/_template tests/opencog-cogutil
# Update SKILL_NAME in each test file to 'opencog-cogutil'
# Add trigger prompts specific to the skill
npm test -- --testPathPattern=opencog-cogutil
```

## Skill Structure

The skill should be created at:
```
plugin/skills/opencog-cogutil/
├── SKILL.md              # Main skill file with frontmatter
└── references/           # Optional subdirectory for additional docs
    ├── installation.md   # Build and installation guide
    ├── logger.md         # Logger usage documentation
    └── threading.md      # Threading utilities guide
```

## SKILL.md Requirements

Per the skill-files.instructions.md, the SKILL.md must include:

1. **Frontmatter** with `name` and `description`
2. **Quick Reference** - Summary table with key properties
3. **When to Use This Skill** - Clear activation scenarios
4. **MCP Tools** - Table of available tools (if applicable)
5. **Workflow/Steps** - Step-by-step processes
6. **Error Handling** - Common errors and remediation

## Notes for Plan Agent

This requirements document is prepared for handoff to the Plan agent for detailed implementation planning. Key considerations:

1. This is a C++ development library skill, not Azure-specific
2. Focus should be on build/installation, core components, and common patterns
3. The skill should help developers understand and use cogutil effectively
4. Tests should follow the established patterns in the repository

---

*Document prepared by Skill Creator Agent for handoff to Plan Agent*
