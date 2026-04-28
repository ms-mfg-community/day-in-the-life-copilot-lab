// policy.mjs — allowlist evaluator for org plugin policy.
//
// Consumes an org-policy document (see org-policy.example.yaml) and decides
// whether a given plugin source (e.g. `owner/repo`) is permitted.
//
// Entry shape:
//   allowlist:
//     - source: "contoso-internal/contoso-copilot-plugins"
//     - source: "contoso-internal/*"
//
// `*` is treated as a segment wildcard (matches any run of non-`/` characters).

function globToRegex(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+');
  return new RegExp(`^${escaped}$`);
}

function normalizeEntry(entry) {
  if (typeof entry === 'string') return { source: entry };
  return entry ?? {};
}

export function isAllowed(policy, source) {
  const defaultAction = policy?.default_action ?? 'deny';
  const allowlist = Array.isArray(policy?.allowlist) ? policy.allowlist : [];

  for (const raw of allowlist) {
    const entry = normalizeEntry(raw);
    if (!entry.source) continue;
    if (entry.source === source) {
      return { allowed: true, reason: `matched allowlist entry "${entry.source}"` };
    }
    if (entry.source.includes('*')) {
      if (globToRegex(entry.source).test(source)) {
        return {
          allowed: true,
          reason: `matched allowlist glob "${entry.source}"`,
        };
      }
    }
  }

  if (defaultAction === 'allow') {
    return { allowed: true, reason: 'default_action is allow' };
  }
  return {
    allowed: false,
    reason: `source "${source}" is not on the allowlist (deny by default)`,
  };
}
