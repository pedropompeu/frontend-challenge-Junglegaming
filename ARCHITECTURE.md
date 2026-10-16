# Arquitetura — Kurio

Este documento explica como a solução está organizada e por quê: camadas, contratos REST e de eventos, backend simulado, sessão, carrinho, cache, tempo real, idempotência, decisões de UX, desvios do Figma e limitações conhecidas. Setup, credenciais e cenários estão no [`README.md`](README.md). A rastreabilidade requisito → código → teste está em [`REQUIREMENTS.md`](REQUIREMENTS.md).

## 1. Visão geral

```
 Interface (routes/, features/*/components, shared/ui)
      │  hooks de query e mutation
 Estado remoto (TanStack Query: features/*/queries.ts, app/query-client.ts)
      │  funções tipadas
 Transporte (features/*/api.ts → shared/lib/http.ts [Axios] · shared/lib/socket.ts [socket.io-client])
      │  contratos zod (contracts/)
 ─────────── rede do navegador ───────────
 Backend simulado (mocks/): MSW (REST) + @mswjs/socket.io-binding (Socket.IO) sobre um banco em memória
```

A app não sabe que o backend é simulado. Componentes, hooks e o cliente Axios não têm dados fictícios nem caminhos alternativos: tudo vem de `/api` e do Socket.IO da mesma origem. Com `VITE_ENABLE_MOCKS=false`, o mesmo build falaria com um backend real que siga os contratos abaixo.

