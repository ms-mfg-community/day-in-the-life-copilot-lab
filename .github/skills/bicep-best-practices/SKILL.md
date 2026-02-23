---
name: bicep-best-practices
description: Provides Bicep Infrastructure as Code best practices including file organization, naming conventions, parameter decorators, Azure Verified Modules (AVM), and security patterns. Use when creating Bicep templates, reviewing .bicep files, working with deployment stacks, or asking Stratus (Azure Infrastructure agent) about IaC patterns.
---

# Bicep Best Practices

## MCP-First: Query Current Documentation

**Before using the static reference below, query these MCP tools for current information:**

### Microsoft Learn MCP

```
1. microsoft_docs_search: query="Bicep best practices Azure"
2. microsoft_code_sample_search: query="Bicep module examples", language="bicep"
3. microsoft_docs_fetch: url from search results for complete content
```

Recommended queries:
- "Bicep file structure best practices"
- "Azure Verified Modules usage"
- "Bicep parameter decorators"
- "Bicep security patterns Key Vault"

### Context7 MCP

```
1. resolve-library-id: libraryName="bicep", query="infrastructure as code templates"
2. query-docs: libraryId from step 1, query="module patterns"
```

---

## Static Reference (Fallback)

Use this section only when MCP tools are unavailable or return no results.

### File Organization

```
infra/
├── main.bicep              # Entry point
├── main.bicepparam         # Parameter file
├── modules/                # Reusable modules
│   ├── networking/
│   ├── compute/
│   └── storage/
└── environments/           # Environment-specific params
    ├── dev.bicepparam
    ├── test.bicepparam
    └── prod.bicepparam
```

### Naming Conventions

- Use `camelCase` for parameters and variables
- Use descriptive names: `storageAccountName` not `sa`
- Prefix module outputs clearly: `storageAccountId`, `storageAccountName`
- Use consistent resource naming with `resourceGroup().location` awareness

### Parameter Best Practices

```bicep
// Always include descriptions
@description('The name of the storage account')
@minLength(3)
@maxLength(24)
param storageAccountName string

// Use allowed values for constrained options
@description('The SKU of the storage account')
@allowed(['Standard_LRS', 'Standard_GRS', 'Standard_ZRS'])
param storageAccountSku string = 'Standard_LRS'

// Use secure decorator for sensitive values
@secure()
@description('The administrator password')
param adminPassword string
```

### Azure Verified Modules

Prefer Azure Verified Modules (AVM) over custom implementations:

```bicep
// Use AVM modules for battle-tested patterns
module storageAccount 'br/public:avm/res/storage/storage-account:0.9.0' = {
  name: 'storageAccountDeployment'
  params: {
    name: storageAccountName
    // AVM handles best practices automatically
  }
}
```

- AVM modules include built-in security, diagnostics, and tagging support
- Pin module versions explicitly for reproducibility

### Security Patterns

```bicep
// Never hardcode secrets
param keyVaultName string
resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// Reference secrets from Key Vault
module appService 'modules/appService.bicep' = {
  params: {
    connectionString: keyVault.getSecret('connectionString')
  }
}

// Use managed identities
resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: 'mi-${workloadName}'
  location: location
}
```

### Deployment Patterns

- Use deployment stacks for lifecycle management
- Implement what-if checks before deployment
- Use `dependsOn` sparingly - prefer implicit dependencies
- Set appropriate `scope` for subscription or management group deployments

### Staged Deployment & Dependency Ordering

Complex Azure deployments require careful staging to resolve resource dependencies. This section covers module separation, output chaining, `azd` layered provisioning, pipeline stage chaining, and common chicken-and-egg scenarios.

#### Module Separation

Split deployments into logical stages based on dependency tiers:

```
infra/
├── main.bicep                  # Orchestrator — stages modules in order
├── modules/
│   ├── 1-identity/             # Stage 1: Managed identities
│   │   └── managedIdentity.bicep
│   ├── 2-networking/           # Stage 2: VNets, subnets, NSGs, DNS zones
│   │   ├── vnet.bicep
│   │   └── privateDnsZone.bicep
│   ├── 3-security/             # Stage 3: Key Vault (needs identity for RBAC)
│   │   └── keyVault.bicep
│   ├── 4-data/                 # Stage 4: Storage, databases (needs network + KV)
│   │   └── storageAccount.bicep
│   └── 5-compute/              # Stage 5: Apps, containers (needs all above)
│       └── containerApp.bicep
└── environments/
    ├── dev.bicepparam
    └── prod.bicepparam
```

