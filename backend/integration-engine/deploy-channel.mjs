#!/usr/bin/env node
/**
 * BE-06 (`TASK.md`) — provisiona (cria/substitui) e implanta um canal na
 * Integration Engine (NextGen Connect, self-hosted, ADR-002) via a API REST
 * administrativa do próprio motor. É o equivalente, para a engine, do que os
 * módulos Terraform (`infra/modules/`) são para o restante da
 * infraestrutura: configuração como código, versionada e reexecutável —
 * nunca configurado manualmente pela console web do produto.
 *
 * `backend/integration-engine/` fica **fora** de `src/`/`test/`/`migrations/`
 * de propósito — não é código de runtime da aplicação (não entra no
 * `nest build`), é uma ferramenta operacional de configuração da engine,
 * mesma categoria de `infra/*.tf` (Terraform também não é lint/buildado
 * pelo pipeline do backend). Escrito em JavaScript puro (ESM, sem
 * dependência de compilação) para poder rodar tanto via CLI (pipeline de
 * deploy do DevOps) quanto importado diretamente pela suíte de teste e2e
 * do Backend (`backend/test/integration-engine/`).
 *
 * Uso via CLI:
 *   node backend/integration-engine/deploy-channel.mjs
 *
 * Toda configuração via variável de ambiente, nunca hardcoded
 * (`TASK.md` §1.1) — ver `loadDeployConfig`.
 */

import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const HL7V2_TEST_CHANNEL_ID = 'f47b6c1a-6e46-4a4a-9d0a-00000000be06';
export const HL7V2_TEST_CHANNEL_XML_PATH = path.join(
  __dirname,
  'channels',
  'hl7v2-oru-canonical-test-channel.xml',
);

const DEFAULTS = {
  adminBaseUrl: 'https://localhost:8443',
  adminUsername: 'admin',
  adminPassword: 'admin',
  coreIngestAclUrl: 'http://localhost:3000/internal/integration-engine/messages',
  // A engine self-hosted (`nextgenhealthcare/connect`) usa certificado
  // autoassinado por padrão na API administrativa HTTPS — tráfego que
  // nunca sai da rede privada (SDD.md §7.5). Decisão de detalhe registrada
  // em `backend/docs/integration-engine.md`: aceitar o autoassinado por
  // padrão aqui, com acompanhamento explícito para DevOps/DevSecOps
  // provisionar um certificado de CA interna antes de produção real —
  // quando isso existir, `INTEGRATION_ENGINE_ADMIN_ALLOW_INSECURE_TLS=false`
  // desativa este bypass.
  allowInsecureTls: true,
};

/** `loadDeployConfig` — pura, testável sem mutar `process.env` (mesmo padrão de `loadRedisConfig`/`loadObjectStorageConfig`). */
export function loadDeployConfig(env = process.env) {
  return {
    adminBaseUrl: env.INTEGRATION_ENGINE_ADMIN_URL || DEFAULTS.adminBaseUrl,
    adminUsername: env.INTEGRATION_ENGINE_ADMIN_USERNAME || DEFAULTS.adminUsername,
    adminPassword: env.INTEGRATION_ENGINE_ADMIN_PASSWORD || DEFAULTS.adminPassword,
    coreIngestAclUrl: env.CORE_INGEST_ACL_URL || DEFAULTS.coreIngestAclUrl,
    allowInsecureTls:
      env.INTEGRATION_ENGINE_ADMIN_ALLOW_INSECURE_TLS === undefined
        ? DEFAULTS.allowInsecureTls
        : env.INTEGRATION_ENGINE_ADMIN_ALLOW_INSECURE_TLS !== 'false',
  };
}

/**
 * Substitui o placeholder `__CORE_INGEST_ACL_URL__` do template de canal
 * pelo endpoint real da ACL do core para o ambiente-alvo — nenhum endpoint
 * de ambiente específico fica hardcoded no XML versionado (`TASK.md` §1.1).
 */
export function renderChannelXml(templateXml, coreIngestAclUrl) {
  if (!templateXml.includes('__CORE_INGEST_ACL_URL__')) {
    throw new Error(
      'Template de canal não contém o placeholder __CORE_INGEST_ACL_URL__ — arquivo de canal inesperado.',
    );
  }
  return templateXml.replaceAll('__CORE_INGEST_ACL_URL__', coreIngestAclUrl);
}

/**
 * Envolve `fetch` aplicando o bypass de TLS autoassinado (quando habilitado)
 * só para a duração da chamada, via a flag global do Node
 * (`NODE_TLS_REJECT_UNAUTHORIZED`) — não existe, na API `fetch` nativa do
 * Node, um jeito de passar um `https.Agent` por requisição sem depender de
 * `undici` como dependência direta; a flag global é restaurada
 * imediatamente após cada chamada para não vazar o bypass para nenhum outro
 * tráfego do processo (em particular, nunca para chamadas feitas pela
 * aplicação core em si).
 */
async function fetchAgainstEngine(config, input, init) {
  if (!config.allowInsecureTls) {
    return fetch(input, init);
  }
  const previous = process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  try {
    return await fetch(input, init);
  } finally {
    if (previous === undefined) {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
    } else {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = previous;
    }
  }
}

