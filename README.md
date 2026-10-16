# Kurio — Marketplace de NFTs

Solução do [desafio frontend da Jungle Gaming](https://github.com/junglegaming/frontend-challenge): marketplace de NFTs em React + TypeScript, com descoberta, carrinho, cotação, checkout com carteira simulada, pedido idempotente, tempo real via Socket.IO e conta do colecionador, em desktop e mobile. O backend é **simulado no navegador** (MSW + servidor Socket.IO simulado). Ele vai junto no build publicado, então a demo funciona sem nenhum serviço externo.

**Demo publicada:** <https://kurio-nft-pompeu.netlify.app> · **Relatório E2E:** <https://kurio-nft-pompeu.netlify.app/reports/playwright/>

| Documento                                                            | Conteúdo                                                                                                                                                |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`ARCHITECTURE.md`](ARCHITECTURE.md)                                 | Camadas, contratos REST e eventos, sessão, carrinho, cache, reconciliação REST ↔ Socket.IO, idempotência, decisões de UX, desvios do Figma e limitações |
| [`REQUIREMENTS.md`](REQUIREMENTS.md)                                 | Cada requisito do enunciado → onde está implementado → qual teste cobre                                                                                 |
| [`lighthouse/summary.md`](lighthouse/summary.md)                     | Auditoria Lighthouse (mediana de 3 execuções, versões, ambiente, justificativas)                                                                        |
| [`public/reports/playwright/`](public/reports/playwright/index.html) | Relatório HTML do Playwright da verificação final (também publicado em `/reports/playwright/` no deploy)                                                |

