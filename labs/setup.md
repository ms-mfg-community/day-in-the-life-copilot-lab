# Hands-on Lab Setup

This page points you to the setup instructions for the hands-on labs, and lists the test command for each track once your environment is running.

> **Setup has moved!** All setup instructions are now in the [README](../README.md).
>
> → [Go to README — Choose Your Path](../README.md#choose-your-path)
>
> **Picking a track?** See [Pick a stack: .NET track or Node track](../README.md#pick-a-stack-net-track-or-node-track).

## The Three Surfaces Legend: where am I typing?

Every lab step happens in one of three places, and every step names its place with a badge. Read the badge, then match it to the prompt in front of you, so you never paste a shell command into Copilot or a Copilot prompt into your shell.

| Badge | Surface | What belongs here |
|-------|---------|-------------------|
| 🐚 **In your OS Terminal (Bash / PowerShell)** | Your normal shell prompt (`$` in Bash, `PS>` in PowerShell) | Commands run at your normal shell prompt: `dotnet`, `git`, `gh`, `copilot --version` |
| 🤖 **In Copilot CLI (`copilot>` session)** | An interactive session that you start by typing `copilot` in the OS Terminal | Slash commands (`/agent`, `/skills`, `/instructions`, `/env`, `/diagnose`) and natural-language prompts typed *inside* the session |
| 💠 **In VS Code (Editor & Copilot Chat)** | The VS Code editor and the Copilot Chat view | Creating and editing `.github/` files in the editor, the Agent Customizations UI (`Chat: Open Customizations` → Instructions, Skills, Agents, MCP Servers, Hooks), and `Show Agent Debug Logs` / `Show Chat Debug View` |

![Three panels side by side: the OS Terminal with a $ or PS> prompt running git, dotnet and copilot; a Copilot CLI session with a copilot> prompt taking /agent, /env and /diagnose; and VS Code with an agent file open in the editor beside the Copilot Chat view.](../docs/images/labs/three-surfaces-guide.svg)

> 💡 **The badge names what you type into, not the window it sits in.** VS Code's integrated terminal is still a 🐚 OS Terminal. Run `copilot` there and you are in 🤖 until you type `/exit`. Typed inside a `copilot>` session, `cat` or `dotnet` goes to the model as chat text, not to your shell. Two other markers are not places you type: 🌐 is a page on GitHub.com in your browser (or a web/global-scope note), and 💬 is a discussion question to answer aloud.

Quick reference once your environment is up:

| Track | Test command |
|-------|--------------|
| **.NET** (`dotnet/`) | `make test-dotnet` |
| **Node** (`node/`) | `make test-node` |
| Both | `make test-all` |

---

*This page is kept for backwards compatibility. Please follow the README for the most up-to-date setup instructions.*
