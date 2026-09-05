--[[
  BE-07 (`TASK.md`) — script Lua do Orthanc (self-hosted, ADR-003), único
  artefato de configuração-como-código deste gateway (o restante da
  configuração do Orthanc — AE Title, portas, autenticação — é feito
  inteiramente via variáveis de ambiente `ORTHANC__<CHAVE>`, suportadas
  nativamente pela imagem oficial `orthancteam/orthanc`; ver
  `backend/docs/imaging-gateway.md` para a lista completa. Diferente da
  Integration Engine (BE-06, NextGen Connect), o Orthanc não expõe uma API
  administrativa stateful que precise de um script de deploy separado —
  este arquivo é montado/copiado para dentro da imagem pelo DevOps
  (`/etc/orthanc/scripts/on-stable-study.lua`) e referenciado via
  `ORTHANC__LUA_SCRIPTS=["/etc/orthanc/scripts/on-stable-study.lua"]`).

  `OnStableStudy` é o gatilho assíncrono nativo do Orthanc: dispara depois
  que nenhuma nova instância chega para o estudo por `StableAge` segundos
  (default do produto; ambiente de teste usa um valor baixo via
  `ORTHANC__STABLE_AGE`) — desacoplado da associação DICOM do C-STORE
  original, exatamente o "pipeline de conversão assíncrona" exigido pelo
  critério de aceite desta tarefa (RF-07: falha de conversão de um exame
  não bloqueia o restante da lista do paciente).

  Para cada instância do estudo estável, propaga ao core (via
  `ORTHANC_CORE_NOTIFY_ENDPOINT`, mesmo nome de variável de ambiente já
  reservado por `infra/environments/{staging,production}/main.tf` no
  serviço `imaging_gateway_service`) o `RemoteAET` nativo do Orthanc (AE
  Title de origem do PACS do hospital que enviou o C-STORE) + os três UIDs
  DICOM padrão (Study/Series/SOPInstance) + o ID interno do Orthanc (só
  para a ACL do core buscar a prévia já convertida via REST — nunca
  propagado além da ACL, ADR-012 já decidiu que o modelo de dados de
  domínio usa UIDs padrão, não o ID proprietário do Orthanc).

  O Orthanc permanece um produto de mercado genérico, sem nenhum
  conhecimento de tenant (GUARDRAILS.md item 15/ADR-012) — a resolução de
  `tenant_id` a partir do `RemoteAET` acontece inteiramente na Aplicação
  Core (BE-38, tarefa futura), nunca aqui.

  BE-09 (`TASK.md`) — `ImagingGatewayController` exige o header
  `X-Service-Api-Key` (`GUARDRAILS.md` item 13, credencial de serviço
  dedicada). `HttpPost(url, body, headers)` aceita um terceiro argumento
  (tabela Lua de headers) desde a versão 1.2.1 do Orthanc — bem anterior à
  imagem fixada por esta tarefa (26.8.2) — usado abaixo para anexar o
  header sem depender de nenhuma extensão/plugin adicional.

  Nota de correção pós-implementação (fix-loop, BE-09): a variável lida
  abaixo era `SERVICE_API_KEY` até a revisão pós-implementação encontrar
  que `infra/modules/secrets/main.tf`/`infra/environments/{staging,production}/main.tf`
  já injetavam este exato secret no container do gateway sob o nome
  `INTERNAL_SERVICE_API_KEY` desde a fundação de infraestrutura — corrigido
  para casar com o nome já provisionado (ver
  `backend/docs/service-api-key-auth.md`).
]]

function OnStableStudy(studyId, tags, metadata)
  local notifyUrl = os.getenv('ORTHANC_CORE_NOTIFY_ENDPOINT')
  if notifyUrl == nil then
    -- Falha explícita nos logs em vez de silenciosa (`TASK.md` §1.1) —
    -- variável obrigatória, sem valor "adivinhado".
    print('ORTHANC_CORE_NOTIFY_ENDPOINT nao definida - notificacao ao core nao enviada para o estudo ' .. studyId)
    return
  end

  local serviceApiKey = os.getenv('INTERNAL_SERVICE_API_KEY')
  if serviceApiKey == nil then
    -- BE-09 — mesma disciplina de falha explícita acima: sem a credencial,
    -- o core rejeitaria a notificação com 401 mesmo assim (ServiceApiKeyGuard,
    -- GUARDRAILS.md item 13) — melhor não tentar silenciosamente.
    print('INTERNAL_SERVICE_API_KEY nao definida - notificacao ao core nao enviada para o estudo ' .. studyId)
    return
  end

  local study = ParseJson(RestApiGet('/studies/' .. studyId))
  for _, seriesId in ipairs(study['Series']) do
    local series = ParseJson(RestApiGet('/series/' .. seriesId))
    for _, instanceId in ipairs(series['Instances']) do
      local remoteAet = RestApiGet('/instances/' .. instanceId .. '/metadata/RemoteAET')
      local instanceTags = ParseJson(RestApiGet('/instances/' .. instanceId .. '/tags?simplify'))

      local payload = DumpJson({
        remoteAet = remoteAet,
        studyInstanceUid = instanceTags['StudyInstanceUID'],
        seriesInstanceUid = instanceTags['SeriesInstanceUID'],
        sopInstanceUid = instanceTags['SOPInstanceUID'],
        orthancInstanceId = instanceId
      })

      -- `HttpPost` do Orthanc envia `Content-Type:
      -- application/x-www-form-urlencoded` mesmo com corpo JSON
      -- (comportamento do produto, não configurável) — a ACL do core
      -- (`ImagingGatewayController`) lê o corpo bruto e faz o próprio
      -- `JSON.parse`, decisão documentada em `backend/docs/imaging-gateway.md`.
      -- Terceiro argumento (BE-09) — tabela de headers HTTP, único jeito
      -- suportado pelo Orthanc de anexar um header custom ao `HttpPost`.
      HttpPost(notifyUrl, payload, { ['X-Service-Api-Key'] = serviceApiKey })
    end
  end
end
