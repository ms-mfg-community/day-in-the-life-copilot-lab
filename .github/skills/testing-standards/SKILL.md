---
name: testing-standards
description: Provides testing standards for Azure workloads: testing pyramid, PSRule/Pester for infrastructure, API testing, Azure Load Testing, Chaos Studio, and AI evaluation with PyRIT. Use when creating tests, validating infrastructure, planning test strategies, or asking Sentinel (Azure Testing agent) or Forge (AI Foundry agent) about quality engineering.
---

# Testing Standards

## MCP-First: Query Current Documentation

**Before using the static reference below, query these MCP tools for current information:**

### Microsoft Learn MCP

```
1. microsoft_docs_search: query="Azure [testing topic]"
2. microsoft_code_sample_search: query="[test framework] Azure", language="[lang]"
3. microsoft_docs_fetch: url from search results for complete content
```

Recommended queries:
- "Azure Load Testing JMeter configuration"
- "Azure Chaos Studio experiments"
- "PSRule Azure validation"
- "Pester Azure infrastructure testing"
- "Azure AI evaluation metrics groundedness"
- "PyRIT adversarial testing"

### Context7 MCP

```
1. resolve-library-id: libraryName="[framework]", query="testing"
2. query-docs: libraryId from step 1, query="[specific pattern]"
```

Recommended library lookups:
- `pytest` - Python test patterns, fixtures
- `pester` - PowerShell testing
- `psrule` - Infrastructure validation rules

---

## Static Reference (Fallback)

Use this section only when MCP tools are unavailable or return no results.

### Testing Pyramid

| Level | Percentage | Purpose |
|-------|------------|---------|
| Unit | 70% | Fast, isolated component testing |
| Integration | 20% | Component interaction testing |
| E2E | 10% | Full system validation |

### Infrastructure Testing

#### Bicep/ARM Testing with PSRule

```powershell
# .ps-rule/ps-rule.yaml
requires:
  PSRule.Rules.Azure: '>=1.0.0'

configuration:
  # Suppress specific rules if needed
  # AZURE_AKS_POOL_VERSION: false
```

Run validation:
```bash
Invoke-PSRule -InputPath ./infra -Module PSRule.Rules.Azure -OutputFormat Markdown
```

#### Pester Tests for Infrastructure

```powershell
Describe "Resource Group Deployment" {
    BeforeAll {
        $deployment = Get-AzResourceGroupDeployment -ResourceGroupName "rg-test"
    }

    It "Should deploy successfully" {
        $deployment.ProvisioningState | Should -Be "Succeeded"
    }

    It "Should create expected resources" {
        $resources = Get-AzResource -ResourceGroupName "rg-test"
        $resources.Count | Should -BeGreaterThan 0
    }
}
```

#### Post-Deployment Validation

1. Resource existence checks
2. Configuration validation
3. Connectivity tests
4. Security posture verification

### API Testing

#### Structure

```
tests/
├── unit/           # Isolated function tests
├── integration/    # API endpoint tests
├── e2e/            # Full workflow tests
└── fixtures/       # Test data and mocks
```

#### Python Test Pattern

```python
import pytest

class TestUserAPI:
    @pytest.fixture
    def client(self):
        return TestClient(app)

    def test_create_user_success(self, client):
        """Test successful user creation"""
        response = client.post("/users", json={"name": "Test"})
        assert response.status_code == 201
        assert "id" in response.json()

    def test_create_user_validation_error(self, client):
        """Test validation error for missing required field"""
        response = client.post("/users", json={})
        assert response.status_code == 422
```

### Load Testing

#### Azure Load Testing Standards

```yaml
# load-test.yaml
testId: api-load-test
displayName: API Load Test
testPlan: tests/load/api.jmx
engineInstances: 2
failureCriteria:
  - avg(response_time_ms) > 500
  - percentage(errors) > 5
```

#### JMeter Best Practices

- Use CSV Data Set Config for test data
- Implement proper think times between requests
- Add assertions for response validation
- Configure appropriate thread ramp-up
- Set realistic test duration (minimum 5 minutes for stable metrics)

### Chaos Engineering

#### Azure Chaos Studio Standards

Before running chaos experiments:

1. **Blast radius** - Define and limit affected resources
2. **Monitoring** - Ensure observability is in place
3. **Rollback** - Have automatic abort conditions
4. **Communication** - Notify stakeholders

### AI System Testing

#### Evaluation Metrics

| Metric | Threshold | Purpose |
|--------|-----------|---------|
| Groundedness | >0.8 | Response factual accuracy |
| Relevance | >0.8 | Response addresses query |
| Coherence | >0.8 | Response is well-structured |
| Fluency | >0.8 | Response is readable |

#### Adversarial Testing with PyRIT

```python
from pyrit.orchestrator import PromptSendingOrchestrator
from pyrit.prompt_target import AzureOpenAITarget

orchestrator = PromptSendingOrchestrator(
    prompt_target=target,
    prompt_converters=[JailbreakConverter()]
)
results = await orchestrator.send_prompts_async(test_prompts)
```

#### Agent Testing Checklist

- [ ] Tool call accuracy validated
- [ ] Intent resolution tested
- [ ] Task completion rate measured
- [ ] Safety boundaries verified
- [ ] Error handling tested
- [ ] Timeout behavior validated

### Test Naming Conventions

```
test_[unit]_[scenario]_[expected_outcome]

Examples:
- test_create_user_valid_input_returns_201
- test_create_user_missing_email_returns_422
- test_agent_harmful_request_refuses_politely
```

### CI/CD Integration

```yaml
# azure-pipelines.yml
stages:
  - stage: Test
    jobs:
      - job: UnitTests
        steps:
          - task: UsePythonVersion@0
          - script: pytest tests/unit --junitxml=results.xml
          - task: PublishTestResults@2

      - job: IntegrationTests
        dependsOn: UnitTests
        steps:
          - script: pytest tests/integration

      - job: LoadTests
        dependsOn: IntegrationTests
        condition: eq(variables['Build.SourceBranch'], 'refs/heads/main')
```

---

## Fallback Reference Links

Only provide these if MCP returned no results and user needs persistent links:

- [Azure Load Testing](https://learn.microsoft.com/en-us/azure/load-testing/)
- [Azure Chaos Studio](https://learn.microsoft.com/en-us/azure/chaos-studio/)
- [PSRule for Azure](https://azure.github.io/PSRule.Rules.Azure/)
- [PyRIT for AI Red Teaming](https://github.com/Azure/PyRIT)
