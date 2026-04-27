// clab-summarize — Copilot CLI extension
//
// Authored strictly from the runtime authoring guide saved at
//   ~/.copilot/session-state/<id>/files/copilot-cli-extensions-authoring-guide.md
// (output of `extensions_manage operation: "guide"` against copilot v1.0.36).
//
// Per the guide:
//   * "Only `.mjs` files are supported (ES modules). The file must be named `extension.mjs`."
//   * "Each extension lives in its own subdirectory."
//   * "The `@github/copilot-sdk` import is resolved automatically — you don't install it."
//   * Tools are registered through `joinSession({ tools: [...] })`.
//   * `session.sendAndWait({ prompt })` is the documented way to drive the runtime
//     model surface from inside an extension and receive the agent's reply.
//   * "stdout is reserved for JSON-RPC. Don't use console.log() — it will corrupt
//     the protocol. Use session.log() to surface messages to the user."

import { joinSession } from "@github/copilot-sdk/extension";

const session = await joinSession({
  tools: [
    {
      name: "clab_summarize",
      description:
        "Summarize an arbitrary block of text using the Copilot CLI's own model. " +
        "Returns a short bullet-point summary suitable for skim-reading.",
      parameters: {
        type: "object",
        properties: {
          text: {
            type: "string",
            description: "The text to summarize. Plain text or markdown.",
          },
          maxBullets: {
            type: "number",
            description: "Upper bound on bullet points in the summary.",
          },
        },
        required: ["text"],
      },
      handler: async (args, invocation) => {
        const maxBullets = Number.isFinite(args.maxBullets)
          ? Math.max(1, Math.min(20, Math.floor(args.maxBullets)))
          : 5;

        await session.log(
          `clab_summarize: summarizing ${args.text.length} chars (toolCallId=${invocation.toolCallId})`,
          { ephemeral: true },
        );

        const prompt =
          `Summarize the following text in at most ${maxBullets} bullet points. ` +
          `Be concrete and skim-readable. Do not add commentary outside the bullets.\n\n` +
          `---\n${args.text}\n---`;

        try {
          const response = await session.sendAndWait({ prompt });
          const content = response?.data?.content;
          if (typeof content === "string" && content.length > 0) {
            return {
              textResultForLlm: content,
              resultType: "success",
            };
          }
          return {
            textResultForLlm:
              "clab_summarize: model returned no content. Try a shorter input or re-run.",
            resultType: "failure",
          };
        } catch (err) {
          return {
            textResultForLlm: `clab_summarize failed: ${err?.message ?? String(err)}`,
            resultType: "failure",
          };
        }
      },
    },
  ],
});

await session.log("clab-summarize extension loaded");