/**
 * Login na API REST administrativa da engine. Devolve o cookie de sessão
 * (`Set-Cookie` da resposta) a ser reenviado nas chamadas seguintes — a API
 * exige tanto o cookie de sessão quanto o header `X-Requested-With`
 * (proteção padrão do produto contra CSRF simples em requisição cross-site).
 *
 * O log "server successfully started" (usado como wait strategy pela suíte
 * e2e/`testcontainers`) aparece um instante antes do listener HTTPS do
 * Jetty aceitar conexão de fato — algumas tentativas com retry curto
 * evitam falso-negativo por essa janela de corrida, tanto no teste quanto
 * em um pipeline de deploy real.
 */
export async function loginToEngine(config, { retries = 5, retryDelayMs = 2000 } = {}) {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      return await attemptLogin(config);
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }
  throw lastError;
}

async function attemptLogin(config) {
  const response = await fetchAgainstEngine(config, `${config.adminBaseUrl}/api/users/_login`, {
    method: 'POST',
    headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      username: config.adminUsername,
      password: config.adminPassword,
    }),
  });
  const setCookie = response.headers.get('set-cookie');
  if (!response.ok || !setCookie) {
    throw new Error(
      `Falha ao autenticar na API administrativa da Integration Engine (${config.adminBaseUrl}): HTTP ${response.status}.`,
    );
  }
  const body = await response.text();
  if (!body.includes('SUCCESS')) {
    throw new Error(`Login na Integration Engine não retornou SUCCESS: ${body}`);
  }
  // A API devolve possivelmente mais de um cookie (ex.: JSESSIONID +
  // atributos) — reenviamos só o par nome=valor de cada um, como o
  // navegador faria.
  return setCookie
    .split(/,(?=[^;]+?=)/)
    .map((cookie) => cookie.split(';')[0].trim())
    .join('; ');
}

function engineHeaders(cookie, extra = {}) {
  return { 'X-Requested-With': 'XMLHttpRequest', Cookie: cookie, ...extra };
}

/**
 * Remove (se existir) e recria o canal com o `channelId` fixo do template —
 * idempotente, seguro para reexecutar em pipeline de deploy sem acumular
 * canais duplicados. Um 404 no DELETE (canal ainda não existe) não é erro.
 */
export async function upsertChannel(config, cookie, channelId, channelXml) {
  const deleteResponse = await fetchAgainstEngine(
    config,
    `${config.adminBaseUrl}/api/channels/${channelId}`,
    { method: 'DELETE', headers: engineHeaders(cookie) },
  );
  if (!deleteResponse.ok && deleteResponse.status !== 404) {
    throw new Error(
      `Falha ao remover canal existente antes de recriar (HTTP ${deleteResponse.status}).`,
    );
  }

  const createResponse = await fetchAgainstEngine(config, `${config.adminBaseUrl}/api/channels`, {
    method: 'POST',
    headers: engineHeaders(cookie, { 'Content-Type': 'application/xml' }),
    body: channelXml,
  });
  if (!createResponse.ok) {
    throw new Error(`Falha ao criar o canal na Integration Engine: HTTP ${createResponse.status}.`);
  }

  // A API aceita silenciosamente XML malformado/incompatível e devolve um
  // "canal inválido" (sem erro HTTP) em vez de rejeitar a requisição —
  // achado desta implementação, documentado em
  // `backend/docs/integration-engine.md`. Confirmamos explicitamente que o
  // canal criado é válido antes de declarar sucesso.
  const getResponse = await fetchAgainstEngine(
    config,
    `${config.adminBaseUrl}/api/channels/${channelId}`,
    { headers: engineHeaders(cookie) },
  );
  const channelXmlStored = await getResponse.text();
  if (channelXmlStored.includes('This channel is invalid')) {
    throw new Error(
      'A Integration Engine aceitou a requisição mas marcou o canal como inválido (XML incompatível com as classes de conector/plugin instaladas) — ver backend/docs/integration-engine.md.',
    );
  }
}

/** Implanta (`_deploy`) o canal já criado — precisa rodar após `upsertChannel`. */
export async function deployChannel(config, cookie, channelId) {
  const response = await fetchAgainstEngine(
    config,
    `${config.adminBaseUrl}/api/channels/_deploy`,
    {
      method: 'POST',
      headers: engineHeaders(cookie, { 'Content-Type': 'application/xml' }),
      body: `<set><string>${channelId}</string></set>`,
    },
  );
  if (!response.ok) {
    throw new Error(`Falha ao implantar o canal na Integration Engine: HTTP ${response.status}.`);
  }
}

/**
 * Orquestra o fluxo completo (login → criar/substituir → implantar) para o
 * canal de teste HL7 v2.x (BE-06) — função de mais alto nível, reutilizada
 * pelo CLI e pela suíte e2e (`backend/test/integration-engine/`).
 */
export async function deployHl7v2TestChannel(config = loadDeployConfig()) {
  const template = await readFile(HL7V2_TEST_CHANNEL_XML_PATH, 'utf-8');
  const channelXml = renderChannelXml(template, config.coreIngestAclUrl);
  const cookie = await loginToEngine(config);
  await upsertChannel(config, cookie, HL7V2_TEST_CHANNEL_ID, channelXml);
  await deployChannel(config, cookie, HL7V2_TEST_CHANNEL_ID);
}

async function runAsCli() {
  const config = loadDeployConfig();
  // eslint-disable-next-line no-console -- script de CLI, saída para o operador é o próprio propósito
  console.log(`Implantando canal de teste HL7 v2.x em ${config.adminBaseUrl} ...`);
  await deployHl7v2TestChannel(config);
  // eslint-disable-next-line no-console
  console.log('Canal implantado com sucesso.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runAsCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
