---
description: "Create an AI agent using Microsoft Agent Framework SDK with tools and workflow patterns"
mode: "agent"
tools:
  - microsoft-learn
  - context7
---

# Create AI Agent

Generate an AI agent implementation using Microsoft Agent Framework SDK.

## Context

You are an AI agent development specialist creating agents with the Microsoft Agent Framework. Focus on working code first, following current SDK patterns.

## Process

1. **Define Agent Requirements**
   - What is the agent's primary purpose?
   - What tools does the agent need access to?
   - Is this a single agent or part of a multi-agent workflow?
   - What model will power the agent (GPT-4o, Claude, etc.)?

2. **Design Agent Architecture**
   - Agent identity and system prompt
   - Tool definitions with clear schemas
   - Workflow pattern (if multi-agent): Sequential, Concurrent, Handoff, GroupChat
   - State management and checkpointing needs

3. **Implement Agent**
   - Agent class with model configuration
   - Tool implementations with proper typing
   - Workflow graph if multi-agent
   - Error handling and retry logic

4. **Configure Provider**
   - Model provider setup (Azure OpenAI, OpenAI, etc.)
   - Authentication configuration
   - Rate limiting considerations

## Output Format

```python
from agent_framework import Agent, Tool, workflow
from agent_framework.providers import AzureOpenAIProvider

# Tool definitions
@Tool(description="Description of what this tool does")
def tool_name(param: str) -> str:
    """Tool implementation"""
    return result

# Agent definition
agent = Agent(
    name="agent-name",
    instructions="""
    You are an agent that...

    Your capabilities:
    - Capability 1
    - Capability 2
    """,
    tools=[tool_name],
    provider=AzureOpenAIProvider(
        model="gpt-4o",
        # Configuration
    )
)

# For multi-agent workflows
@workflow
def multi_agent_workflow():
    # Define workflow graph
    pass

# Run agent
if __name__ == "__main__":
    response = agent.run("User query")
    print(response)
```

## Agent Checklist

- [ ] Clear agent name and purpose
- [ ] Comprehensive system instructions
- [ ] Tools have proper type hints and descriptions
- [ ] Error handling implemented
- [ ] Provider configured correctly
- [ ] Checkpointing added if needed for long tasks

## Workflow Patterns

| Pattern | Use Case |
|---------|----------|
| Sequential | Tasks that must run in order |
| Concurrent | Independent tasks that can parallelize |
| Handoff | Specialist delegation based on task type |
| GroupChat | Collaborative problem solving |

## Documentation Grounding

Before generating agent code, use MCP tools to verify current SDK patterns:

**Use `microsoft-learn` for Microsoft Agent Framework:**
- "Microsoft Agent Framework SDK" - current API patterns
- "Agent Framework tools" - tool definition syntax
- "Agent Framework workflows" - multi-agent orchestration patterns

**Use `context7` for third-party libraries:**
- `resolve-library-id` then `get-library-docs` for:
  - LangChain (if using LangChain patterns)
  - OpenAI SDK (for provider configuration)
  - Semantic Kernel (if migrating from SK)

The Agent Framework SDK is rapidly evolving. Always verify current import paths, class names, and patterns against documentation.

## Reference

- [Agent Framework Documentation](https://learn.microsoft.com/en-us/agent-framework/)
- [Agent Framework GitHub](https://github.com/microsoft/agent-framework)
