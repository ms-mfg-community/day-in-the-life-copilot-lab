---
description: "Action guardrails and confirmation requirements for Azure operations"
applyTo: "**/azure/**/*,**/bicep/**/*,**/infra/**/*,**/*.bicep,**/foundry/**/*"
---

# Action Guardrails

When performing Azure-related operations, classify actions and apply appropriate confirmation requirements.

## Action Categories

### Read-Only Actions (No Confirmation Required)

These actions only retrieve or analyze information:

- Viewing documentation or searching for guidance
- Analyzing existing code or configurations
- Reviewing architecture diagrams
- Generating reports or assessments
- Listing resources or configurations

### Simulated Actions (Explain Before Output)

These actions generate artifacts but do NOT deploy or execute:

- Generating Bicep/ARM templates
- Creating pipeline YAML definitions
- Designing architecture patterns
- Writing test code
- Creating policy definitions
- Generating configuration files

**Required Format for Simulated Outputs:**

```markdown
## SIMULATED OUTPUT - NOT DEPLOYED

The following [template type] has been generated.

[Generated content]

---

**Status**: Generated only - no Azure resources modified

**To deploy this:**
1. [Step-by-step deployment instructions]
2. [Required prerequisites]
3. [Execution command]

**Want me to proceed with deployment?** (This will modify Azure resources)
```

### Destructive Actions (Explicit Confirmation Required)

These actions modify, delete, or create Azure resources:

- Deploying infrastructure to Azure
- Running chaos experiments
- Executing load tests against production
- Deleting resources or resource groups
- Modifying production configurations
- Running deployment pipelines

**Required Confirmation Flow:**

1. Summarize what will be changed
2. List affected Azure resources and subscriptions
3. Ask for explicit user confirmation (y/n)
4. **STOP** if user says no
5. Only proceed after receiving explicit "yes" or "y"

**Example:**

```markdown
## Deployment Confirmation Required

**Action**: Deploy Azure Landing Zone
**Target Subscription**: contoso-prod (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
**Resources to Create**:
- 3 Resource Groups
- 1 Virtual Network with 4 subnets
- 2 Network Security Groups
- 1 Key Vault

**Estimated Cost Impact**: ~$150/month

Proceed with deployment? [y/n]
```

## Specific Action Classifications

| Action | Category | Confirmation |
|--------|----------|--------------|
| Generate Bicep template | Simulated | Explain |
| Deploy Bicep template | Destructive | Explicit |
| Create test plan | Simulated | Explain |
| Run load test | Destructive | Explicit |
| Design architecture | Read-only | None |
| Delete resource group | Destructive | Explicit |
| Search documentation | Read-only | None |
| Run chaos experiment | Destructive | Explicit |

## Safety Principles

1. **Assume immutability** - treat production as if changes cannot be undone
2. **Least privilege** - request only necessary permissions
3. **Blast radius awareness** - understand the scope of potential impact
4. **Audit trail** - document all destructive actions taken
5. **Rollback planning** - have a recovery plan before executing destructive actions
