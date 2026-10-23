#!/usr/bin/env bash
# preToolUse hook: block changes that contain hardcoded secrets.
# The Copilot CLI delivers the event as JSON on stdin — NOT env vars.
# (The workshop repo parses with jq; Lab Studio uses node so nothing extra
# needs installing.)

INPUT="$(cat)"

printf '%s' "$INPUT" | node -e '
let raw = "";
process.stdin.on("data", (d) => (raw += d)).on("end", () => {
  let event = {};
  try { event = JSON.parse(raw); } catch {}
  // Asymmetry to remember: in preToolUse, toolArgs arrives as a JSON string.
  let args = event.toolArgs;
  if (typeof args === "string") { try { args = JSON.parse(args); } catch { args = {}; } }
  const haystack = JSON.stringify(args ?? {});
  const secret = /(sk-[A-Za-z0-9]{12,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})/.test(haystack);
  if (secret) {
    console.log(JSON.stringify({
      permissionDecision: "deny",
      permissionDecisionReason: "Blocked by pre-tool-use-secret-scan: the change appears to contain a hardcoded secret. Use environment variables instead.",
    }));
  }
});'

exit 0
