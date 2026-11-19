import { assertPreviewApproved, buildIssueKickoffPreview, previewDigest } from "./prompt-builder.mjs";
import { DashboardRequestError } from "./request-security.mjs";
import { EXECUTION_LOCATIONS } from "./request-validation.mjs";
import { loadAgentNames, loadOpenIssue } from "./github-data.mjs";

export async function loadKickoffPreview(issueNumber) {
    const { repo, issue } = await loadOpenIssue(issueNumber);
    const preview = buildIssueKickoffPreview({
        issueNumber: issue.number,
        title: issue.title,
        body: issue.body,
    });
    return { repo, issue, preview, digest: previewDigest(preview) };
}

export async function resolveApprovedKickoff(
    issueNumber,
    input,
    { loadPreview = loadKickoffPreview, loadAgents = loadAgentNames } = {},
) {
    if (!EXECUTION_LOCATIONS.has(input.executionLocation)) {
        throw new DashboardRequestError(400, "Execution location must be local or cloud.");
    }

    const kickoff = await loadPreview(issueNumber);
    assertPreviewApproved(kickoff.preview, input.kickoffDigest);

    const agent = input.agent || "default";
    if (agent !== "default" && !(await loadAgents()).has(agent)) {
        throw new DashboardRequestError(400, "That agent is not available in this repository.");
    }
    return { ...kickoff, agent };
}
