# Top-level Makefile — track-aware test orchestration
#
# Targets:
#   test-dotnet  Run the .NET solution tests (xUnit).
#   test-node    Run the Node workspace tests (Vitest).
#   test-all     Run both tracks plus the root vitest suite (lab structure, build, devcontainer).
#   lint-labs    Run the root vitest suite that lints lab structure + content.
#
# These targets exist so that learners can pick a track without memorizing the
# per-stack command. CI also calls these names.

DOTNET_SLN := dotnet/ContosoUniversity.sln
NODE_DIR   := node

.PHONY: help test-dotnet test-node test-all lint-labs

help:
	@echo "Targets:"
	@echo "  make test-dotnet  - .NET tests (dotnet test $(DOTNET_SLN))"
	@echo "  make test-node    - Node tests (pnpm -C $(NODE_DIR) test)"
	@echo "  make test-all     - Both tracks + root lab/structure tests"
	@echo "  make lint-labs    - Root vitest suite (lab structure, build, devcontainer)"

test-dotnet:
	@echo "=== .NET tests ==="
	dotnet test $(DOTNET_SLN) --nologo

test-node:
	@echo "=== Node tests ==="
	pnpm -C $(NODE_DIR) test

test-all: lint-labs test-dotnet test-node
	@echo "=== All tracks passed ==="

lint-labs:
	@echo "=== Root vitest (lab structure, build, devcontainer) ==="
	npm test --silent -- --run
