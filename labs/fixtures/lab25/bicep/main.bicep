// Lab 25: Log Analytics workspace, custom tables, Direct data collection rule (DCR),
// optional ingestion role assignment, a p95 cost alert and a workbook.
//
// Every apiVersion below MUST equal docs/_meta/registry.yaml `azure_monitor`. Bicep needs the
// version as a literal, so tests/lab25/lab25-azure.test.ts fails on drift.
//
// Tables and DCR stream declarations are generated from ../schema.json, the one ingestion
// contract. Every table is created on the Analytics plan: the KQL pack uses join/union and
// alert rules, which the Basic and Auxiliary plans restrict.
//
//   az deployment group create -g <rg> -f labs/fixtures/lab25/bicep/main.bicep \
//     -p principalId=$(az ad signed-in-user show --query id -o tsv)

targetScope = 'resourceGroup'

@description('Azure region for every resource.')
param location string = resourceGroup().location

@description('Log Analytics workspace name.')
param workspaceName string = 'law-lab25-${uniqueString(resourceGroup().id)}'

@description('Data collection rule name.')
param dcrName string = 'dcr-lab25-${uniqueString(resourceGroup().id)}'

@description('Interactive retention for the workspace and lab tables. The 30-day service default is not a cost optimization: Analytics ingestion includes 31 days. Retain only what your governance review approves.')
@minValue(30)
@maxValue(730)
param retentionInDays int = 30

@description('Object ID granted Monitoring Metrics Publisher on the DCR so it can call the Logs Ingestion API. Empty skips the role assignment.')
param principalId string = ''

@description('Principal type for principalId.')
@allowed([
  'User'
  'ServicePrincipal'
  'Group'
])
param principalType string = 'User'

@description('p95 AI Credits per task (over one day) above which the alert fires. AIU is a usage unit, not currency.')
param costAlertThresholdAiu int = 15

@description('Optional action group resource ID the alert notifies. Empty leaves the alert to the portal only.')
param actionGroupId string = ''

var schema = loadJsonContent('../schema.json')
var destinationName = 'lab25Workspace'
// Built-in role: Monitoring Metrics Publisher (required to send data with the Logs Ingestion API).
var monitoringMetricsPublisherRoleId = '3913510d-42f4-4e42-8a64-420c390055eb'

resource workspace 'Microsoft.OperationalInsights/workspaces@2026-03-01' = {
  name: workspaceName
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: retentionInDays
  }
}

resource tables 'Microsoft.OperationalInsights/workspaces/tables@2026-03-01' = [
  for table in schema.tables: {
    parent: workspace
    name: '${table.name}_CL'
    properties: {
      plan: 'Analytics'
      retentionInDays: retentionInDays
      schema: {
        name: '${table.name}_CL'
        columns: table.columns
      }
    }
  }
]

resource dcr 'Microsoft.Insights/dataCollectionRules@2024-03-11' = {
  name: dcrName
  location: location
  kind: 'Direct'
  properties: {
    streamDeclarations: toObject(schema.tables, t => 'Custom-${t.name}', t => { columns: t.columns })
    destinations: {
      logAnalytics: [
        {
          name: destinationName
          workspaceResourceId: workspace.id
        }
      ]
    }
    dataFlows: [
      for table in schema.tables: {
        streams: [
          'Custom-${table.name}'
        ]
        destinations: [
          destinationName
        ]
        transformKql: 'source'
        outputStream: 'Custom-${table.name}_CL'
      }
    ]
  }
  dependsOn: [
    tables
  ]
}

resource ingestionRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!empty(principalId)) {
  name: guid(dcr.id, principalId, monitoringMetricsPublisherRoleId)
  scope: dcr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', monitoringMetricsPublisherRoleId)
    principalId: principalId
    principalType: principalType
  }
}

resource costAlert 'Microsoft.Insights/scheduledQueryRules@2026-03-01' = {
  name: 'lab25-cost-p95-per-task'
  location: location
  kind: 'LogAlert'
  properties: {
    displayName: 'Lab 25: p95 AI Credits per task above threshold'
    description: 'Fires when the p95 AI Credits per task over the last day exceeds the threshold. Sums root invoke_agent spans only (see kql/alert-cost-p95.kql).'
    severity: 3
    enabled: true
    scopes: [
      workspace.id
    ]
    evaluationFrequency: 'PT6H'
    windowSize: 'P1D'
    criteria: {
      allOf: [
        {
          query: loadTextContent('../kql/alert-cost-p95.kql')
          timeAggregation: 'Maximum'
          metricMeasureColumn: 'P95Aiu'
          operator: 'GreaterThan'
          threshold: costAlertThresholdAiu
          failingPeriods: {
            numberOfEvaluationPeriods: 1
            minFailingPeriodsToAlert: 1
          }
        }
      ]
    }
    actions: {
      actionGroups: empty(actionGroupId) ? [] : [
        actionGroupId
      ]
    }
  }
  dependsOn: [
    tables
  ]
}

var workbookQueries = [
  { title: 'AI Credits per task (root spans only)', query: loadTextContent('../kql/cost-per-task.kql') }
  { title: 'The double-count trap', query: loadTextContent('../kql/cost-double-count.kql') }
  { title: 'QA reject rate', query: loadTextContent('../kql/reject-rate.kql') }
  { title: 'Rework rate', query: loadTextContent('../kql/rework-rate.kql') }
  { title: 'Stage dwell', query: loadTextContent('../kql/stage-dwell.kql') }
  { title: 'Escalations', query: loadTextContent('../kql/escalations.kql') }
  { title: 'Before / after the bundle change', query: loadTextContent('../kql/before-after.kql') }
  { title: 'Tool errors', query: loadTextContent('../kql/errors.kql') }
  { title: 'Activity', query: loadTextContent('../kql/activity.kql') }
  { title: 'Provenance (edit the feature)', query: loadTextContent('../kql/provenance.kql') }
]

var workbookContent = {
  version: 'Notebook/1.0'
  items: concat(
    [
      {
        type: 1
        name: 'intro'
        content: {
          json: '## Lab 25: the improvement loop\nEach panel is a file in labs/fixtures/lab25/kql. After forward --restamp, edit every query containing let changeAt to use the timestamp printed by the CLI (Lab 25 section 25.7), then save. Check that cost-per-task shows nonzero baseline and after task counts before interpreting comparisons. AIU is a usage unit, not currency. Before/after comparisons are observational, not causal.'
        }
      }
    ],
    map(workbookQueries, q => {
      type: 3
      name: q.title
      content: {
        version: 'KqlItem/1.0'
        title: q.title
        query: q.query
        size: 0
        timeContext: {
          durationMs: 7776000000
        }
        queryType: 0
        resourceType: 'microsoft.operationalinsights/workspaces'
      }
    })
  )
  fallbackResourceIds: [
    workspace.id
  ]
}

resource workbook 'Microsoft.Insights/workbooks@2023-06-01' = {
  name: guid(resourceGroup().id, 'lab25-improvement-loop')
  location: location
  kind: 'shared'
  properties: {
    displayName: 'Lab 25: improvement loop'
    category: 'workbook'
    sourceId: workspace.id
    serializedData: string(workbookContent)
  }
}

output workspaceId string = workspace.id
output workspaceCustomerId string = workspace.properties.customerId
output logsIngestionEndpoint string = dcr.properties.endpoints.logsIngestion
output dcrImmutableId string = dcr.properties.immutableId
