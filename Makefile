# Top-level Makefile — track-aware test orchestration
#
# Targets:
#   test-dotnet     Run the .NET unit/integration tests (xUnit).
#   test-dotnet-e2e Run the .NET Playwright E2E suite (requires a running Web app).
#   test-node       Run the Node workspace tests (Vitest).
#   test-node-e2e   Run the Node Playwright E2E suite (requires `npx playwright install`).
#   test-all        Run both tracks (unit/integration only) plus the root vitest suite.
#   lint-labs       Run the root vitest suite that lints lab structure + content.
#
# E2E targets are intentionally NOT part of `test-all` because they require
# heavyweight setup (browsers, running web server). Run them explicitly when
# verifying end-to-end behavior.
#
# These targets exist so that learners can pick a track without memorizing the
# per-stack command. CI also calls these names.

DOTNET_SLN     := dotnet/ContosoUniversity.sln
DOTNET_TESTS   := dotnet/ContosoUniversity.Tests/ContosoUniversity.Tests.csproj
DOTNET_E2E     := dotnet/ContosoUniversity.PlaywrightTests/ContosoUniversity.PlaywrightTests.csproj
NODE_DIR       := node

.PHONY: help test-dotnet test-dotnet-e2e test-node test-node-e2e test-all lint-labs setup-hooks lint-workflows slides

help:
	@echo "Targets:"
	@echo "  make test-dotnet      - .NET unit/integration tests"
	@echo "  make test-dotnet-e2e  - .NET Playwright E2E (needs running web app)"
	@echo "  make test-node        - Node tests (pnpm -C $(NODE_DIR) test)"
	@echo "  make test-node-e2e    - Node Playwright E2E (needs browsers installed)"
	@echo "  make test-all         - Both tracks (unit/integration) + root lab/structure tests"
	@echo "  make lint-labs        - Root vitest suite (lab structure, build, devcontainer)"
	@echo "  make setup-hooks      - Activate repo-managed git hooks in .githooks/"
	@echo "  make lint-workflows   - Compile every gh-aw workflow under .github/workflows/"
	@echo "  make slides           - Build the workshop deck to workshop/dist/"

slides:
	@echo "=== Building workshop deck (workshop/dist/index.html) ==="
	node scripts/workshop/build-slides.mjs

test-dotnet:
	@echo "=== .NET unit/integration tests ==="
	dotnet test $(DOTNET_TESTS) --nologo

test-dotnet-e2e:
	@echo "=== .NET Playwright E2E ==="
	dotnet test $(DOTNET_E2E) --nologo

test-node:
	@echo "=== Node tests ==="
	pnpm -C $(NODE_DIR) test

test-node-e2e:
	@echo "=== Node Playwright E2E ==="
	pnpm -C $(NODE_DIR) exec playwright test

test-all: lint-labs test-dotnet test-node
	@echo "=== All tracks passed ==="

lint-labs:
	@echo "=== Root vitest (lab structure, build, devcontainer) ==="
	npm test --silent -- --run

# Activate the repo-managed git hooks (currently: .githooks/pre-commit which
# strips Jupyter notebook outputs — see scripts/hooks/pre-commit-strip-notebook-outputs.sh
# and Finding 2.1 in .orchestrator/phase-A-findings.md).
# Idempotent: safe to re-run.
setup-hooks:
	@echo "=== Activating repo-managed git hooks (.githooks) ==="
	git config core.hooksPath .githooks
	@echo "core.hooksPath = $$(git config --get core.hooksPath)"

# Compile every gh-aw workflow in the repo. Authoritative lint for
# agentic workflows — fails loudly on deprecated safe-output keys,
# drifted lock files, or invalid permissions.
lint-workflows:
	@echo "=== gh aw compile (all workflows) ==="
	@if ! command -v gh >/dev/null 2>&1; then \
	  echo "ERROR: gh CLI not installed" >&2; exit 1; \
	fi
	@if ! gh aw --help >/dev/null 2>&1; then \
	  echo "ERROR: gh-aw extension not installed. Run: gh extension install github/gh-aw" >&2; \
	  exit 1; \
	fi
	gh aw compile
