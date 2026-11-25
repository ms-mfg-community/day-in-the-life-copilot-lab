"use strict";

/*
 * tool-calls-issued.cjs: grade what the agent ISSUED, not what completed.
 *
 * Vally trajectories are a flat list of typed events. This grader looks at
 *   tool_call         data: { toolName, toolCallId, turnId?, launchedAgentIds?, simulated?, arguments? }
 *   skill_activation  data: { name, path, ... }
 * the moment they are issued, and never waits for a tool_result. That matters
 * because a stimulus with constraints.max_agent_duration is stopped when the
 * working-time limit expires and its partial work is graded as a completed run:
 * a subagent that was dispatched correctly but had not finished still passes.
 *
 * gradeIssuedToolCalls(trajectory, config) is a pure function over plain data,
 * deliberately free of require() and of any host global, so the same logic can
 * be exercised from self-check.cjs, from Vitest, and from a sandboxed VM.
 *
 * config is the IssuedCallGraderConfig (every field optional):
 *   requiredTools, forbiddenTools              tool names
 *   requiredArgSubstrings, forbiddenArgSubstrings   [{ toolName, substring }], matched against
 *                                              JSON.stringify(data.arguments) of that tool's calls
 *   requiredAgents, forbiddenAgents            matched against data.launchedAgentIds[],
 *                                              event.agentId, or the target agent argument
 *                                              (agent, agent_type, subagent_type, agentName)
 *                                              of a dispatch tool (task, dispatch_agent,
 *                                              subagent, run_subagent)
 *   requiredSkills, forbiddenSkills            matched against skill_activation data.name
 *
 * Agent matching inspects only structured dispatch fields, so a `view` of
 * .github/agents/planner.agent.md neither satisfies requiredAgents nor trips
 * forbiddenAgents.
 *
 * As a Vally program grader the config arrives in the ISSUED_CALL_CONFIG
 * environment variable (a JSON string set through the grader's `env` block),
 * because Vally rejects unknown keys in a program grader's own `config`.
 */