| Pasta                                  | Responsabilidade                                                                                                                                                                                                  |
| -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/contracts/`                       | Schemas zod de cada DTO, do envelope de erro e dos eventos. É a única definição dos tipos, compartilhada entre a app e os mocks.                                                                                  |
| `src/routes/`                          | Rotas do TanStack Router por arquivo. `_auth.tsx` é o guard das rotas privadas (`_auth/*`). Loaders usam `ensureQueryData`/`fetchQuery`, e o `head` de cada rota dá o título e a descrição.                       |
| `src/features/<domínio>/`              | `api.ts` (chamadas Axios validadas pelo contrato), `queries.ts` (`queryOptions` e mutations), `components/` e a lógica do domínio (por exemplo `checkout/attempt-store.ts`).                                      |
| `src/shared/lib/`                      | `http` (Axios), `socket`, `realtime-gate` (dedupe e versão de eventos), `money` (big.js), `session-store`, `guest`, `query-keys`, `backend-ready`, `announce` (região `aria-live`).                               |
| `src/shared/ui/`, `src/shared/layout/` | Componentes shadcn/ui retematizados e o layout (Header, BottomNav, FeatureStrip, Footer).                                                                                                                         |
| `src/mocks/`                           | Banco simulado (`db/`), fixtures, handlers REST, servidor Socket.IO (`socket/`), cenários, API de controle (`control.ts`) e painel de cenários. Vai num chunk próprio, carregado só com `VITE_ENABLE_MOCKS=true`. |

## 2. Fronteira tipada

- Cada resposta passa por `request(schema, config)` (`shared/lib/http.ts`), que valida com zod. Resposta fora do contrato vira `ApiError` com código `UNKNOWN`, e não um dado meio certo na tela.
- Erros chegam como `ApiError { status, code, message, fieldErrors?, details? }`. O cliente acrescenta três códigos próprios: `TIMEOUT` (estourou os 10 s do Axios), `NETWORK` (sem resposta) e `UNKNOWN`. Um 5xx sem corpo no contrato vira `TRANSIENT`.
- `fieldErrors` da API vão para os campos do formulário (`setError` do react-hook-form) e aparecem associados ao campo por `aria-describedby`.
- Valores em ETH trafegam como strings decimais (`/^\d+(\.\d{1,18})?$/`) e só são operados com big.js (`shared/lib/money.ts`). O cliente nunca calcula total: subtotal, desconto, taxa e total vêm da cotação.
- Quantidades são inteiros ≥ 1 nos contratos.

## 3. Contratos REST

Base `/api`. Autenticação por `Authorization: Bearer <token>`. Todo pedido leva também `X-Guest-Id`, o identificador do carrinho do visitante. Erros usam um envelope único:

```json
{
  "error": {
    "code": "AVAILABILITY_CONFLICT",
    "message": "…",
    "fieldErrors": { "campo": "…" },
    "details": {}
  }
}
```

| Código                              | Status | Quando                                                                                                                                                                                   |
| ----------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`                  | 422    | Corpo inválido (com `fieldErrors`), carrinho vazio na cotação, senha atual incorreta, `Idempotency-Key` ausente                                                                          |
| `UNAUTHENTICATED`                   | 401    | Endpoint privado sem token ou com token desconhecido; login com credenciais erradas                                                                                                      |
| `SESSION_EXPIRED`                   | 401    | Token vencido                                                                                                                                                                            |
| `FORBIDDEN`                         | 403    | Reservado no contrato e tratado pelo cliente, mas nenhum handler o emite: recurso de outro usuário responde 404 para não revelar que existe (ver §15). Pode ser injetado com `failNext`. |
| `NOT_FOUND`                         | 404    | NFT, item, pedido, cotação ou carteira inexistente, ou de outro usuário                                                                                                                  |
| `AVAILABILITY_CONFLICT`             | 409    | Quantidade acima do estoque da edição (`details` traz o disponível)                                                                                                                      |
| `QUOTE_STALE`                       | 409    | Preço, cupom ou validade mudaram desde a cotação (`details.quote` traz a cotação nova)                                                                                                   |
| `IDEMPOTENCY_CONFLICT`              | 409    | `Idempotency-Key` reutilizada com outro corpo                                                                                                                                            |
| `EMAIL_TAKEN` / `USERNAME_TAKEN`    | 409    | Cadastro ou perfil com e-mail/usuário já em uso (com `fieldErrors`)                                                                                                                      |
| `WALLET_REJECTED`                   | 409    | Conexão de carteira recusada, ou pedido enviado com a carteira desconectada                                                                                                              |
| `COUPON_INVALID` / `COUPON_EXPIRED` | 422    | Cupom inexistente ou vencido (com `fieldErrors.couponCode`)                                                                                                                              |
| `TRANSIENT`                         | 503    | Falha passageira; pode repetir                                                                                                                                                           |

| Recurso                         | Endpoint                                                                    | Sucesso                                                                                   | Erros específicos                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Sessão                          | `POST /auth/register`                                                       | 201 `Session`                                                                             | 409 `EMAIL_TAKEN`/`USERNAME_TAKEN`, 422                                                                        |
|                                 | `POST /auth/login`                                                          | 200 `Session`                                                                             | 401 `UNAUTHENTICATED`                                                                                          |
|                                 | `GET /session`                                                              | 200 `{ user, expiresAt }`                                                                 | 401                                                                                                            |
|                                 | `POST /auth/logout`                                                         | 204                                                                                       | —                                                                                                              |
| NFTs                            | `GET /nfts?q&collections&networks&priceMin&priceMax&sort&tab&page&pageSize` | 200 página de `NftSummary` (`pageSize` ≤ 48)                                              | —                                                                                                              |
|                                 | `GET /nfts/:id`                                                             | 200 `Nft` (edições com preço, estoque e `version`)                                        | 404                                                                                                            |
|                                 | `GET /collections` _(extensão)_                                             | 200 coleções com contagem, para os filtros                                                | —                                                                                                              |
| Favoritos                       | `GET /favorites`                                                            | 200 `{ nftIds }`                                                                          | 401                                                                                                            |
|                                 | `PUT /favorites/:nftId`, `DELETE /favorites/:nftId`                         | 200 `{ nftIds }`                                                                          | 404                                                                                                            |
| Carrinho                        | `GET /cart`                                                                 | 200 `Cart` (do usuário ou do visitante)                                                   | —                                                                                                              |
|                                 | `POST /cart/items` `{ nftId, editionId, quantity }`                         | 200 `Cart` (soma se o par já existe)                                                      | 409 `AVAILABILITY_CONFLICT`, 404                                                                               |
|                                 | `PATCH /cart/items/:itemId` `{ quantity }`                                  | 200 `Cart`                                                                                | 409 `AVAILABILITY_CONFLICT`, 404                                                                               |
|                                 | `DELETE /cart/items/:itemId`                                                | 200 `Cart`                                                                                | 404                                                                                                            |
|                                 | `POST /cart/merge`                                                          | 200 `Cart` (funde o carrinho do `X-Guest-Id` no do usuário)                               | 401                                                                                                            |
| Cotação                         | `POST /quotes` `{ couponCode?, network }`                                   | 201 `Quote` (linhas, subtotal, desconto, taxa, total, `expiresAt` = 5 min, `cartVersion`) | 422 `COUPON_*`/`VALIDATION_ERROR`, 409 `AVAILABILITY_CONFLICT`, 404                                            |
| Pedidos                         | `POST /orders` + `Idempotency-Key` `{ quoteId, walletSessionId, buyer }`    | 202 `Order` novo; 200 o mesmo pedido para a mesma chave e o mesmo corpo                   | 422 sem chave, 409 `IDEMPOTENCY_CONFLICT`/`QUOTE_STALE`/`AVAILABILITY_CONFLICT`/`WALLET_REJECTED`, 404 cotação |
|                                 | `GET /orders/:id`                                                           | 200 `Order` (estado e recibo)                                                             | 404                                                                                                            |
|                                 | `GET /orders/by-tx/:hash` _(extensão)_                                      | 200 `Order`, para o explorador simulado                                                   | 404                                                                                                            |
| Perfil                          | `GET /profile`, `PATCH /profile`                                            | 200 `Profile`                                                                             | 409 `USERNAME_TAKEN`/`EMAIL_TAKEN`, 422                                                                        |
|                                 | `PUT /profile/avatar` `{ dataUrl \| null }`                                 | 200 `Profile`                                                                             | 422                                                                                                            |
|                                 | `POST /profile/password`                                                    | 204                                                                                       | 422 "Senha atual incorreta"                                                                                    |
| Carteiras                       | `GET /wallets`                                                              | 200 `Wallet[]`                                                                            | —                                                                                                              |
|                                 | `PUT /wallets/primary`, `PUT /wallets/secondary`                            | 200 `Wallet` (cria ou atualiza o slot)                                                    | 422, 404                                                                                                       |
| Sessão de carteira _(extensão)_ | `POST /wallet-sessions` `{ walletId \| customWallet, provider, network }`   | 201 `{ id, status: 'connected', address }`                                                | 409 `WALLET_REJECTED` (cenário `wallet-rejected`), 404 carteira                                                |
|                                 | `DELETE /wallet-sessions/:id`                                               | 204                                                                                       | 404                                                                                                            |

Todos os endpoints, exceto login, cadastro, catálogo e carrinho, exigem sessão. As três extensões além dos oito recursos mínimos do enunciado são `/collections` (contagens dos filtros), `/wallet-sessions` (conexão, recusa e desconexão da carteira) e `/orders/by-tx/:hash` (explorador simulado).

## 4. Eventos em tempo real

Envelope comum (`contracts/events.ts`):

```ts
{ eventId: string, type: 'nft.updated' | 'order.updated', resource: { type: 'nft' | 'order', id },
  version: number, occurredAt: string, userId?: string, payload }
```

| Evento          | Payload                                                                                  | Destino                           | Efeito no cliente                                                                                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nft.updated`   | `{ editions }`: estado completo das edições (preço e estoque), com uma `version` por NFT | Todas as conexões                 | Atualiza com `setQueryData` o detalhe, as páginas de lista e as linhas do carrinho. Marca as cotações como velhas. Linhas do carrinho afetadas ganham o selo "Preço atualizado"/"Estoque atualizado", com toast e anúncio na região `aria-live`. |
| `order.updated` | `{ order }`: o pedido inteiro, com status e snapshot                                     | Só as conexões do dono (`userId`) | Atualiza o pedido em cache e, se terminal, limpa o estado local do checkout e recarrega o carrinho                                                                                                                                               |

Garantias:

- **Identidade estável:** `eventId` único por emissão. O servidor reenvia o mesmo `eventId` em `emitDuplicate`.
- **Versão por recurso:** o `createEventGate` (`shared/lib/realtime-gate.ts`) lembra os últimos 500 `eventId` e a maior versão aceita por `resource.type:id`. Evento repetido, ou com versão menor ou igual, é descartado antes de tocar no cache. As funções de aplicação ainda comparam com a versão em cache: um evento atrasado não regride um dado mais novo que veio pela REST.
- **Status terminal:** pedido `confirmed` ou `declined` nunca muda. O servidor ignora uma segunda liquidação, e o cliente ignora `order.updated` para pedido já terminal.
- **Isolamento:** o servidor só manda `order.updated` às conexões do dono, e o cliente ainda confere `event.userId` e `order.userId` contra a sessão atual. O socket é por token: logout ou troca de usuário desmontam o listener, desconectam o socket e zeram o gate. Eventos de uma sessão anterior não têm por onde chegar.
- **Ciclo de vida:** o `RealtimeProvider` (montado no `__root`) registra os listeners num efeito com cleanup (`off()` + `disconnect()`). A reconexão do `socket.io-client` usa `reconnectionDelay` 500 ms, `reconnectionDelayMax` 3 s e `timeout` 5 s por tentativa.

## 5. Transporte Socket.IO no ambiente de mocks

O servidor simulado (`mocks/socket/server.ts`) usa o `@mswjs/socket.io-binding` sobre o interceptor de WebSocket do MSW. Ele fala o protocolo engine.io/socket.io de verdade (handshake `0{…}`, `40`, `42[...]`), e o cliente é o `socket.io-client` oficial.

Limitações e o que foi feito com cada uma:

- **Só WebSocket.** O interceptor do MSW não cobre o long-polling do engine.io, então o cliente conecta com `transports: ['websocket']`. Um backend real aceitaria os dois.
- **Caminho na origem.** O link do binding casa a origem da página, e um guarda de caminho só atende `/socket.io/`. Outros WebSockets da mesma origem (o HMR do Vite, por exemplo) seguem para o servidor real.
- **Sem ping do binding.** O binding anuncia `pingInterval` de 25 s mas não pinga. O servidor simulado envia o próprio ping a cada 20 s para o cliente não derrubar a conexão.
- **Sem rooms.** O roteamento por usuário é um mapa de conexões por token. `dropSocket({ holdMs })` fecha todas e recusa novas por `holdMs`, e o logout fecha as conexões daquele token.
- **Ordem de carga.** O engine.io guarda `globalThis.WebSocket` quando o módulo é avaliado. Por isso o `socket.io-client` é importado dinamicamente depois de `backendReady()`, quando o interceptor já está instalado.
- **Um backend por aba.** O banco simulado vive na memória da aba e é persistido no `localStorage`. Duas abas abertas ao mesmo tempo não compartilham eventos, e a última que gravar sobrescreve o banco (ver §15).

## 6. Backend simulado e por que a API de controle não é injeção na UI

- **Banco** (`mocks/db/`): usuários (senha com SHA-256 + salt via WebCrypto), sessões, NFTs com edições e `version`, favoritos, carrinhos por usuário e por visitante, cupons, cotações, pedidos com o registro de idempotência, carteiras, sessões de carteira e perfis. É persistido em `localStorage` (`kurio:mockdb:v1`) e recriado do seed quando o cenário muda ou no reset.
- **Seed determinístico:** 50 NFTs gerados por PRNG com semente 42, 6 coleções, 3 redes, 2 usuários e 2 cupons conhecidos. O mesmo seed serve dev, demo, testes e Lighthouse.
- **Pipeline de cada requisição** (`mocks/route.ts`): `offline` (erro de rede) → falha injetada por `failNext` → override do cenário → 503 do `server-errors` → latência do cenário → autenticação (sessão inexistente dá 401 `UNAUTHENTICATED`, vencida dá 401 `SESSION_EXPIRED`) → `X-Guest-Id` → handler. O override `hang-first` executa o handler (o pedido é criado) e nunca responde.
- **Cenários:** catálogo de 16 nomes em `mocks/scenarios/scenarios.ts` (tabela no README), selecionados por `?scenario=`, pelo painel ou por `reset()`.

A API de controle (`window.__kurioMocks`) e o painel de cenários **mudam o backend, não a interface**. `mutateNft` altera o NFT no banco simulado e emite `nft.updated` pelo servidor Socket.IO simulado. A interface só fica sabendo porque o `socket.io-client` recebeu o frame, passou pelo schema e pelo gate, e o cache foi atualizado. A REST devolve o mesmo dado novo. `settleOrder` liquida o pedido no banco e emite `order.updated` do mesmo jeito. `dropSocket` derruba as conexões no servidor, e o cliente reconecta sozinho. Nada disso chama setter, callback ou cache da app. Os testes de tempo real exercitam esse caminho completo, e o `00-smoke` confere os frames crus do protocolo.

A API de controle roda dentro da aba e não passa pela rede. Por isso as falhas dos cenários (`offline`, `server-errors`, `failNext`) não atingem o painel, e o avaliador sempre consegue trocar de cenário ou resetar.

## 7. Sessão

- Login e cadastro devolvem `{ token, expiresAt, user }` (token opaco, 2 h; 60 s no cenário `session-expired`). O `session-store` guarda a sessão no `localStorage` e é a verdade síncrona para o Axios e para o guard. No boot, `GET /session` confirma o token.
- **Rotas privadas** (`_auth`): checkout, pedido, perfil, carteiras e favoritos. O `beforeLoad` faz `fetchQuery` da sessão com `staleTime: 0`. Sem sessão, redireciona para `/entrar?redirect=<href>`.
- **Expiração:** um 401 `SESSION_EXPIRED` (ou `UNAUTHENTICATED` com sessão salva) em qualquer chamada dispara o evento de expiração. O provedor limpa a sessão e leva a `/entrar?redirect=<href>&motivo=expirada`, com o aviso "Sua sessão expirou". O rascunho do checkout fica no `sessionStorage` do mesmo usuário. Depois do login, o usuário volta ao ponto onde estava, com o formulário preenchido. Fechar o login sem entrar volta ao `redirect` só se ele for público; rota privada leva ao Início.
- **Logout e troca de usuário:** `POST /auth/logout` (o servidor fecha os sockets do token), `clearPrivateState` remove todas as queries `['private', …]` e os rascunhos, tentativas e pedidos pendentes de outros usuários, o socket do token antigo é desconectado e o gate de eventos é zerado. Todas as query keys privadas começam com `['private', userId | ownerKey]`, então um dado de outro usuário nem compartilha a chave.
- Senhas nunca ficam em claro: o banco simulado guarda hash + salt, e a app não guarda a senha.

## 8. Carrinho e cotação

- **O carrinho vive no servidor simulado.** O visitante ganha um `guestId` (`localStorage`, header `X-Guest-Id`), e o carrinho dele fica no banco sob esse id. Por isso o carrinho sobrevive a refresh, logado ou não.
- **Login preserva os itens do visitante:** depois do login, `POST /cart/merge` funde o carrinho do visitante no do usuário. Quantidades do mesmo item se somam, limitadas ao estoque, e edições esgotadas são ignoradas. Depois o servidor apaga o carrinho do visitante e o cliente troca o `guestId`. O cupom aplicado como visitante vai junto (`moveGuestCoupon`) e vale sobre um cupom antigo do usuário, porque é o que estava na tela. Uma falha no merge não bloqueia o login.
- **Disponibilidade por NFT e edição:** o item é o par `nftId + editionId`. O stepper do detalhe limita ao estoque menos o que já está no carrinho, e o do carrinho limita ao estoque. A API recusa com 409 `AVAILABILITY_CONFLICT` informando o disponível.
- **Cotação é a referência:** o resumo exibido é sempre a resposta do `POST /quotes`, com cupom e rede salvos por dono em `kurio:checkout:<ownerKey>`. Um cupom que o servidor passa a recusar sai das preferências, com aviso. Linha acima do estoque suspende a cotação e pede o ajuste ("Ajuste as quantidades destacadas").
- **Atualização otimista:** a quantidade do carrinho e o favorito mudam na hora, com rollback (e aviso acessível) quando a API falha. As alterações de quantidade de uma linha entram numa fila por `scope`, para não chegarem fora de ordem.

## 9. Checkout, pedido e idempotência

- **Fluxo:** `editing` (formulário + carteira) → **Revisar pedido** → `reviewing` (resumo congelado da cotação revisada) → **Confirmar compra** → `POST /orders` → `/pedido/$orderId`.
- **Carteira simulada:** escolha da carteira cadastrada (ou "Usar outra carteira?" só para este pedido), do provedor e da rede, e então `POST /wallet-sessions`. Recusa (`WALLET_REJECTED`) e desconexão (botão ou `disconnectWallet()`) bloqueiam a confirmação até reconectar. A rede muda só a taxa da cotação.
- **Revalidação antes de confirmar:** qualquer `nft.updated` que mude preço ou estoque de uma linha invalida a cotação. Se os valores novos diferem dos revisados, a revisão mostra "Valores atualizados — revise antes de confirmar" e exige **Revisar novamente**. Item que esgota durante a revisão bloqueia a confirmação e oferece voltar ao carrinho. No servidor, `POST /orders` revalida preço, estoque, cupom e validade da cotação. Se algo mudou, responde 409 `QUOTE_STALE` com a cotação nova, e o diálogo "Os valores mudaram" compara antes e depois.
- **Idempotência no cliente** (`features/checkout/attempt-store.ts`): antes do POST, a tentativa `{ idempotencyKey, quoteId, payloadHash, body, quote }` é gravada no `sessionStorage` do usuário. Repetir o envio (duplo clique, Enter, reenvio após timeout) com a mesma cotação e o mesmo corpo reaproveita a chave. Mudar cotação ou corpo é outra compra, com chave nova. Um `ref` de envio em voo e o `isPending` do botão evitam o segundo POST no mesmo instante. Uma tentativa ainda sem resposta sobrevive à recarga: ao montar, o checkout a encontra (`resumableAttempt`), abre em "Não confirmamos o envio" e a reenvia uma vez com a mesma chave. Os handlers de sucesso e erro ficam no `useMutation`, e não no `mutate`, para rodar mesmo depois de o usuário sair do checkout: o 202 tardio ainda grava o pedido pendente, e um toast oferece **Ver pedido**. Uma recusa 4xx descarta a tentativa, inclusive o 401 de sessão expirada, porque o servidor devolve o pedido existente antes de validar: sem pedido para a chave, depois do login a compra se confirma de novo.
- **Idempotência no servidor:** a chave é registrada por usuário com o SHA-256 do corpo. A mesma chave com o mesmo corpo devolve 200 com o pedido já criado. Com outro corpo, devolve 409 `IDEMPOTENCY_CONFLICT`, e o cliente descarta a tentativa e pede nova confirmação.
- **Timeout:** sem resposta em 10 s (ou com queda de rede), o checkout entra em `uncertain` ("Não confirmamos o envio") e só permite reenviar o **mesmo** corpo com a **mesma** chave. O reenvio recupera o pedido criado. Retry automático só acontece em `TRANSIENT`, até 2 vezes.
- **Pedido pendente:** o `orderId` fica em `localStorage` (`kurio:pending-order:<userId>`). Abrir o checkout com um pedido pendente leva ao pedido, e não a uma compra nova. A tela do pedido consulta `GET /orders/:id`, recebe `order.updated` e, enquanto o pedido estiver pendente, refaz a consulta a cada 15 s como reconciliação.
- **Estados:** `pending` → `confirmed` | `declined` (terminais). No cenário `default`, o servidor confirma ~3 s depois. A confirmação ("Pedido confirmado", com recibo) só aparece com status `confirmed` vindo do servidor. Recusado mostra o motivo e volta ao carrinho intacto.
- **Recibo:** é o snapshot gravado no pedido (linhas, preços, cupom, taxa, total, carteira, comprador, hash). Mudanças posteriores no catálogo não o alteram. Hash e link de exploração são simulados (`/explorador/tx/$hash`).
- **Carrinho depois da compra:** em caso de sucesso, o servidor remove só os itens e quantidades comprados. Em falha ou recusa, nada sai do carrinho, e o estoque reservado na criação do pedido volta.

## 10. Cache, retries e sincronização

| Dado                         | Query key                          | Política                                                                                                 |
| ---------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Padrão                       | —                                  | `staleTime` 30 s, `gcTime` 5 min, `refetchOnWindowFocus`                                                 |
| Lista do catálogo            | `['nfts', 'list', params]`         | `placeholderData: keepPreviousData` (a lista anterior fica, marcada como atualizando, até a nova chegar) |
| Coleções                     | `['nfts', 'collections']`          | `staleTime` 5 min                                                                                        |
| Detalhe                      | `['nfts', 'detail', id]`           | padrão; o loader usa `ensureQueryData`                                                                   |
| Sessão                       | `['session']`                      | `staleTime` 60 s, sem retry; o guard usa `staleTime: 0`                                                  |
| Carrinho, cotação            | `['private', ownerKey, …]`         | `staleTime: 0`                                                                                           |
| Favoritos, perfil, carteiras | `['private', userId, …]`           | padrão                                                                                                   |
| Pedido                       | `['private', userId, 'order', id]` | `refetchInterval` 15 s enquanto pendente                                                                 |

- **Retries:** queries repetem até 2 vezes, com backoff de 500 ms · 2ⁿ, só para `NETWORK`, `TIMEOUT`, `TRANSIENT` e 5xx. Um 4xx nunca é repetido. Mutations não repetem, exceto o envio do pedido em `TRANSIENT`, que é seguro pela chave de idempotência.
- **Respostas obsoletas:** a query key contém todos os parâmetros, e o `AbortSignal` do TanStack Query vai até o Axios. Uma resposta de parâmetros antigos é cancelada ou cai numa chave que já não está na tela, e o cancelamento não é tratado como erro. O cenário `jitter` e o `01-catalog` exercitam isso.
- **Invalidação após mutations:** adicionar ou alterar o carrinho grava a resposta no cache e invalida as cotações. Favoritos invalidam a lista de favoritos quando não há outra troca em voo. Perfil e carteiras gravam a resposta. Pedido liquidado invalida carrinho e cotações.
- **Estado da URL:** busca, filtros, ordenação, aba e página ficam nos search params (`validateSearch` com zod e `.catch` por campo). Listas são gravadas em CSV, e mudar um filtro volta à página 1. Tudo sobrevive a refresh e à navegação pelo histórico.

## 11. Reconciliação REST ↔ Socket.IO

A REST é a fonte da verdade. O socket é o atalho para chegar antes.

- Na **primeira conexão** não há o que reconciliar, porque as queries acabaram de buscar.
- Em cada **reconexão**, o provedor invalida `['nfts']` (listas e detalhes), `['private', ownerKey]` (carrinho e cotações do dono atual) e `['private', userId, 'order']` (pedidos). O que mudou enquanto a conexão estava fora volta pela REST, e as queries ativas refazem a busca na hora.
- Eventos que chegam depois de uma resposta REST mais nova são descartados pela comparação de versão. Uma resposta REST com versão mais nova sobrescreve o cache normalmente.
- O pedido pendente tem uma terceira via: o refetch a cada 15 s e a releitura ao recarregar a página. Assim o pedido termina mesmo se o evento se perder.
- Indicador de conexão: "Ao vivo", "Reconectando…" ou "Sem atualizações ao vivo" (o texto aparece no header a partir de `lg`; abaixo disso, uma pílula surge só quando há problema).

## 12. Decisões de UX

- **Navegação:** Header a partir de 768 px. No mobile, BottomNav, exceto no detalhe (barra de compra fixa), no carrinho e no checkout (resumo grudado no rodapé). "Mercado" leva ao catálogo (`/#catalogo`).
- **Acesso:** login e cadastro abrem como modal sobre a Início no desktop (como no Figma) e em tela cheia no mobile. O foco volta a quem abriu. O `?redirect=` devolve o usuário ao fluxo.
- **Confirmação:** modal sobre o fundo no desktop (como no Figma); página no mobile, com "Continuar explorando". Pendente e recusado são cartões na página.
- **Edição na URL:** o detalhe guarda a edição em `?edicao=`. Uma edição esgotada continua selecionável e mostra "Edição indisponível" no lugar do CTA. "Comprar NFT" adiciona e leva ao carrinho.
- **Filtros não mexem no scroll;** a paginação leva ao topo do catálogo.
- **Ações fora do escopo** (Criadores, Aprenda, login social, esqueci a senha, scan, newsletter, itens da sidebar do perfil) ficam visíveis como no Figma, com `aria-disabled` e o toast "Indisponível nesta demonstração". Nunca aparentam sucesso.
- **Perfil e senha** ficam sob um único "Salvar": o perfil só vai ao servidor se mudou, e a senha só se algum campo dela foi preenchido. O foco vai ao primeiro erro.
- **Avatar** é redimensionado no navegador e salvo como WebP (JPEG no Safari, que não codifica WebP).
- **Asteriscos de obrigatório** seguem o schema zod, e não o Figma, onde alguns campos opcionais tinham asterisco.

## 13. Desvios do Figma e substituições de asset

| Item                                                | Figma                                | Entrega                                                                                               | Motivo                                                                         |
| --------------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `/favoritos`                                        | Não desenhada                        | Grade de cards no padrão do catálogo                                                                  | Destino do coração da BottomNav; favoritos exigem uma tela                     |
| Perfil, carteiras e confirmação no mobile           | Só desktop                           | Derivadas do desktop: a sidebar vira uma faixa rolável abaixo de `lg`                                 | O enunciado pede essas telas no mobile                                         |
| "Ver no Etherscan"                                  | Link externo                         | "Ver no Etherscan (simulado)" → `/explorador/tx/$hash`                                                | O hash é fictício; um link real levaria a uma página inexistente               |
| Estados vazio, erro, carregando, recusado, pendente | Não desenhados                       | Mesma linguagem visual (cartões `surface`, skeletons com shimmer)                                     | Exigidos pelo enunciado                                                        |
| Nome ENS                                            | Select com chevron                   | Caixa fixa `.eth` à esquerda do campo                                                                 | Só existe um sufixo; o chevron prometia uma escolha inexistente                |
| Imagens dos NFTs                                    | 4 ilustrações PNG embutidas nos SVGs | 4 ilustrações × 4 tons (PIL) = 16 imagens WebP (400 e 800 px) para 50 NFTs; o hero usa a ilustração 1 | O Figma só tem 4 artes; 50 NFTs precisavam de variedade sem inventar arte nova |
| Blog "Diário da Cunhagem"                           | Fotos editoriais                     | Reaproveita as imagens dos NFTs                                                                       | Sem fotos exportáveis; a seção é estática (fora do escopo funcional)           |
| Ícones                                              | Ícones do arquivo                    | lucide-react; glifos sociais simplificados; envelope "Thank you" com os paths do Figma                | O lucide não tem ícones de marca                                               |
| Fonte                                               | Roboto Mono                          | Roboto Mono variável auto-hospedada (subset latin, 36 KB, preload)                                    | Execução local sem CDN                                                         |

## 14. Acessibilidade

- Foco visível único em todos os controles (`:focus-visible`, contorno de 2 px na cor `ring`, 3:1 ou mais). Diálogos e drawers prendem o foco e o devolvem ao fechar.
- Hierarquia de headings sem saltos. Labels e `aria-describedby` só com ids existentes. Erros da API associados aos campos. Todo campo tem `id`/`name`.
- Uma região `aria-live` única anuncia mutations (cupom aplicado, favorito que falhou) e eventos de tempo real (preço ou estoque mudou), e toasts complementam. Estados não dependem só de cor: selos com texto ("Preço atualizado", "Esta edição esgotou") e ícones.
- Skeletons com shimmer reservam as dimensões do conteúdo e ficam estáticos com `prefers-reduced-motion`.
- Paleta mantida: o `khaki` (#B39463) tem 6,72:1 sobre o `ink`, dentro do AA, e não precisou de ajuste. O anel de foco a 50% de opacidade do shadcn ficava abaixo de 3:1 e foi trocado pelo contorno sólido.
- Sem overflow horizontal a 390, 768 e 1440 px, nem com zoom de 200% (testado no desktop). Lighthouse Accessibility 100 nas duas páginas e nos dois perfis.

## 15. Limitações conhecidas

- **Performance mobile** do Lighthouse ficou em 76 (Início) e 79 (detalhe), abaixo de 90. O backend simulado sobe no navegador antes da primeira resposta, sob CPU 4× mais lenta. A análise completa está em [`lighthouse/summary.md`](lighthouse/summary.md#abaixo-da-meta). Desktop: 99/99.
- **`FORBIDDEN` (403) não é emitido.** Recurso de outro usuário responde 404, para não revelar que existe. O código está no contrato, e o cliente trata qualquer 403 como erro genérico. "Falta de permissão" pode ser simulada com `failNext(endpoint, { status: 403, code: 'FORBIDDEN' })`.
- **Uma aba por vez.** Cada aba roda o próprio backend simulado. Abas simultâneas não recebem os eventos umas das outras, e a última a gravar sobrescreve o banco no `localStorage`.
- **Sem long-polling** no Socket.IO simulado (§5).
- **bfcache:** o service worker do MSW impede o back/forward cache do navegador. A navegação pelo histórico dentro da SPA não é afetada.
- **Quem compra a última unidade** vê o toast "esgotou" sobre a própria compra, porque o `nft.updated` da reserva de estoque também chega ao comprador.
- **Falha no carrinho fora do 409 de estoque:** remover um item ou mudar a quantidade com erro 5xx ou de rede devolve a linha ao estado anterior, sem aviso. Com outra mudança de carrinho em voo, a cotação só é refeita na última resposta.
- **Aviso de estoque no detalhe** ("Só restam N unidades") informa o estoque da edição, sem descontar as unidades que já estão no carrinho.
- **Falha ao carregar o backend simulado** (chunk dos mocks ou service worker) mostra "Erro inesperado" sem nova tentativa. Recarregar a página resolve.
- **Resposta REST contra evento:** os eventos só se aplicam com `version` maior que a do cache, mas uma resposta REST que chega depois sobrescreve o cache sem comparar versões. No backend simulado a latência vem antes da leitura do banco (`mocks/route.ts`), e a resposta já sai com a versão atual. Isso só aparece com um backend real lento.
- **Carrinho no mobile em rede lenta:** o resumo desce cerca de 185 px quando a lista carrega (o skeleton reserva 3 linhas).
- **Selo dos provedores** ("METAMASK • WALLETCONNECT • COINBASE") quebra em duas linhas em larguras estreitas, e o total aparece duas vezes no checkout mobile (no resumo e na barra fixa).
- **Baselines visuais** foram geradas no Linux. Em outro SO, regrave com `pnpm test:e2e:update` antes de comparar.
