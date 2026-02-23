---
description: "Review Azure architecture against Well-Architected Framework principles and identify improvements"
mode: "agent"
tools:
  - microsoft-learn
  - context7
---

# Well-Architected Framework Review

Assess an Azure solution against the five pillars of the Well-Architected Framework.

## Context

You are conducting a WAF assessment to identify architectural improvements. Review the provided architecture or code against each pillar and provide actionable recommendations.

## Assessment Process

### 1. Reliability Review

- Are availability zones used for critical resources?
- Is there a disaster recovery strategy?
- Are health probes and auto-failover configured?
- What are the defined SLAs and RTO/RPO targets?
- Is there redundancy at each tier?

### 2. Security Review

- Are managed identities used instead of credentials?
- Is data encrypted at rest and in transit?
- Are private endpoints used for PaaS services?
- Is network segmentation implemented (NSGs, firewalls)?
- Is least privilege access enforced?
- Is Microsoft Defender for Cloud enabled?

### 3. Cost Optimization Review

- Are resources right-sized for the workload?
- Are reserved instances used for steady-state workloads?
- Is auto-scaling configured to match demand?
- Are resources tagged for cost allocation?
- Are there unused or orphaned resources?

### 4. Operational Excellence Review

- Is Infrastructure as Code used for deployments?
- Is monitoring and alerting configured?
- Are diagnostic logs enabled and centralized?
- Are runbooks defined for common operations?
- Is there a CI/CD pipeline for deployments?

### 5. Performance Efficiency Review

- Are appropriate SKUs selected for workload requirements?
- Is caching implemented where beneficial?
- Is CDN used for static content?
- Is the architecture designed for horizontal scaling?
- Are database queries optimized?

## Output Format

```markdown
## WAF Assessment Report

### Executive Summary
[Overall assessment and top priorities]

### Pillar Scores
| Pillar | Score | Priority Issues |
|--------|-------|-----------------|
| Reliability | X/5 | ... |
| Security | X/5 | ... |
| Cost | X/5 | ... |
| Operations | X/5 | ... |
| Performance | X/5 | ... |

### Critical Findings
[Issues that need immediate attention]

### Recommendations
| Priority | Finding | Recommendation | Effort |
|----------|---------|----------------|--------|
| High | ... | ... | ... |
| Medium | ... | ... | ... |
| Low | ... | ... | ... |

### Next Steps
[Prioritized action plan]
```

## Documentation Grounding

Before conducting the WAF assessment, use MCP tools to verify current framework guidance:

**Use `microsoft-learn` to search Microsoft Learn for:**
- "Well-Architected Framework reliability checklist" - current reliability guidance
- "Well-Architected Framework security checklist" - current security guidance
- "Well-Architected Framework cost optimization" - current cost guidance
- "Well-Architected Framework operational excellence" - current ops guidance
- "Well-Architected Framework performance efficiency" - current performance guidance

The WAF is updated regularly with new recommendations. Ground your assessment in current documentation.

## Reference

- [Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/)
- [WAF Assessment Tool](https://learn.microsoft.com/en-us/assessments/azure-architecture-review/)
