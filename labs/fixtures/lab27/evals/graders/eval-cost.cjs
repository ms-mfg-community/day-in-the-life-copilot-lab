"use strict";

/*
 * eval-cost.cjs: what did a Vally run cost, in AIU, without counting it twice?
 *
 * Usage:  node eval-cost.cjs <results.jsonl> [--max-aiu <number>] [--json]
 *
 * It reads the results.jsonl that `vally eval` writes (one `trial-result`
 * record per trial, then one `run-summary`) and needs no model, no network and
 * no install: Tier 0.
 *
 * Where the numbers live in a Vally trajectory:
 *   trajectory.metrics.tokenUsage          inputTokens, outputTokens, totalTokens,
 *                                          cacheReadTokens, cacheWriteTokens, callCount, cost
 *   token_usage events (one per model call) data.cost = { provider: "github-copilot", unit: "nano-aiu", amount }
 * 1 AIU = 1e9 nano-AIU. Vally does not convert to AI Credits and does not include
 * the LLM judge's own usage: this is the cost of the agent's trial only.
 *
 * Root-only accounting. The per-trial total (tokenUsage.cost) is the root: it is
 * the sum of the per-call token_usage amounts, the same way an invoke_agent span
 * in a Copilot OpenTelemetry trace totals the chat spans beneath it (Lab 25,
 * 25.2 "The cost trap"). Adding the root AND its children reports twice the real
 * figure, so this tool sums the roots only and prints what the naive sum would
 * have said so the difference is visible.
 *
 * AIU is a usage unit, not a bill.
 */

const fs = require("node:fs");

const NANO_PER_AIU = 1e9;
const DEFAULT_MAX_AIU = 5;
const SYNTHESIZED_RUN_PREFIX = "run-lab27-recorded";

function isNanoAiuCost(cost) {
  return Boolean(cost) && cost.provider === "github-copilot" && cost.unit === "nano-aiu" && Number.isFinite(cost.amount);
}

function numberOrZero(value) {
  return Number.isFinite(value) ? value : 0;
}

/** Fold one trial-result record into a plain summary row. */
function summarizeTrial(record) {
  const trajectory = record.trajectory || {};
  const metrics = trajectory.metrics || {};
  const usage = metrics.tokenUsage || {};
  const events = Array.isArray(trajectory.events) ? trajectory.events : [];

  let eventNano = 0;
  let eventCount = 0;
  events.forEach(function (event) {
    if (event && event.type === "token_usage" && event.data && isNanoAiuCost(event.data.cost)) {
      eventNano += event.data.cost.amount;
      eventCount += 1;
    }
  });

  let nano = 0;
  let source = "none";
  if (isNanoAiuCost(usage.cost)) {
    nano = usage.cost.amount;
    source = "metrics.tokenUsage.cost";
  } else if (eventCount > 0) {
    nano = eventNano;
    source = "token_usage events";
  }

  return {
    evalName: record.evalName || "",
    stimulus: record.stimulus || (trajectory.stimulus && trajectory.stimulus.name) || "",
    model: record.model || (trajectory.metadata && trajectory.metadata.model) || "",
    status: record.status || "",
    inputTokens: numberOrZero(usage.inputTokens),
    outputTokens: numberOrZero(usage.outputTokens),
    totalTokens: numberOrZero(usage.totalTokens),
    cacheReadTokens: numberOrZero(usage.cacheReadTokens),
    cacheWriteTokens: numberOrZero(usage.cacheWriteTokens),
    toolCalls: numberOrZero(metrics.toolCallCount),
    skillActivations: numberOrZero(metrics.skillActivationCount),
    turns: numberOrZero(metrics.turnCount),
    wallTimeMs: numberOrZero(metrics.wallTimeMs),
    errors: numberOrZero(metrics.errorCount),
    nanoAiu: nano,
    aiu: nano / NANO_PER_AIU,
    eventNanoAiu: eventNano,
    eventCount: eventCount,
    costSource: source,
  };
}

/**
 * Parse results.jsonl text. Returns the rows, the run id, the totals and a
 * budget verdict. `options.maxAiu` is the ceiling (default 5 AIU).
 */
