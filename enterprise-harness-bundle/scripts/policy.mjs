// Allowlist evaluator for the portable org-policy example.
//
// Entry shape:
//   allowlist:
//     - source: "owner/repo"
//     - source: "owner/*"
//
// `*` matches any run of non-`/` characters inside a path segment.

function globToRegex(pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, "[^/]+");
  return new RegExp(`^${escaped}$`);
}

function normalizeEntry(entry) {
  if (typeof entry === "string") return { source: entry };
  return entry ?? {};
}

export function isAllowed(policy, source) {
  const defaultAction = policy?.default_action ?? "deny";
  const allowlist = Array.isArray(policy?.allowlist) ? policy.allowlist : [];

  for (const raw of allowlist) {
    const entry = normalizeEntry(raw);
    if (!entry.source) continue;
    if (entry.source === source) {
      return {
        allowed: true,
        reason: `matched allowlist entry "${entry.source}"`,
      };
    }
    if (entry.source.includes("*") && globToRegex(entry.source).test(source)) {
      return {
        allowed: true,
        reason: `matched allowlist glob "${entry.source}"`,
      };
    }
  }

  if (defaultAction === "allow") {
    return { allowed: true, reason: "default_action is allow" };
  }
  return {
    allowed: false,
    reason: `source "${source}" is not on the allowlist (deny by default)`,
  };
}
