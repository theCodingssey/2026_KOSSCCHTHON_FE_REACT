# syntax=docker/dockerfile:1.7
# Ice-Link 웹 이미지. React 를 빌드해 nginx 로 서빙하고, /api/ 는 같은 서버의 백엔드(8080)로 프록시한다.
#
#   VITE_API_BASE_URL 기본값 /api/v1 — 같은 도메인의 nginx 가 백엔드로 넘기므로 CORS 도, 8080 외부 노출도 없다.
#   VITE_SSE_BASE_URL 은 비워 둔다 (같은 도메인 사용)

FROM node:24-alpine AS build
WORKDIR /app

ARG VITE_API_BASE_URL=/api/v1
ARG VITE_SSE_BASE_URL=
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
    VITE_SSE_BASE_URL=${VITE_SSE_BASE_URL}

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

FROM nginx:1.27-alpine
# conf.d 는 알파벳 순으로 include 되므로 log_format 정의(00-)가 default.conf 보다 먼저 읽힌다
COPY deploy/00-log-format.conf /etc/nginx/conf.d/00-log-format.conf
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1/healthz > /dev/null || exit 1