function gradeIssuedToolCalls(trajectory, config) {
  const cfg = config || {};
  const events = trajectory && Array.isArray(trajectory.events) ? trajectory.events : [];
  const toolCalls = events.filter(function (e) {
    return e && e.type === "tool_call";
  });
  const skillEvents = events.filter(function (e) {
    return e && e.type === "skill_activation";
  });
  const failures = [];
  const hits = [];

  function toolNameOf(call) {
    return call && call.data ? call.data.toolName : undefined;
  }

  function argText(call) {
    return JSON.stringify(call && call.data && call.data.arguments !== undefined ? call.data.arguments : "");
  }

  function hasAgent(call, agent) {
    const data = call && call.data ? call.data : {};
    if (Array.isArray(data.launchedAgentIds) && data.launchedAgentIds.indexOf(agent) !== -1) return true;
    if (call && call.agentId === agent) return true;
    const tool = String(data.toolName || "");
    if (tool === "task" || tool === "dispatch_agent" || tool === "subagent" || tool === "run_subagent") {
      const args = data.arguments && typeof data.arguments === "object" ? data.arguments : {};
      const target = args.agent || args.agent_type || args.subagent_type || args.agentName || "";
      if (target === agent) return true;
    }
    return false;
  }

  (cfg.requiredTools || []).forEach(function (tool) {
    const ok = toolCalls.some(function (e) {
      return toolNameOf(e) === tool;
    });
    if (ok) hits.push("requiredTool:" + tool);
    else failures.push("Missing required tool_call: " + tool);
  });

  (cfg.forbiddenTools || []).forEach(function (tool) {
    const bad = toolCalls.some(function (e) {
      return toolNameOf(e) === tool;
    });
    if (bad) failures.push("Forbidden tool_call issued: " + tool);
    else hits.push("noForbiddenTool:" + tool);
  });

  (cfg.requiredArgSubstrings || []).forEach(function (rule) {
    const ok = toolCalls.some(function (e) {
      return toolNameOf(e) === rule.toolName && argText(e).indexOf(rule.substring) !== -1;
    });
    if (ok) hits.push("requiredArg:" + rule.toolName + "~" + rule.substring);
    else failures.push("Missing required arg substring on " + rule.toolName + ": " + rule.substring);
  });

  (cfg.forbiddenArgSubstrings || []).forEach(function (rule) {
    const bad = toolCalls.some(function (e) {
      return toolNameOf(e) === rule.toolName && argText(e).indexOf(rule.substring) !== -1;
    });
    if (bad) failures.push("Forbidden arg substring on " + rule.toolName + ": " + rule.substring);
    else hits.push("noForbiddenArg:" + rule.toolName + "~" + rule.substring);
  });

  (cfg.requiredAgents || []).forEach(function (agent) {
    const ok = toolCalls.some(function (e) {
      return hasAgent(e, agent);
    });
    if (ok) hits.push("requiredAgent:" + agent);
    else failures.push("Missing required agent dispatch: " + agent);
  });

  (cfg.forbiddenAgents || []).forEach(function (agent) {
    const bad = toolCalls.some(function (e) {
      return hasAgent(e, agent);
    });
    if (bad) failures.push("Forbidden agent dispatched: " + agent);
    else hits.push("noForbiddenAgent:" + agent);
  });

  (cfg.requiredSkills || []).forEach(function (skill) {
    const ok = skillEvents.some(function (e) {
      return e.data && e.data.name === skill;
    });
    if (ok) hits.push("requiredSkill:" + skill);
    else failures.push("Missing required skill_activation: " + skill);
  });

  (cfg.forbiddenSkills || []).forEach(function (skill) {
    const bad = skillEvents.some(function (e) {
      return e.data && e.data.name === skill;
    });
    if (bad) failures.push("Forbidden skill_activation: " + skill);
    else hits.push("noForbiddenSkill:" + skill);
  });

  const passed = failures.length === 0;
  const evidence = passed
    ? "All issued-call checks passed (" + (hits.join(", ") || "no constraints configured") + ")"
    : failures.join("; ");
  return {
    name: "tool-calls-issued",
    kind: "code",
    passed: passed,
    score: passed ? 1 : 0,
    evidence: evidence,
  };
}

const ISSUED_CALL_KEYS = [
  "requiredTools",
  "forbiddenTools",
  "requiredArgSubstrings",
  "forbiddenArgSubstrings",
  "requiredAgents",
  "forbiddenAgents",
  "requiredSkills",
  "forbiddenSkills",
];

/**
 * Where a Vally program grader finds its IssuedCallGraderConfig: the
 * ISSUED_CALL_CONFIG variable (JSON) wins; otherwise any of the eight keys
 * present directly on the grader's own config block; otherwise no constraints.
 */
function resolveIssuedCallConfig(env, graderConfig) {
  const text = env && env.ISSUED_CALL_CONFIG;
  if (typeof text === "string" && text.trim() !== "") {
    try {
      return JSON.parse(text);
    } catch (error) {
      throw new Error("ISSUED_CALL_CONFIG is not valid JSON: " + error.message);
    }
  }
  const picked = {};
  ISSUED_CALL_KEYS.forEach(function (key) {
    if (graderConfig && graderConfig[key] !== undefined) picked[key] = graderConfig[key];
  });
  return picked;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { ISSUED_CALL_KEYS, gradeIssuedToolCalls, resolveIssuedCallConfig };
}

if (typeof require === "function" && typeof module !== "undefined" && require.main === module) {
  const { runGraderMain } = require("./lib.cjs");
  runGraderMain("tool-calls-issued", function (input) {
    return gradeIssuedToolCalls(input.trajectory, resolveIssuedCallConfig(process.env, input.config));
  });
}
