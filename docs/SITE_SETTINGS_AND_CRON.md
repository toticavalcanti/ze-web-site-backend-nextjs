# Site Settings & Cron — Guia

## Configurações do site (sitesettings)

Nova collection `sitesettings` (key-value) que tira do hardcode do frontend:

| Chave | Conteúdo | Onde aparece |
|---|---|---|
| `home_background` | `{ url, mediaId? }` | Foto de fundo da Home |
| `messages_post_background` | `{ url, mediaId? }` | Foto revelada pelas bolhas em `/messages/post` |
| `biography_pt` | `{ writtenBy, blocks[] }` | `/biography-pt-br` |
| `biography_en` | `{ writtenBy, blocks[] }` | `/biography-en` |

Blocos da biografia (`blocks[]`), na ordem em que aparecem na página:

- `{ type: 'heading', text }` — título de ano/período (ex.: "1971 - 1980")
- `{ type: 'paragraph', text }` — parágrafo de texto
- `{ type: 'image', title, url, alt, caption, width, height }` — foto com título acima e legenda abaixo

### API

- `GET /api/settings` — público, retorna `{ chave: valor }` de todas as settings. É o endpoint que o frontend consome (revalidate 10s).
- `GET /api/settings/:key` — público, retorna o valor de uma chave.
- `PUT /api/settings/:key` — admin, valida com Zod por chave e faz upsert.

### Admin

`/admin/site` (link "Site → Aparência & Biografia" no sidebar): troca das duas imagens de fundo (upload via Cloudinary, com preview) e editor de blocos da biografia em PT e EN (adicionar/remover/reordenar blocos).

### Seed

```bash
npm run seed:site-settings
```

Importa para o banco o conteúdo que estava hardcoded no frontend (as duas URLs de fundo e as biografias completas — 54 blocos PT, 52 blocos EN). O seed é idempotente e **nunca sobrescreve**: chaves já existentes são puladas. O frontend tem fallback para o conteúdo original, então mesmo sem rodar o seed nada quebra — mas rode-o para poder editar no admin partindo do texto atual.

## Cron — shows passados (paridade Strapi v3, com soft delete)

O Strapi rodava `config/functions/cron.js` todo dia às 00:01 e **deletava** shows com data anterior a hoje. Aqui o comportamento é preservado, mas com **soft delete**: o job marca `showStatus: 'realizado'` (mesmo estado do delete manual do admin). O `GET /api/shows` público já exclui `realizado` por padrão.

- Rota: `GET /api/cron/realize-past-shows`
- Agendamento: `vercel.json` → `"1 0 * * *"` (00:01 UTC diariamente)
- Segurança: defina `CRON_SECRET` nas env vars do projeto na Vercel. A Vercel envia `Authorization: Bearer $CRON_SECRET` automaticamente nas execuções agendadas; requisições sem o header são rejeitadas (401). Em produção, sem `CRON_SECRET` o job se recusa a rodar (503).

Teste manual:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<seu-backend>/api/cron/realize-past-shows
```

> Nota (plano Hobby da Vercel): crons no Hobby podem executar com precisão de ~1h dentro da janela, o que é irrelevante para este caso (basta rodar 1x/dia). Em planos pagos o horário é exato.

## E-mail — env vars unificadas

Antes havia dois padrões (`SMTP_*` no reset de senha e `EMAIL_SMTP_*` na resposta ao fã), o que fazia o e-mail de resposta falhar silenciosamente. Agora tudo usa:

```
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
EMAIL_FROM       (remetente da resposta ao fã, ex.: robertaramalho@avohaimusic.com)
EMAIL_REPLY_TO   (opcional; default = EMAIL_FROM)
```

As variáveis legadas `EMAIL_SMTP_*` / `EMAIL_ADDRESS_*` seguem aceitas como fallback.

## Anti-spam de mensagens

`POST /api/messages` agora tem:

- **Rate limit** por IP: 3 mensagens/hora (collection `ratelimits` com TTL — se limpa sozinha). Admins autenticados são isentos. Excedeu → HTTP 429 com `Retry-After`.
- **Honeypot**: se o body vier com o campo `website` preenchido (o form do site o inclui invisível), a API responde 201 falso e não salva nada.

## Counts (paridade Strapi)

Todos os content types agora têm `GET /api/<tipo>/count` como no Strapi v3 (`/lyrics/count`, `/books/count`, …). Público conta só publicados (shows também excluem `realizado`); admins podem usar `?published=all|false`.