Each stage depends only on outputs from earlier stages. This eliminates circular references within a single deployment.

#### Output Chaining Between Modules

Pass resource identifiers and properties forward through module outputs:

```bicep
// main.bicep — orchestrator chaining outputs between stages

// Stage 1: Identity
module identity 'modules/1-identity/managedIdentity.bicep' = {
  name: 'identityDeploy'
  params: {
    workloadName: workloadName
    location: location
  }
}

// Stage 2: Key Vault — consumes identity output
module keyVault 'modules/3-security/keyVault.bicep' = {
  name: 'keyVaultDeploy'
  params: {
    workloadName: workloadName
    location: location
    managedIdentityPrincipalId: identity.outputs.principalId  // implicit dependency
  }
}

// Stage 3: Compute — consumes both identity and Key Vault outputs
module app 'modules/5-compute/containerApp.bicep' = {
  name: 'appDeploy'
  params: {
    managedIdentityId: identity.outputs.identityId
    keyVaultUri: keyVault.outputs.vaultUri
  }
}
```

Key rules:
- Prefer implicit dependencies (referencing `module.outputs.x`) over explicit `dependsOn`
- Explicit `dependsOn` is only needed when there is no property reference but ordering still matters (e.g., RBAC propagation delay)
- Use `@secure()` on module outputs (Bicep 0.35.1+) for sensitive values like connection strings

#### azd Layered Provisioning

The Azure Developer CLI (`azd`) supports staged workflows through custom workflow definitions and hooks:

```yaml
# azure.yaml — custom workflow with separated stages
name: my-fullstack-app
workflows:
  up:
    steps:
      - azd: provision    # Create infrastructure first
      - azd: package      # Build app code (can use provisioned config values)
      - azd: deploy       # Deploy to provisioned infrastructure
```

For circular dependencies (front-end needs back-end URL and vice versa):
- Use the **container-app-upsert** AVM pattern: provision creates infrastructure with placeholder config, then `azd deploy` upserts containers with resolved environment variables
- Use **runtime configuration**: deploy a `config.json` via post-deploy hook so apps discover endpoints at startup rather than build time
- Use **azd hooks** to enforce sequential deployment order when parallel is unsafe

Environment isolation:
```bash
azd env new dev       # Create dev environment
azd env new prod      # Create prod environment
azd up -e dev         # Deploy to dev only
```

#### Pipeline Stage Chaining (CI/CD)

In Azure Pipelines or GitHub Actions, chain Bicep deployments across stages using output variables:

```yaml
# Azure Pipelines example — stage chaining via outputs
stages:
  - stage: Foundation
    jobs:
      - job: DeployIdentity
        steps:
          - task: AzureCLI@2
            name: identityOutputs
            inputs:
              scriptType: bash
              inlineScript: |
                result=$(az deployment group create \
                  --resource-group $(rgName) \
                  --template-file infra/modules/1-identity/managedIdentity.bicep \
                  --query 'properties.outputs' -o json)
                echo "##vso[task.setvariable variable=principalId;isOutput=true]$(echo $result | jq -r '.principalId.value')"

  - stage: Security
    dependsOn: Foundation
    variables:
      principalId: $[ stageDependencies.Foundation.DeployIdentity.outputs['identityOutputs.principalId'] ]
    jobs:
      - job: DeployKeyVault
        steps:
          - task: AzureCLI@2
            inputs:
              scriptType: bash
              inlineScript: |
                az deployment group create \
                  --resource-group $(rgName) \
                  --template-file infra/modules/3-security/keyVault.bicep \
                  --parameters managedIdentityPrincipalId='$(principalId)'
```

In GitHub Actions, use `outputs` on jobs and reference via `needs.<job>.outputs.<name>`.

#### Common Chicken-and-Egg Scenarios

**1. Managed Identity + Key Vault RBAC**

Problem: Key Vault needs the identity's `principalId` for RBAC, but the identity doesn't exist until deployed.

Solution: Deploy identity first, chain its `principalId` output to the Key Vault module's role assignment:

