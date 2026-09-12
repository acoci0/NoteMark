FROM mcr.microsoft.com/dotnet/sdk:10.0-alpine AS build

WORKDIR /src

COPY NotMarket.Api.csproj ./

RUN dotnet restore

COPY . .

RUN dotnet publish \
    -c Release \
    --no-restore \
    -o /app/publish \
    /p:UseAppHost=false


FROM mcr.microsoft.com/dotnet/aspnet:10.0-alpine AS final

ARG TECTONIC_VERSION=0.17.0

RUN apk add --no-cache \
    ca-certificates \
    curl \
    fontconfig \
    icu-data-full \
    icu-libs \
    tzdata

RUN set -eux; \
    ARCH="$(uname -m)"; \
    case "$ARCH" in \
        x86_64) \
            TECTONIC_TARGET="x86_64-unknown-linux-musl"; \
            TECTONIC_SHA256="8533d07f9ccbd7a65824b9e0459041bca34af1eb33daba48f59215593753a3b7"; \
            ;; \
        aarch64) \
            TECTONIC_TARGET="aarch64-unknown-linux-musl"; \
            TECTONIC_SHA256="b10954a95404f3ab2328d2fa59a5ebab8e657f893fab096f98be8db7c0c979b8"; \
            ;; \
        *) \
            echo "Desteklenmeyen mimari: $ARCH"; \
            exit 1; \
            ;; \
    esac; \
    URL="https://github.com/tectonic-typesetting/tectonic/releases/download/tectonic%400.17.0/tectonic-${TECTONIC_VERSION}-${TECTONIC_TARGET}.tar.gz"; \
    curl -fL \
        --retry 3 \
        "$URL" \
        -o /tmp/tectonic.tar.gz; \
    echo "${TECTONIC_SHA256}  /tmp/tectonic.tar.gz" \
        | sha256sum -c -; \
    tar -xzf \
        /tmp/tectonic.tar.gz \
        -C /usr/local/bin \
        tectonic; \
    chmod +x /usr/local/bin/tectonic; \
    rm /tmp/tectonic.tar.gz; \
    tectonic --version

WORKDIR /app

COPY --from=build /app/publish .

ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Production \
    DOTNET_SYSTEM_GLOBALIZATION_INVARIANT=false \
    XDG_CACHE_HOME=/tmp/notmarket-tectonic-cache

RUN mkdir -p /tmp/notmarket-tectonic-cache \
    && chmod 1777 /tmp/notmarket-tectonic-cache

EXPOSE 8080

USER $APP_UID

ENTRYPOINT ["dotnet", "NotMarket.Api.dll"]
