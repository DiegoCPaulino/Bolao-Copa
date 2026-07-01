import { api } from "./client";

// Catálogo de seleções (só leitura) — reusado pela montagem de rodadas para escolher os
// times. A tela só consome; o catálogo se completa pelo seed no backend.
export type Selecao = { id: string; nome: string; bandeira: string };

/**
 * Id fixo da seleção placeholder "A definir" — ESPELHO de `domain/selecoes.ts`
 * (ID_SELECAO_A_DEFINIR): id semente estável, não string mágica solta. Como front e back
 * são pastas-irmãs (sem pacote compartilhado), o espelho é o custo conhecido; a fonte da
 * verdade é o domínio. Usado para a exceção "a-definir × a-definir" na montagem de jogos.
 */
export const ID_SELECAO_A_DEFINIR = "a-definir";

export const listarSelecoes = () => api.get<Selecao[]>("/selecoes");