```bicep
module identity 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.0' = {
  name: 'identityDeploy'
  params: { name: 'mi-${workloadName}', location: location }
}

module keyVault 'br/public:avm/res/key-vault/vault:0.11.0' = {
  name: 'keyVaultDeploy'
  params: {
    name: 'kv-${workloadName}'
    location: location
    roleAssignments: [
      {
        principalId: identity.outputs.principalId   // chained output
        roleDefinitionIdOrName: 'Key Vault Secrets User'
        principalType: 'ServicePrincipal'
      }
    ]
  }
}
```

**2. VNet Peering (Hub-Spoke)**

Problem: Both hub and spoke VNets must exist before peering can reference their resource IDs.

Solution: Deploy VNets in one stage, then peering in a second stage that consumes both VNet IDs:

```bicep
// Stage 1: Deploy both VNets
module hubVnet 'modules/networking/vnet.bicep' = { ... }
module spokeVnet 'modules/networking/vnet.bicep' = { ... }

// Stage 2: Peering — depends on both VNets
module hubToSpokePeering 'modules/networking/peering.bicep' = {
  name: 'hubToSpoke'
  params: {
    localVnetName: hubVnet.outputs.vnetName
    remoteVnetId: spokeVnet.outputs.vnetId
  }
}
module spokeToHubPeering 'modules/networking/peering.bicep' = {
  name: 'spokeToHub'
  params: {
    localVnetName: spokeVnet.outputs.vnetName
    remoteVnetId: hubVnet.outputs.vnetId
  }
}
```

**3. Private Endpoints + Private DNS Zones**

Problem: Private endpoint needs the subnet ID and DNS zone ID. DNS zone needs the VNet link. The VNet must exist first.

Solution: Three-stage ordering — VNet → DNS zone + VNet link → private endpoint:

```bicep
// Stage 1
module vnet 'modules/networking/vnet.bicep' = { ... }

// Stage 2
module privateDnsZone 'modules/networking/privateDnsZone.bicep' = {
  params: {
    zoneName: 'privatelink.vaultcore.azure.net'
    vnetId: vnet.outputs.vnetId  // links DNS zone to VNet
  }
}

// Stage 3
module kvPrivateEndpoint 'modules/networking/privateEndpoint.bicep' = {
  params: {
    subnetId: vnet.outputs.privateEndpointSubnetId
    privateDnsZoneId: privateDnsZone.outputs.zoneId
    targetResourceId: keyVault.outputs.resourceId
    groupId: 'vault'
  }
}
```

**4. Container App + Container Registry**

Problem: Container App needs a registry image reference, but the image may not exist until first build. Registry may need the app's managed identity for pull access.

Solution: Use the `azd` container-app-upsert pattern — provision creates the app with a placeholder image, then `azd deploy` upserts with the real image. Grant `AcrPull` role to the app's identity at provision time:

```bicep
module registry 'br/public:avm/res/container-registry/registry:0.6.0' = {
  name: 'acrDeploy'
  params: {
    name: 'acr${workloadName}'
    location: location
    acrSku: 'Basic'
    roleAssignments: [
      {
        principalId: identity.outputs.principalId
        roleDefinitionIdOrName: 'AcrPull'
        principalType: 'ServicePrincipal'
      }
    ]
  }
}

module app 'br/public:avm/ptn/azd/container-app-upsert:0.1.0' = {
  name: 'appDeploy'
  params: {
    name: 'ca-${workloadName}'
    containerAppsEnvironmentName: env.outputs.name
    identityType: 'UserAssigned'
    identityName: identity.outputs.name
    containerRegistryName: registry.outputs.name
    // azd deploy will upsert the actual image reference
  }
}
```

### Validation

Before deployment:
1. Run `az bicep build` to catch syntax errors
2. Use `az deployment group what-if` to preview changes
3. Run PSRule for Azure compliance checks
4. Validate parameter files match environment requirements

---

## Fallback Reference Links

Only provide these if MCP returned no results and user needs persistent links:

- [Bicep Documentation](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/)
- [Azure Verified Modules](https://azure.github.io/Azure-Verified-Modules/)
- [Bicep Linter Rules](https://learn.microsoft.com/en-us/azure/azure-resource-manager/bicep/linter)
