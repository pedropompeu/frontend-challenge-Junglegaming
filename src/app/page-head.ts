export const SITE_TITLE = 'Kurio — Marketplace de NFTs'
export const SITE_DESCRIPTION =
  'Kurio: descubra, colecione e compre NFTs de criadores emergentes e consagrados, com pagamento em ETH.'

/**
 * Título e descrição de uma tela, para o `head` da rota (o `HeadContent` da raiz os aplica).
 * Sem título, vale o do site, que é o da página inicial.
 */
export function pageHead(title: string | null, description: string) {
  return {
    meta: [
      { title: title ? `${title} — Kurio` : SITE_TITLE },
      { name: 'description', content: description },
    ],
  }
}