function analyzeResultsJsonl(text, options) {
  const opts = options || {};
  const maxAiu = Number.isFinite(opts.maxAiu) ? opts.maxAiu : DEFAULT_MAX_AIU;
  const trials = [];
  let runSummary = null;
  const warnings = [];

  String(text)
    .split(/\r?\n/)
    .forEach(function (line, index) {
      if (line.trim() === "") return;
      let record;
      try {
        record = JSON.parse(line);
      } catch {
        warnings.push("line " + (index + 1) + " is not JSON and was skipped");
        return;
      }
      if (record && record.type === "trial-result") trials.push(summarizeTrial(record));
      else if (record && record.type === "run-summary") runSummary = record;
    });

  const runId = (runSummary && runSummary.runId) || "";
  const totalNano = trials.reduce(function (sum, row) {
    return sum + row.nanoAiu;
  }, 0);
  const eventNano = trials.reduce(function (sum, row) {
    return sum + row.eventNanoAiu;
  }, 0);
  const priced = trials.filter(function (row) {
    return row.costSource !== "none";
  }).length;

  trials.forEach(function (row) {
    if (row.eventCount > 0 && row.costSource === "metrics.tokenUsage.cost" && row.eventNanoAiu !== row.nanoAiu) {
      warnings.push(
        row.stimulus + ": per-call token_usage amounts (" + row.eventNanoAiu + " nano-AIU) do not add up to the trial total (" + row.nanoAiu + ")",
      );
    }
  });

  let status = "PASS";
  if (trials.length === 0 || priced === 0) status = "UNKNOWN";
  else if (totalNano / NANO_PER_AIU > maxAiu) status = "FAIL";

  return {
    runId: runId,
    trials: trials,
    trialCount: trials.length,
    pricedTrials: priced,
    totalNanoAiu: totalNano,
    totalAiu: totalNano / NANO_PER_AIU,
    naiveAiu: (totalNano + eventNano) / NANO_PER_AIU,
    maxAiu: maxAiu,
    status: status,
    synthesized: runId.indexOf(SYNTHESIZED_RUN_PREFIX) === 0,
    warnings: warnings,
  };
}

function formatAiu(value) {
  return String(Number(value.toFixed(6)));
}

function pad(value, width, right) {
  const text = String(value);
  return right ? text.padStart(width) : text.padEnd(width);
}

/** The human-readable report. Its last line is the budget verdict. */
function renderReport(analysis, source) {
  const lines = [];
  lines.push("Vally run cost: " + source + (analysis.runId ? " (run " + analysis.runId + ")" : ""));
  if (analysis.synthesized) {
    lines.push("NOTE: this fixture is SYNTHESIZED and illustrative. Its token and nano-AIU figures are not a live measurement.");
  }
  lines.push("");
  lines.push(
    pad("stimulus", 56) + pad("in tok", 8, true) + pad("out tok", 9, true) + pad("tools", 7, true) + pad("turns", 7, true) +
      pad("nano-AIU", 14, true) + pad("AIU", 9, true),
  );
  analysis.trials.forEach(function (row) {
    lines.push(
      pad(row.stimulus, 56) + pad(row.inputTokens, 8, true) + pad(row.outputTokens, 9, true) + pad(row.toolCalls, 7, true) +
        pad(row.turns, 7, true) + pad(row.nanoAiu, 14, true) + pad(formatAiu(row.aiu), 9, true),
    );
  });
  lines.push("");
  lines.push("1 AIU = 1e9 nano-AIU. AIU is a usage unit, not a bill.");
  if (analysis.pricedTrials > 0) {
    const ratio = analysis.totalAiu > 0 ? analysis.naiveAiu / analysis.totalAiu : 1;
    lines.push(
      "Counting each trial total AND its per-call token_usage amounts would report " + formatAiu(analysis.naiveAiu) +
        " AIU (" + ratio.toFixed(2) + "x): never add a root to its children.",
    );
  }
  analysis.warnings.forEach(function (warning) {
    lines.push("WARN: " + warning);
  });
  lines.push("Budget ceiling: " + formatAiu(analysis.maxAiu) + " AIU (override with --max-aiu <number>)");
  lines.push("Total root-only AIU: " + formatAiu(analysis.totalAiu) + " AIU | Budget status: " + analysis.status);
  return lines.join("\n") + "\n";
}

function usage() {
  return "usage: node eval-cost.cjs <results.jsonl> [--max-aiu <number>] [--json]\n";
}

function parseArguments(argv) {
  const parsed = { file: "", maxAiu: undefined, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--json") parsed.json = true;
    else if (arg === "--max-aiu") {
      i += 1;
      parsed.maxAiu = Number(argv[i]);
      if (!Number.isFinite(parsed.maxAiu) || parsed.maxAiu < 0) throw new Error("--max-aiu needs a non-negative number");
    } else if (arg.indexOf("--") === 0) throw new Error("unknown option " + arg);
    else if (parsed.file === "") parsed.file = arg;
    else throw new Error("unexpected argument " + arg);
  }
  if (parsed.file === "") throw new Error("a results.jsonl path is required");
  return parsed;
}

function main(argv, io) {
  const stdout = (io && io.stdout) || process.stdout;
  const stderr = (io && io.stderr) || process.stderr;
  let parsed;
  try {
    parsed = parseArguments(argv);
  } catch (error) {
    stderr.write("eval-cost: " + error.message + "\n" + usage());
    return 2;
  }

  let text;
  try {
    text = fs.readFileSync(parsed.file, "utf8");
  } catch (error) {
    stderr.write("eval-cost: cannot read " + parsed.file + " (" + (error.code || error.message) + ")\n");
    return 2;
  }

  const analysis = analyzeResultsJsonl(text, { maxAiu: parsed.maxAiu });
  stdout.write(parsed.json ? JSON.stringify(analysis, null, 2) + "\n" : renderReport(analysis, parsed.file));
  if (analysis.status === "PASS") return 0;
  return analysis.status === "FAIL" ? 1 : 2;
}

module.exports = { DEFAULT_MAX_AIU, NANO_PER_AIU, analyzeResultsJsonl, formatAiu, renderReport, summarizeTrial };

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}
