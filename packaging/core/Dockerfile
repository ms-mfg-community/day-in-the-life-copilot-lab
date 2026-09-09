ARG NODE_IMAGE
ARG DOTNET8_IMAGE
ARG DOTNET9_IMAGE
FROM ${DOTNET8_IMAGE} AS dotnet8
FROM ${DOTNET9_IMAGE} AS dotnet9
FROM ${NODE_IMAGE} AS runtime

USER root
SHELL ["/bin/bash", "-euo", "pipefail", "-c"]
COPY --from=dotnet8 /usr/share/dotnet /usr/share/dotnet
COPY --from=dotnet9 /usr/share/dotnet /usr/share/dotnet
COPY --from=dotnet9 /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt
ENV DOTNET_ROOT=/usr/share/dotnet \
    DOTNET_CLI_TELEMETRY_OPTOUT=1 \
    DOTNET_SKIP_FIRST_TIME_EXPERIENCE=1 \
    DOTNET_CLI_WORKLOAD_UPDATE_NOTIFY_DISABLE=true \
    DOTNET_NOLOGO=1 \
    PATH=/usr/share/dotnet:$PATH
COPY .lab-build/inputs.json /tmp/lab-inputs.json
COPY packaging/core/build/os.sh /tmp/lab-os.sh
RUN bash /tmp/lab-os.sh

FROM runtime AS dependencies
COPY packaging/core/tools/package*.json /opt/lab/tools/
RUN cd /opt/lab/tools && npm ci --include=dev --no-audit --no-fund \
    && ln -s /opt/lab/tools/node_modules /opt/lab/node_modules
ENV PATH=/opt/lab/tools/node_modules/.bin:/opt/lab/dotnet-tools:/opt/lab/python/bin:$PATH
WORKDIR /build/source
COPY package.json package-lock.json ./
COPY node/package.json node/pnpm-lock.yaml node/.npmrc ./node/
COPY dotnet/ContosoUniversity.sln ./dotnet/
COPY dotnet/ContosoUniversity.Core/*.csproj dotnet/ContosoUniversity.Core/packages.lock.json ./dotnet/ContosoUniversity.Core/
COPY dotnet/ContosoUniversity.Infrastructure/*.csproj dotnet/ContosoUniversity.Infrastructure/packages.lock.json ./dotnet/ContosoUniversity.Infrastructure/
COPY dotnet/ContosoUniversity.Web/*.csproj dotnet/ContosoUniversity.Web/packages.lock.json ./dotnet/ContosoUniversity.Web/
COPY dotnet/ContosoUniversity.Tests/*.csproj dotnet/ContosoUniversity.Tests/packages.lock.json ./dotnet/ContosoUniversity.Tests/
COPY dotnet/ContosoUniversity.PlaywrightTests/*.csproj dotnet/ContosoUniversity.PlaywrightTests/packages.lock.json ./dotnet/ContosoUniversity.PlaywrightTests/
COPY packaging/core/python/ ./packaging/core/python/
COPY packaging/core/build/dependencies.sh /tmp/lab-dependencies.sh
RUN bash /tmp/lab-dependencies.sh

FROM dependencies AS content
COPY . /build/source
RUN mkdir -p /opt/lab/core \
    && cp -r packaging/core/runtime packaging/core/build packaging/core/verify /opt/lab/core/ \
    && cp .lab-build/source.tar /opt/lab/source.tar \
    && cp .lab-build/source.json /opt/lab/source.json \
    && cp .lab-build/inputs.json /opt/lab/inputs.json \
    && cp packaging/core/NuGet.Config /opt/lab/NuGet.Config \
    && mkdir -p /opt/lab/bin && cp packaging/core/copilot /opt/lab/bin/copilot \
    && chmod 755 /opt/lab/bin/copilot
RUN bash packaging/core/build/content.sh
RUN node /opt/lab/core/build/seal.mjs /build/source /opt/lab

FROM runtime AS prepared
COPY --from=content /opt/lab /opt/lab
COPY packaging/core/lab-core /usr/local/bin/lab-core
RUN chmod 755 /usr/local/bin/lab-core \
    && mkdir -p /workspaces && chown node:node /workspaces \
    && chmod -R a+rX /opt/lab && chmod -R go-w /opt/lab
ENV PATH=/opt/lab/bin:/opt/lab/tools/node_modules/.bin:/opt/lab/dotnet-tools:/opt/lab/python/bin:$PATH \
    LAB_RUNTIME=/opt/lab \
    PLAYWRIGHT_BROWSERS_PATH=/opt/lab/browsers \
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_SKIP_BROWSER_GC=1 \
    npm_config_offline=true \
    npm_config_audit=false \
    npm_config_update_notifier=false \
    COREPACK_ENABLE_NETWORK=0 \
    PIP_NO_INDEX=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    RestoreSources=/opt/lab/nuget-feed \
    RestoreConfigFile=/opt/lab/NuGet.Config \
    RestoreLockedMode=true \
    NuGetAudit=false
ARG SOURCE_COMMIT
LABEL org.opencontainers.image.source="https://github.com/ms-mfg-community/day-in-the-life-copilot-lab" \
      org.opencontainers.image.revision="${SOURCE_COMMIT}" \
      io.github.lab.capability="prepared-core-phase-1-local-only"
USER node
WORKDIR /workspaces
CMD ["/bin/bash"]
