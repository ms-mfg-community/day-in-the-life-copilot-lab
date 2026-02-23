---
description: "Responsible AI guidelines for Microsoft Foundry development and deployment"
applyTo: "**/ai/**/*,**/agents/**/*,**/prompts/**/*,**/foundry/**/*"
---

# Responsible AI Guidelines

Apply these principles when developing, deploying, or operating AI systems on Azure.

## Microsoft Responsible AI Principles

### 1. Fairness

- Test AI systems with diverse datasets representing all user populations
- Monitor for disparate impact across demographic groups
- Use Microsoft Foundry's fairness evaluators in pre-production testing
- Document known limitations and biases in system documentation

### 2. Reliability and Safety

- Implement comprehensive evaluation pipelines before deployment
- Use Azure AI Content Safety for input/output filtering
- Configure Prompt Shields to detect jailbreak and injection attempts
- Set up monitoring and alerting for anomalous behavior
- Define fallback behaviors for edge cases

### 3. Privacy and Security

- Never include PII in prompts or training data without explicit consent
- Use Azure Key Vault for API keys and secrets
- Enable audit logging for all AI interactions
- Configure data residency according to compliance requirements
- Implement role-based access control for AI resources

### 4. Inclusiveness

- Design AI systems to be accessible to users with disabilities
- Support multiple languages where user base requires
- Test with users from different backgrounds and abilities
- Provide alternative interaction methods when AI fails

### 5. Transparency

- Clearly disclose when users are interacting with AI
- Provide explanations for AI decisions when possible
- Document system capabilities and limitations
- Enable users to understand how their data is used

### 6. Accountability

- Establish clear ownership for AI systems
- Implement human oversight for high-stakes decisions
- Create incident response procedures for AI failures
- Maintain audit trails for AI system changes

## Microsoft Foundry Implementation

### Content Safety Configuration

```yaml
# Recommended content filter settings
content_safety:
  input_filter:
    hate: medium
    violence: medium
    self_harm: medium
    sexual: medium
  output_filter:
    hate: medium
    violence: medium
    self_harm: medium
    sexual: medium
  prompt_shields:
    jailbreak_detection: enabled
    indirect_injection: enabled
```

### Evaluation Requirements

Before deploying any AI system:

1. **Quality Metrics** (all must pass)
   - Groundedness: >0.8
   - Relevance: >0.8
   - Coherence: >0.8
   - Fluency: >0.8

2. **Safety Metrics** (all must pass)
   - No harmful content generation
   - Jailbreak resistance verified
   - PII handling compliance verified

3. **Agentic Metrics** (for agents)
   - Tool call accuracy: >0.9
   - Task completion rate: >0.85
   - Intent resolution accuracy: >0.9

### Human-in-the-Loop Requirements

Implement human oversight for:

- Financial decisions above threshold
- Healthcare recommendations
- Legal advice or guidance
- Access control decisions
- Content moderation edge cases

### Red Teaming

Conduct adversarial testing using PyRIT or equivalent:

- Jailbreak attempt resistance
- Prompt injection detection
- Data extraction prevention
- Role confusion attacks
- Context manipulation attempts

## Compliance Documentation

Maintain documentation for:

- [ ] AI system purpose and limitations
- [ ] Training data sources and handling
- [ ] Evaluation results and benchmarks
- [ ] Known biases and mitigation strategies
- [ ] Incident response procedures
- [ ] Human oversight mechanisms

## Reference

- [Microsoft Responsible AI](https://www.microsoft.com/en-us/ai/responsible-ai)
- [Azure AI Content Safety](https://learn.microsoft.com/en-us/azure/ai-foundry/ai-services/content-safety-overview)
- [AI Red Teaming with PyRIT](https://github.com/Azure/PyRIT)
- [AI Evaluation in Microsoft Foundry](https://learn.microsoft.com/en-us/azure/ai-foundry/concepts/evaluation-approach-gen-ai)
