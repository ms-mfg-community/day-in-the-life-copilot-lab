---
description: "Design Microsoft Fabric lakehouse architecture with medallion patterns and OneLake integration"
mode: "agent"
tools:
  - microsoft-learn
  - context7
---

# Design Lakehouse Architecture

Design a Microsoft Fabric lakehouse solution with medallion architecture patterns.

## Context

You are a Fabric Data Architect designing data platform solutions. Apply medallion patterns (bronze/silver/gold) and leverage OneLake as the single source of truth.

## Process

1. **Understand Data Requirements**
   - What data sources will be ingested?
   - What are the primary analytical use cases?
   - What are the data volumes and freshness requirements?
   - Who are the data consumers (analysts, data scientists, applications)?

2. **Design OneLake Structure**
   - Workspace organization strategy
   - Lakehouse vs Warehouse decisions
   - Shortcut strategy for external data
   - Security and access patterns

3. **Plan Medallion Layers**

   **Bronze (Raw)**
   - Raw ingestion landing zone
   - Schema-on-read for flexibility
   - Full data lineage preservation
   - Minimal transformations

   **Silver (Curated)**
   - Cleansed and validated data
   - Standardized schemas
   - Business entity alignment
   - Quality rules applied

   **Gold (Consumption)**
   - Business-ready aggregations
   - Star schema for reporting
   - Pre-computed metrics
   - Direct Lake optimized

4. **Design Data Flows**
   - Data Factory pipelines for orchestration
   - Spark notebooks for transformations
   - Incremental processing patterns
   - Error handling and retry logic

## Output Format

```markdown
## Lakehouse Architecture: [Name]

### Overview
[Business context and solution summary]

### OneLake Structure
```
workspace-[domain]/
├── lh-bronze/              # Raw data lakehouse
│   ├── source1/
│   └── source2/
├── lh-silver/              # Curated lakehouse
│   ├── domain1/
│   └── domain2/
├── lh-gold/                # Consumption lakehouse
│   └── analytics/
└── wh-reporting/           # Data warehouse for SQL access
```

### Medallion Layer Design

| Layer | Tables | Purpose | Refresh |
|-------|--------|---------|---------|
| Bronze | ... | ... | ... |
| Silver | ... | ... | ... |
| Gold | ... | ... | ... |

### Data Flow Architecture
[Pipeline and notebook orchestration]

### Security Model
[Workspace roles, OneLake security, row-level security]

### Power BI Integration
[Direct Lake semantic models, report strategy]

### Estimated Capacity Requirements
[F-SKU sizing based on workload]
```

## Design Principles

- OneLake as single source of truth - avoid data duplication
- Shortcuts for external data - don't copy when you can reference
- Direct Lake for Power BI - eliminate import/refresh overhead
- Incremental processing - minimize compute costs

## Documentation Grounding

Before designing the lakehouse architecture, use MCP tools to verify current Fabric capabilities:

**Use `microsoft-learn` to search Microsoft Learn for:**
- "Microsoft Fabric lakehouse" - current lakehouse features
- "OneLake shortcuts" - current shortcut capabilities
- "Fabric medallion architecture" - current medallion patterns
- "Direct Lake mode" - current Power BI integration options
- "Fabric capacity SKUs" - current capacity sizing guidance

Microsoft Fabric evolves rapidly with monthly feature releases. Ground your design in current documentation.

## Reference

- [Microsoft Fabric Documentation](https://learn.microsoft.com/en-us/fabric/)
- [OneLake Documentation](https://learn.microsoft.com/en-us/fabric/onelake/)
- [Medallion Architecture](https://learn.microsoft.com/en-us/fabric/onelake/onelake-medallion-lakehouse-architecture)