O enunciado original continua no histórico deste repositório e no [upstream](https://github.com/junglegaming/frontend-challenge).

## Stack

React 19, TypeScript (strict), Vite 7, TanStack Router (rotas por arquivo e estado da URL), TanStack Query (todo o estado remoto), Axios (único cliente HTTP), Socket.IO (`socket.io-client`), Tailwind CSS v4, shadcn/ui (Radix) retematizado, MSW 2 com `@mswjs/socket.io-binding`, Playwright, Lighthouse CI. Complementos: react-hook-form + zod (formulários e contratos), big.js (valores em ETH), sonner (toasts) e Vitest (testes unitários).

## Setup

Requisitos: **Node ≥ 22.12** (há `.nvmrc`) e **pnpm 10** (o `packageManager` do `package.json` fixa a versão; `corepack enable` resolve).

```bash
pnpm install
pnpm dev                              # http://localhost:5173, com o backend simulado
pnpm exec playwright install chromium # só para os testes E2E (uma vez por máquina)
```

O backend simulado sobe junto com a app: não há servidor para iniciar. Os dados ficam no `localStorage` do navegador e sobrevivem a refresh.

### Variáveis de ambiente

| Variável            | Onde                   | Padrão | Efeito                                                                                                                                                                    |
| ------------------- | ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VITE_ENABLE_MOCKS` | `.env`, `netlify.toml` | `true` | Liga o MSW, o servidor Socket.IO simulado, o painel de cenários e `window.__kurioMocks`. Com `false`, a app espera uma API real em `/api` e um Socket.IO na mesma origem. |
| `E2E_BASE_URL`      | Playwright             | —      | Roda os E2E contra uma URL já no ar (por exemplo, o deploy), sem subir o `webServer`.                                                                                     |
| `LH_PORT`           | `pnpm lighthouse`      | `4174` | Porta do `vite preview` usado pela auditoria, se a 4174 estiver ocupada.                                                                                                  |

O `.env` está versionado de propósito: um checkout limpo já sobe com os mocks.

### Comandos

| Comando                | O que faz                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------- |
| `pnpm dev`             | Desenvolvimento com mocks (Vite, porta 5173)                                                      |
| `pnpm build`           | `tsc -b` + build de produção em `dist/`                                                           |
| `pnpm preview`         | Serve o `dist/` (porta 4173), com os mocks ativos como no deploy                                  |
| `pnpm typecheck`       | Verificação de tipos (`tsc -b --noEmit`)                                                          |
| `pnpm lint`            | ESLint                                                                                            |
| `pnpm format`          | Prettier                                                                                          |
| `pnpm test:unit`       | Vitest (26 arquivos, 200 testes)                                                                  |
| `pnpm test:e2e`        | Playwright: build + preview na 4173 e os specs em Chromium desktop (1440×900) e mobile (390×844)  |
| `pnpm test:e2e:update` | Igual, regravando as baselines visuais                                                            |
| `pnpm lighthouse`      | Build + Lighthouse CI (início e detalhe, mobile e desktop, 3 execuções) + `lighthouse/summary.md` |

Relatório HTML do Playwright: `pnpm exec playwright show-report` (fica em `playwright-report/`; traces só dos testes que falharam).

## Credenciais fictícias e dados do seed

| Usuário                 | E-mail             | Senha       | Dados iniciais                                           |
| ----------------------- | ------------------ | ----------- | -------------------------------------------------------- |
| Ana Souza (`ana_kurio`) | `ana@kurio.test`   | `Kurio@123` | 2 favoritos; carteira principal `0x8f3a…b6d9` cadastrada |
| Bruno Lima              | `bruno@kurio.test` | `Kurio@123` | Sem favoritos e sem carteiras                            |

As senhas ficam no banco simulado só como hash SHA-256 com salt, nunca em claro. Os carrinhos começam vazios. A sessão dura 2 h (60 s no cenário `session-expired`).

| Cupom                         | Resultado                          |
| ----------------------------- | ---------------------------------- |
| `KURIO10`                     | 10% de desconto                    |
| `LAUNCH20`                    | Expirado (422 `COUPON_EXPIRED`)    |
| Qualquer outro, ex. `KURIO99` | Inexistente (422 `COUPON_INVALID`) |

O catálogo tem 50 NFTs em 6 coleções e 3 redes (Ethereum, Polygon, Solana), gerados de forma determinística (seed 42). Cada NFT tem até três edições (`1/10`, `1/50`, `ABERTA`) com preço e estoque próprios, e algumas já vêm esgotadas. Todo valor é cobrado em ETH; a rede escolhida no checkout muda só a taxa (0,012 / 0,002 / 0,001 ETH).

## Cenários do backend simulado

Cada cenário é um estado conhecido e reproduzível do backend simulado: mesmo seed, mesma latência, mesma falha.

| Cenário                 | Comportamento                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `default`               | Latência curta (80–200 ms); o pedido confirma ~3 s depois de criado                                                                       |
| `empty-catalog`         | A listagem volta sempre vazia                                                                                                             |
| `slow`                  | Latência fixa de 2,5 s (skeletons visíveis)                                                                                               |
| `jitter`                | Latência de 50 ms a 1,5 s por requisição (respostas fora de ordem)                                                                        |
| `offline`               | Todo REST falha com erro de rede; o socket não conecta                                                                                    |
| `server-errors`         | As 2 primeiras leituras (GET) de cada endpoint respondem 503 `TRANSIENT`; a nova tentativa recupera                                       |
| `session-expired`       | O token expira 60 s depois do login (401 `SESSION_EXPIRED`)                                                                               |
| `signup-conflict`       | O cadastro responde 409 `EMAIL_TAKEN`                                                                                                     |
| `coupon-invalid`        | O carrinho da Ana começa com o cupom `KURIO99` (422 `COUPON_INVALID`)                                                                     |
| `coupon-expired`        | O carrinho da Ana começa com o cupom `LAUNCH20` (422 `COUPON_EXPIRED`)                                                                    |
| `price-change-checkout` | 1,5 s depois de conectar a carteira, o preço do 1º item do carrinho sobe 15% (`nft.updated`; enviar a cotação velha dá 409 `QUOTE_STALE`) |
| `sold-out-checkout`     | 1,5 s depois de conectar a carteira, a edição do 1º item esgota (`nft.updated`; enviar dá 409 `AVAILABILITY_CONFLICT`)                    |
| `order-timeout`         | O 1º `POST /orders` cria o pedido e nunca responde; o reenvio com a mesma chave recupera o mesmo pedido                                   |
| `wallet-rejected`       | A conexão da carteira é recusada (409 `WALLET_REJECTED`)                                                                                  |
| `payment-confirmed`     | O pedido fica pendente até ser liquidado pelo painel (ou por `settleOrder`)                                                               |
| `payment-declined`      | O pedido termina recusado ~3 s depois de criado                                                                                           |

### Como selecionar

- **Pela URL:** acrescente `?scenario=<nome>` a qualquer endereço, por exemplo `/entrar?scenario=order-timeout`. O cenário fica salvo no navegador até ser trocado.
- **Pelo painel:** o botão **Cenários (demo)**, no canto inferior, abre a gaveta "Cenários de demonstração". Em **Dados**, escolha o cenário e clique em **Aplicar cenário**. Em **Tempo real**, **Alterar preço (+15%)**, **Esgotar edição** e **Derrubar conexão (5s)** agem sobre o NFT aberto no detalhe ou, fora dele, sobre o 1º item do carrinho. Em **Pedido**, **Confirmar pedido** e **Recusar pedido** liquidam o pedido pendente.
- **Pelo console:** `window.__kurioMocks` expõe a mesma API usada pelos testes: `reset(cenário?)`, `getScenario()`, `setLatency(ms | {min,max} | null)`, `failNext('PUT /favorites/:nftId', { status: 503, code: 'TRANSIENT', times: 1 })`, `mutateNft(id, patch)`, `settleOrder(id, 'confirmed' | 'declined')`, `expireSession()`, `dropSocket({ holdMs })`, `emitDuplicate(eventId)`, `emitStale(nftId)`, `disconnectWallet()`, `events()`.

O painel e o console agem direto no backend simulado, dentro do navegador. Eles não passam pela rede, então funcionam mesmo nos cenários `offline` e `server-errors`. Toda mudança que fazem sai pelo servidor Socket.IO simulado e chega à interface pelo `socket.io-client`, como chegaria de um backend real.

### Como resetar

**Resetar dados** no painel (ou `__kurioMocks.reset()`) recria o banco a partir do seed do cenário atual e recarrega a página. Trocar de cenário faz o mesmo. Sessões, carrinhos, favoritos e pedidos voltam ao estado inicial, então entre de novo depois de trocar ou resetar.

## Reproduzindo os fluxos de falha

Todos os roteiros partem da demo (`pnpm dev`, `pnpm preview` ou a URL publicada). "Entrar como Ana" é `ana@kurio.test` / `Kurio@123`. Para ir ao checkout: entre como Ana, abra **Neon Vessel** (`/nft/nft_neon-vessel`), clique em **Adicionar ao carrinho** e depois em **Conectar e finalizar** no carrinho (ou abra `/checkout`). Cada roteiro tem um teste E2E correspondente, citado entre parênteses.

1. **Catálogo vazio** (`01-catalog`): abra `/?scenario=empty-catalog`. O catálogo mostra "Nenhum NFT encontrado". Com filtros ativos, o estado vazio oferece **Limpar filtros**.
2. **Rede lenta e skeletons** (`12-loading-recovery`): abra `/?scenario=slow`. Catálogo, detalhe e resumo do carrinho mostram skeletons com shimmer (estáticos com `prefers-reduced-motion`) por 2,5 s, sem deslocar o layout.
3. **Respostas fora de ordem** (`01-catalog`): abra `/?scenario=jitter` e digite rápido na busca ou troque filtros em sequência. A lista mostra sempre o resultado dos parâmetros atuais da URL: respostas velhas são canceladas ou descartadas.
4. **Sem conexão** (`12-loading-recovery`): abra `/?scenario=offline`. O catálogo mostra o erro com **Tentar novamente**, e o indicador de tempo real mostra "Sem atualizações ao vivo". Aplique `default` pelo painel para voltar.
5. **Erro 5xx com recuperação** (`12-loading-recovery`): abra `/?scenario=server-errors`. A primeira carga tenta de novo sozinha (até 2 vezes, com backoff). Se ainda falhar, o erro aparece com **Tentar novamente**, e a nova tentativa recupera.
6. **Falha de mutation com rollback** (`04-favorites`, `05-cart`): entre como Ana e, no console, rode `__kurioMocks.failNext('PUT /favorites/:nftId', { status: 503, code: 'TRANSIENT' })`. Favorite um NFT: o coração muda na hora (otimista), volta ao estado anterior quando a API falha e um aviso é anunciado. O mesmo vale para a quantidade no carrinho, com `failNext('PATCH /cart/items/:itemId', …)`.
7. **Cadastro com conflito** (`03-auth`): abra `/cadastro?scenario=signup-conflict` e preencha o formulário. O campo e-mail mostra "Este e-mail já está cadastrado", vindo da API. Sem cenário, cadastrar `ana@kurio.test` dá o mesmo conflito.
8. **Sessão expirada na navegação** (`03-auth`): abra `/entrar?scenario=session-expired`, entre como Ana e espere 60 s (ou rode `__kurioMocks.expireSession()`). Na próxima ação privada (abrir `/perfil`, favoritar), a app leva a `/entrar` com "Sua sessão expirou. Entre novamente para continuar". Depois do login, volta para onde estava.
9. **Sessão expirada no checkout** (`07-payment-failures`): no checkout, preencha "Observação do colecionador", conecte a carteira, clique em **Revisar pedido** e rode `__kurioMocks.expireSession()`. Clique em **Confirmar compra**: a app pede login, e depois dele o checkout volta com o rascunho preenchido. Nenhum pedido é criado.
10. **Cupom inválido ou expirado** (`05-cart`): abra `/entrar?scenario=coupon-invalid` (ou `coupon-expired`), entre como Ana e adicione um NFT ao carrinho. O campo do cupom mostra "Cupom inválido" (ou "Este cupom expirou"), e o resumo segue sem desconto. Sem cenário, digite `KURIO99` ou `LAUNCH20`. `KURIO10` aplica 10%.
11. **Preço muda com o NFT no carrinho** (`09-realtime-cart`): com um item no carrinho, abra `/carrinho`, abra o painel e clique em **Alterar preço (+15%)**. A linha mostra o preço novo com "Preço atualizado", a mudança é anunciada (região `aria-live` e toast) e o resumo é recotado. **Esgotar edição** mostra "Esta edição esgotou" e desabilita **Conectar e finalizar** até o carrinho ser ajustado.
12. **Preço muda durante o checkout** (`09-realtime-cart`): abra `/entrar?scenario=price-change-checkout`, entre como Ana e vá ao checkout. Clique em **Revisar pedido** e depois conecte a carteira (MetaMask → **Conectar carteira**). 1,5 s depois, a revisão mostra "Valores atualizados — revise antes de confirmar", com o total novo, e **Confirmar compra** fica bloqueado até **Revisar novamente**. Se a cotação velha chegar ao servidor (corrida no clique), a API responde 409 `QUOTE_STALE` com a cotação nova, e o diálogo "Os valores mudaram" compara antes e depois.
13. **Edição esgota durante o checkout** (`09-realtime-cart`): mesmo roteiro com `sold-out-checkout`. A edição esgota, a revisão bloqueia a confirmação e o carrinho mostra o item como esgotado. Se o envio acontecer mesmo assim, o 409 `AVAILABILITY_CONFLICT` leva de volta ao carrinho.
14. **Carteira recusada e desconectada** (`07-payment-failures`): abra `/entrar?scenario=wallet-rejected`, vá ao checkout e clique em **Conectar carteira**: aparece "Conexão recusada na carteira", com nova tentativa, e **Confirmar compra** fica desabilitado. Em `default`, conecte a carteira e rode `__kurioMocks.disconnectWallet()`: aparece "Carteira desconectada" e a confirmação volta a exigir conexão.
15. **Clique repetido** (`07-payment-failures`): no checkout revisado, rode `__kurioMocks.setLatency(800)` e dê duplo clique em **Confirmar compra**. Sai um único pedido: o botão trava durante o envio e a chave de idempotência é a mesma.
16. **Timeout com recuperação do mesmo pedido** (`07-payment-failures`): abra `/entrar?scenario=order-timeout`, vá ao checkout, conecte a carteira, revise e confirme. O servidor cria o pedido, mas a resposta não vem. Depois de 10 s aparece "Não confirmamos o envio", com **Tentar novamente**. O reenvio usa a mesma `Idempotency-Key` e recebe 200 com o mesmo pedido, sem compra duplicada. Recarregar a página nesse ponto também leva ao mesmo pedido.
17. **Pagamento recusado** (`07-payment-failures`): abra `/entrar?scenario=payment-declined` e conclua uma compra. O pedido fica pendente e, ~3 s depois, vira "Pagamento recusado", com "Pagamento recusado pela carteira". **Voltar ao carrinho** mostra os itens intactos.
18. **Pedido pendente com queda de conexão** (`10-realtime-orders`): abra `/entrar?scenario=payment-confirmed`, conclua uma compra e, com o pedido em "Aguardando confirmação da rede…", use **Derrubar conexão (5s)** no painel e, em seguida, **Confirmar pedido**. Ao reconectar, a app reconcilia pela API e mostra o pedido confirmado. Recarregar a página durante a espera, ou abrir `/checkout` de novo, leva ao mesmo pedido, e não a uma compra nova.
19. **Eventos duplicados ou antigos** (`10-realtime-orders`): depois de duas mudanças de preço no mesmo NFT, rode `__kurioMocks.events()` para ver os `eventId` e use `emitDuplicate(eventId)` ou `emitStale(nftId)`. A interface não muda: o cliente descarta `eventId` repetido e versão menor ou igual à última aplicada.
20. **Troca de usuário** (`09-realtime-cart`, `03-auth`): entre como Ana, adicione itens e favoritos, saia e entre como Bruno. Carrinho, favoritos, rascunhos de checkout e eventos de pedido da Ana não aparecem para o Bruno.

## Testes

- **E2E (Playwright):** 15 specs em `tests/e2e/`, numerados pelos 12 grupos do enunciado (`01-catalog` a `12-loading-recovery`), mais `00-smoke`, `13-scenario-panel` e `visual`. Cada teste começa com o banco simulado zerado no cenário que pede; relógio (`page.clock`), latência, falhas e eventos são controlados pela API de controle. Os testes de tempo real passam pelo `socket.io-client`, e os de REST pelos handlers MSW. Tudo roda nos projetos `chromium-desktop` e `chromium-mobile`. A última execução completa teve 172 testes: 170 passaram e 2 são `skip` deliberados (zoom de 200% só no desktop; perfil mobile só no projeto mobile).
- **Regressão visual:** início, detalhe, carrinho e pagamento × desktop e mobile, com dados do seed, animações desligadas e baselines versionadas em `tests/e2e/visual.spec.ts-snapshots/` (geradas no Linux).
- **Unitários (Vitest):** 26 arquivos em `tests/unit/` (dinheiro, dedupe e versão de eventos, idempotência do checkout, handlers, sessão, cenários, socket).
- **Relatório:** HTML em `playwright-report/` e traces só das falhas (`retain-on-failure`). Uma cópia do relatório da verificação final, feita a partir de um clone limpo, está em [`public/reports/playwright/`](public/reports/playwright/index.html) e publicada em <https://kurio-nft-pompeu.netlify.app/reports/playwright/>.

## Lighthouse

`pnpm lighthouse` audita início e detalhe do NFT no build de produção, com o cenário `default` e os mocks ativos, como no deploy: 3 execuções por página e perfil, mediana de cada categoria, LCP, CLS e TBT. Configuração em `lighthouserc.mobile.cjs` e `lighthouserc.desktop.cjs`, relatórios HTML/JSON em `lighthouse/reports/` e resumo em [`lighthouse/summary.md`](lighthouse/summary.md).

| Perfil  | Página                 | Perf | A11y |  BP | SEO |
| ------- | ---------------------- | ---: | ---: | --: | --: |
| Mobile  | `/`                    |   76 |  100 | 100 | 100 |
| Mobile  | `/nft/nft_neon-vessel` |   79 |  100 | 100 | 100 |
| Desktop | `/`                    |   99 |  100 | 100 | 100 |
| Desktop | `/nft/nft_neon-vessel` |   99 |  100 | 100 | 100 |

Performance no mobile ficou abaixo da meta de 90. A causa (o backend simulado inteiro sobe no navegador antes dos dados, sob CPU 4× mais lenta) e o que levaria a 90 estão em [`lighthouse/summary.md`](lighthouse/summary.md#abaixo-da-meta).

## Deploy

Netlify, configurado em `netlify.toml`: `pnpm build`, publica `dist/`, Node 22, `VITE_ENABLE_MOCKS=true` e redirect `/* → /index.html 200` para acesso direto e refresh de qualquer rota. O build publicado é o mesmo do `pnpm preview`, com mocks, painel de cenários e tempo real.

- **URL pública:** <https://kurio-nft-pompeu.netlify.app>
- **Verificação do publicado:** `E2E_BASE_URL=https://kurio-nft-pompeu.netlify.app pnpm exec playwright test -g "smoke|full purchase|direct access"` (18 testes, desktop e mobile, incluindo o handshake do Socket.IO e a compra até o recibo confirmado) passou contra o deploy, e o refresh direto em `/nft/nft_neon-vessel` e `/perfil` abre a própria tela.

## Estrutura

```
src/
  app/         providers, QueryClient, serialização da URL, head por rota
  routes/      rotas do TanStack Router (_auth/* são as privadas)
  contracts/   schemas zod: DTOs REST, erros e eventos (compartilhados entre app e mocks)
  features/    auth, catalog, nft, favorites, cart, quote, checkout, orders, profile, wallets, realtime
  shared/      ui (shadcn retematizado), layout, lib (http, socket, money, realtime-gate, sessão)
  mocks/       banco simulado, fixtures, handlers REST, servidor Socket.IO, cenários, API de controle, painel
tests/         e2e (Playwright) e unit (Vitest)
lighthouse/    relatórios e resumo da auditoria
```

Detalhes em [`ARCHITECTURE.md`](ARCHITECTURE.md).
