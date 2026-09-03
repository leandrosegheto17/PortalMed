# Imagem de produção da Aplicação Core (NestJS/ADR-005).
# Empacotamento pertence ao estágio "package/artifact" do pipeline de CI/CD
# (cicd-pipeline-configuration, DevOps) — este Dockerfile é consumido por
# .github/workflows/backend-ci.yml (job build_and_push) e pelo módulo
# infra/modules/ecs-service (ECS Fargate). Validar contra o runtime real
# (variáveis de ambiente, porta) conforme BE-01/BE-02 evoluem — placeholder
# alinhado ao package.json atual (`start:prod` = `node dist/main`).

# --- build stage -------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

# --- runtime stage -----------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Usuário não-root (hardening — requisito operacional que o DevSecOps espera
# ver no runtime, mesmo com scan de imagem fora do escopo desta rodada)
RUN groupadd --system app && useradd --system --gid app app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=build /app/dist ./dist

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/main"]
