# Copilot Lab Studio — single-user container.
#
# Build:   docker build -t lab-studio .
# Run:     docker run --rm -p 5180:5180 -e COPILOT_GITHUB_TOKEN=<fine-grained PAT with "Copilot Requests"> lab-studio
#   or, reusing a machine's existing `copilot login` state:
#          docker run --rm -p 5180:5180 -v ~/.copilot:/root/.copilot lab-studio
#
# One container = one learner (the studio is a single-user app).

FROM node:22-bookworm-slim

# git: the sandbox workspace is its own git repository; bash: hook scripts.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git bash ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci --include=dev

COPY . .
RUN npm run build

ENV LAB_STUDIO_HOST=0.0.0.0
EXPOSE 5180

CMD ["npm", "run", "start", "-w", "server"]
