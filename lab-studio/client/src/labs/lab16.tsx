import { Cmd, FileCard, Note, Quiz, Snippet } from "./content";
import type { Lab } from "./types";

const MANAGED_SETTINGS = `{
  "extraKnownMarketplaces": {
    "contoso-plugins": {
      "source": {
        "source": "github",
        "repo": "contoso-internal/contoso-copilot-plugins"
      },
      "autoUpdate": true
    }
  },
  "enabledPlugins": {
    "dotnet-suite@contoso-plugins": true
  },
  "strictKnownMarketplaces": [
    { "source": "github", "repo": "contoso-internal/contoso-copilot-plugins" }
  ],
  "permissions": {
    "disableBypassPermissionsMode": "disable"
  },
  "model": "auto"
}
`;

export const lab16: Lab = {
  id: "lab16",
  number: "16",
  title: "Enterprise Managed Settings",
  tagline:
    "managed-settings.json: the GA mechanism, the key shapes everyone gets wrong, and deny-by-default marketplaces.",
  steps: [
    {
      key: "lab16/managed",
      title: "The mechanism, and the shapes",
      kind: "mixed",
      verifyId: "lab16/managed",
      body: (
        <>
          <p>
            Lab 11's env var and policy file were local, opt-in patterns.{" "}
            <code>managed-settings.json</code> is different: configured once by
            an enterprise admin, enforced on <strong>every</strong> Copilot
            Business/Enterprise client, regardless of local config. The facts
            that matter:
          </p>
          <ul>
            <li>
              <strong>Canonical path:</strong>{" "}
              <code>copilot/managed-settings.json</code> in the chosen source
              org's <code>.github-private</code> repo (legacy:{" "}
              <code>.github/copilot/settings.json</code>).
            </li>
            <li>
              <strong>Pickup:</strong> fetched on every sign-in, refreshed
              hourly.
            </li>
            <li>
              <strong>Precedence, four tiers:</strong> MDM-managed →
              server-managed → file-based → user. Exception:{" "}
              <code>sandbox</code> and <code>permissions.deny/.ask/.allow</code>{" "}
              compose <em>most-restrictively</em> across tiers instead of
              overriding.
            </li>
          </ul>
          <p>
            Author the five-key example — then let the Verify check your{" "}
            <em>shapes</em>, because four of the five keys are not what their
            names suggest:
          </p>
          <FileCard
            path="enterprise/managed-settings.json"
            content={MANAGED_SETTINGS}
            label="enterprise/managed-settings.json (authored here for shape practice)"
          />
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>Real shape</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>extraKnownMarketplaces</code>
                </td>
                <td>
                  named-object <strong>map</strong>, each entry with a{" "}
                  <code>source</code> object
                </td>
              </tr>
              <tr>
                <td>
                  <code>enabledPlugins</code>
                </td>
                <td>
                  boolean map keyed <code>PLUGIN@MARKETPLACE</code> (true =
                  required, false = blocked)
                </td>
              </tr>
              <tr>
                <td>
                  <code>strictKnownMarketplaces</code>
                </td>
                <td>
                  <strong>array</strong> of marketplace objects — never{" "}
                  <code>true</code>
                </td>
              </tr>
              <tr>
                <td>
                  <code>permissions.disableBypassPermissionsMode</code>
                </td>
                <td>
                  nested + string-valued (<code>"disable"</code>)
                </td>
              </tr>
              <tr>
                <td>
                  <code>model</code>
                </td>
                <td>the only plain scalar of the five</td>
              </tr>
            </tbody>
          </table>
        </>
      ),
    },
    {
      key: "lab16/strict",
      title: "strictKnownMarketplaces — deny by default",
      kind: "mixed",
      verifyId: "lab11/policy",
      body: (
        <>
          <p>
            When set, clients{" "}
            <strong>refuse to install from any marketplace not listed</strong>.
            Two traps the lab drills:
          </p>
          <ul>
            <li>
              An{" "}
              <strong>
                empty array (<code>[]</code>) means complete lockdown
              </strong>{" "}
              — the strictest setting available, not "no restriction".
            </li>
            <li>
              <strong>No first-party exemption is documented.</strong> GitHub's
              own marketplace is NOT implicitly trusted — want it, list it. (A
              first-party carve-out exists for <code>deniedMcpServers</code>;
              don't carry it across.)
            </li>
          </ul>
          <p>
            Model the decision shape with Lab 11's evaluator — a populated{" "}
            <code>strictKnownMarketplaces</code> behaves like deny-by-default
            plus exactly that allowlist:
          </p>
          <Cmd
            lines={[
              "policy check random-user/untrusted-plugin",
              "policy check contoso-internal/contoso-copilot-plugins",
            ]}
          />
          <Note tone="sim">
            A teaching analogy, as the lab itself says: the real mechanism is
            enforced client-side by Copilot, not by a script. The decision shape
            — deny-by-default + explicit allowlist — is identical.
          </Note>
        </>
      ),
    },
    {
      key: "lab16/admin",
      title: "The admin walkthrough",
      kind: "read",
      quiz: true,
      body: (
        <>
          <p>Rolling it out, narrated (no live tenant needed):</p>
          <Snippet title="rollout steps">{`1. Enterprise settings → AI Controls tab → select the source organization
2. Commit copilot/managed-settings.json to that org's .github-private repo (default branch)
3. Confirm activation on the Agents page under AI Controls
4. Propagation: up to an hour for signed-in users; immediate on fresh sign-in`}</Snippet>
          <Quiz
            stepKey="lab16/admin"
            question='The enterprise wants developers locked to the contoso-internal marketplace "plus GitHub&apos;s official one", and nothing else. Which configuration is right?'
            options={[
              "strictKnownMarketplaces: true, plus extraKnownMarketplaces for contoso",
              "extraKnownMarketplaces registering contoso, plus strictKnownMarketplaces as an array listing BOTH contoso AND GitHub's marketplace explicitly",
              "extraKnownMarketplaces registering contoso, plus strictKnownMarketplaces: [the contoso entry] — GitHub's own marketplace is always trusted",
            ]}
            correct={1}
            explain='Two traps in one: the key takes an array (never true), and no first-party exemption exists — "plus GitHub&apos;s official one" means adding it as its own explicit entry.'
          />
        </>
      ),
    },
  ],
};
