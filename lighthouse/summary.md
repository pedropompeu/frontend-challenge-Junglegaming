# Auditoria Lighthouse

Rodar com `pnpm lighthouse` (ou `LH_PORT=<porta> pnpm lighthouse` se a 4174 estiver ocupada). Relatórios completos em `lighthouse/reports/<perfil>`.

<!-- lh-summary:start -->
Gerado por `scripts/lh-summary.mjs` em 2026-10-16. Valores são a mediana das execuções; ⚠ marca o que ficou abaixo da meta (Perf ≥ 90, A11y ≥ 95, BP ≥ 95, SEO ≥ 90).

- Lighthouse 12.6.1, Chrome 140.0.0.0, Node 22.23.3
- Linux 6.1.0-50-amd64 (x64), AMD Ryzen 7 5700U with Radeon Graphics × 16, benchmarkIndex 3053
- Build de produção servido por `vite preview`, com os mocks (MSW + socket simulado) ativos, como no deploy.

### Mobile

Condições: mobile, 412×823 @1.75x; throttling `simulate` (RTT 150 ms, 1,6 Mbps, CPU 4×).

| Página | Execuções | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| `/` | 3 | 76 ⚠ | 100 | 100 | 100 | 4.340 ms | 0,000 | 129 ms |
| `/nft/nft_neon-vessel` | 3 | 79 ⚠ | 100 | 100 | 100 | 3.906 ms | 0,000 | 157 ms |

### Desktop

Condições: desktop, 1350×940 @1x; throttling `simulate` (RTT 40 ms, 10,0 Mbps, CPU 1×).

| Página | Execuções | Perf | A11y | BP | SEO | LCP | CLS | TBT |
| --- | --: | --: | --: | --: | --: | --: | --: | --: |
| `/` | 3 | 99 | 100 | 100 | 100 | 846 ms | 0,001 | 0 ms |
| `/nft/nft_neon-vessel` | 3 | 99 | 100 | 100 | 100 | 817 ms | 0,001 | 0 ms |

<!-- lh-summary:end -->

## Abaixo da meta

Accessibility, Best Practices e SEO ficam em 100 nas duas páginas e nos dois perfis; Performance desktop, em 99. O único item abaixo da meta é **Performance mobile** (`/` 76 e `/nft/nft_neon-vessel` 79 na rodada versionada; meta 90).

### Causa

O LCP mobile (4,3 s e 3,9 s simulados) é uma imagem que vem da API, e a API desta entrega roda no próprio navegador.

1. **Backend simulado no cliente.** Antes da primeira resposta, o navegador baixa e avalia o chunk dos mocks (MSW + servidor Socket.IO simulado, 104 KB gzip), registra o service worker e semeia o banco no `localStorage`. O Lighthouse limpa o storage a cada execução, então toda medição é uma primeira visita. Com um backend real essa etapa não existiria; no deploy de demonstração ela existe, e foi medida assim, sem atalho para a auditoria.
2. **SPA sem SSR.** O primeiro pixel (FCP 3,4 s simulado) espera o chunk principal (228 KB gzip: react-dom, zod, axios, sonner, TanStack Router e Query, o stack aprovado). Ele divide o 4G lento simulado (1,6 Mbps) com o chunk dos mocks e é avaliado com a CPU 4× mais lenta: cerca de 535 ms observados viram cerca de 2,1 s simulados.
3. As respostas simuladas levam 80–200 ms, a latência do cenário `default` previsto no spec.

### O que foi feito

| Mudança | Efeito |
| --- | --- |
| O shell renderiza sem esperar o backend simulado; requisições e socket aguardam `backendReady()` (`src/shared/lib/backend-ready.ts`) | FCP mobile 4,2 → 3,4 s; header, hero e skeletons aparecem enquanto os mocks sobem |
| `modulepreload` do chunk dos mocks e das dependências dele no HTML (plugin `kurio:preload-mocks` no `vite.config.ts`) | O chunk começa a baixar com o shell (antes: só depois de o `main.tsx` executar, ~160 ms observados mais tarde) |
| Sem o *top-level await* no `main.tsx`, o Rollup uniu ao chunk de entrada cerca de 50 chunks compartilhados que eram pedidos à parte | Primeiro carregamento com 5 scripts em vez de cerca de 55; pesa no HTTP/1.1 do `vite preview`, menos no HTTP/2 da Netlify |
| Título e descrição por rota (`head` do TanStack Router + `HeadContent`) | Cada tela com o próprio `<title>` e uma única `meta description` |
| Já existentes: imagem LCP com `fetchpriority="high"`, `srcset` e `width`/`height`; demais com `loading="lazy"`; preload da fonte; `robots.txt`; `khaki` com contraste AA (6,7:1 sobre `ink`) | Accessibility, Best Practices e SEO em 100 |

Resultado mobile: Início 70 → 76 (LCP 5,2 → 4,3 s), Detalhe 68 → 79 (LCP 5,4 → 3,9 s). Desktop: 97/96 → 99/99.

### O que levaria a 90

Cada caminho muda arquitetura ou dependências e fica fora do escopo desta tarefa:

- pré-renderizar no build (SSG) o shell e o catálogo inicial;
- um backend real, sem o boot do MSW no navegador;
- enxugar o chunk principal trocando `zod` por `zod/mini` ou `axios` por `fetch`.
