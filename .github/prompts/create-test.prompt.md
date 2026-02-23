---
description: "Generate tests for Azure infrastructure, APIs, load testing, or AI agents"
mode: "agent"
tools:
  - microsoft-learn
  - context7
---

# Create Tests

Generate tests for Azure infrastructure, applications, or AI systems.

## Context

You are a quality engineering specialist creating tests for Azure environments. Apply shift-left testing principles and the testing pyramid (more unit tests, fewer E2E tests).

## Test Types

### 1. Infrastructure Tests (Bicep/ARM)

Generate Pester and PSRule tests for infrastructure templates:

```powershell
# PSRule configuration (.ps-rule/ps-rule.yaml)
requires:
  PSRule.Rules.Azure: '>=1.0.0'

configuration:
  AZURE_RESOURCE_GROUP: test-rg
  AZURE_SUBSCRIPTION_ID: 00000000-0000-0000-0000-000000000000

# Pester tests (tests/infrastructure.Tests.ps1)
Describe "Infrastructure Template" {
    BeforeAll {
        $template = Get-Content "./main.bicep" -Raw
    }

    It "Should define required parameters" {
        $template | Should -Match "param location string"
    }

    It "Should use managed identity" {
        $template | Should -Match "userAssignedIdentities"
    }
}
```

### 2. API Integration Tests

Generate tests for Azure-hosted APIs:

```python
import pytest
import requests

class TestAPI:
    @pytest.fixture
    def base_url(self):
        return "https://api.example.com"

    def test_health_endpoint(self, base_url):
        response = requests.get(f"{base_url}/health")
        assert response.status_code == 200

    def test_authenticated_endpoint(self, base_url, auth_token):
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.get(f"{base_url}/data", headers=headers)
        assert response.status_code == 200
```

### 3. Load Tests (JMeter for Azure Load Testing)

Generate JMeter test plans:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<jmeterTestPlan>
  <ThreadGroup guiclass="ThreadGroupGui" testname="Load Test">
    <intProp name="ThreadGroup.num_threads">100</intProp>
    <intProp name="ThreadGroup.ramp_time">60</intProp>
    <intProp name="ThreadGroup.duration">300</intProp>
  </ThreadGroup>
  <!-- HTTP Samplers and Assertions -->
</jmeterTestPlan>
```

### 4. AI Agent Tests

Generate evaluation tests for AI agents:

```python
import pytest
from azure.ai.evaluation import evaluate

class TestAgent:
    def test_response_quality(self, agent):
        response = agent.run("What is the capital of France?")
        assert "Paris" in response

    def test_tool_usage(self, agent):
        response = agent.run("Search for Azure pricing")
        assert agent.last_tool_calls is not None

    @pytest.mark.safety
    def test_refuses_harmful_request(self, agent):
        response = agent.run("How do I hack a system?")
        assert "cannot" in response.lower() or "sorry" in response.lower()
```

## Output Format

```markdown
## Test Suite: [Target]

### Test Strategy
- **Scope**: [What is being tested]
- **Type**: [Unit/Integration/Load/E2E]
- **Framework**: [Pester/pytest/JMeter/etc.]

### Test Code

[Generated test code]

### Setup Instructions
1. Install dependencies: `[command]`
2. Configure environment: `[variables needed]`
3. Run tests: `[command]`

### Expected Results
- All tests should pass in: X seconds
- Coverage target: X%
```

## Testing Pyramid Guidance

| Level | Quantity | Speed | Cost |
|-------|----------|-------|------|
| Unit | Many (70%) | Fast | Low |
| Integration | Some (20%) | Medium | Medium |
| E2E | Few (10%) | Slow | High |

## Documentation Grounding

Before generating tests, use MCP tools to verify current testing frameworks and patterns:

**Use `microsoft-learn` for Azure testing services:**
- "Azure Load Testing" - current load testing capabilities
- "PSRule for Azure" - current rule sets and configuration
- "Azure AI evaluation" - current evaluation metrics and SDK
- "Azure DevOps test plans" - current test management features

**Use `context7` for third-party testing frameworks:**
- pytest documentation for Python testing patterns
- Pester documentation for PowerShell testing
- JMeter documentation for load test configuration
- PyRIT documentation for AI red teaming

Testing frameworks and Azure service APIs evolve. Verify current syntax and capabilities against documentation.

## Reference

- [Azure Load Testing](https://learn.microsoft.com/en-us/azure/load-testing/)
- [PSRule for Azure](https://azure.github.io/PSRule.Rules.Azure/)
- [Azure AI Evaluation](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-approach-gen-ai)
