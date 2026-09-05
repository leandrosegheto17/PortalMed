import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  // `rawBody: true` (BE-07, `TASK.md`) — preserva o buffer bruto da
  // requisição antes do parsing por content-type. Necessário porque o
  // `HttpPost` nativo do Orthanc (`ImagingGatewayController`, notificação
  // de instância estável) envia `Content-Type:
  // application/x-www-form-urlencoded` mesmo com corpo JSON (comportamento
  // do produto, confirmado empiricamente — não configurável) — sem isso, o
  // body-parser padrão interpretaria o corpo como formulário, não JSON.
  // Opção global e inofensiva para o restante das rotas (só adiciona
  // `req.rawBody`, não muda o `@Body()` já em uso em nenhum outro
  // controller). Ver `backend/docs/imaging-gateway.md`.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
