---
name: azure-waf
description: Provides Azure Well-Architected Framework (WAF) guidance for all 5 pillars: Reliability, Security, Cost Optimization, Operational Excellence, Performance Efficiency. Use when conducting WAF reviews, assessing security baselines, optimizing costs, or asking Stratus (Azure Infrastructure agent) about architecture decisions.
---

# Azure Well-Architected Framework Guidelines

## MCP-First: Query Current Documentation

**Before using the static reference below, query these MCP tools for current information:**

### Microsoft Learn MCP

```
1. microsoft_docs_search: query="Azure Well-Architected Framework [pillar]"
2. microsoft_docs_fetch: url from search results for complete content
```

Recommended queries by pillar:
- "Azure Well-Architected reliability patterns"
- "Azure Well-Architected security best practices"
- "Azure Well-Architected cost optimization"
- "Azure Well-Architected operational excellence"
- "Azure Well-Architected performance efficiency"

For specific resources:
- "Azure [resource type] well-architected checklist"
- "Azure [resource type] reliability best practices"

---

## Static Reference (Fallback)

Use this section only when MCP tools are unavailable or return no results.

### The Five Pillars

#### 1. Reliability

- Design for failure - assume components will fail
- Use availability zones and regions for redundancy
- Implement health probes and automatic failover
- Define and test disaster recovery procedures
- Set appropriate SLAs based on business requirements

#### 2. Security

- Apply defense in depth with multiple security layers
- Use managed identities instead of credentials
- Encrypt data at rest and in transit
- Implement network segmentation and private endpoints
- Follow least privilege access principles
- Enable Microsoft Defender for Cloud

#### 3. Cost Optimization

- Right-size resources based on actual usage
- Use reserved instances for predictable workloads
- Implement auto-scaling to match demand
- Tag resources for cost allocation and tracking
- Review and act on Azure Advisor cost recommendations
- Consider spot instances for fault-tolerant workloads

#### 4. Operational Excellence

- Automate deployments with Infrastructure as Code
- Implement comprehensive monitoring and alerting
- Use Azure Monitor, Log Analytics, and Application Insights
- Define runbooks for common operational tasks
- Practice incident response through game days

#### 5. Performance Efficiency

- Select appropriate SKUs for workload requirements
- Use caching to reduce latency (Azure Cache for Redis)
- Implement CDN for static content delivery
- Design for horizontal scaling over vertical scaling
- Monitor and optimize query performance

### Application to Azure Resources

When creating or reviewing Azure resources:

1. **Virtual Networks**: Use NSGs, enable DDoS protection, plan address spaces for growth
2. **Storage Accounts**: Enable soft delete, use private endpoints, implement lifecycle management
3. **Key Vault**: Use for all secrets, enable soft delete and purge protection
4. **App Services**: Use deployment slots, enable always-on, configure health checks
5. **Databases**: Enable geo-replication, configure backup retention, use private endpoints

---

## Fallback Reference Links

Only provide these if MCP returned no results and user needs persistent links:

- [Azure Well-Architected Framework](https://learn.microsoft.com/en-us/azure/well-architected/)
- [WAF Assessment Tool](https://learn.microsoft.com/en-us/assessments/azure-architecture-review/)
