import { api } from "./client";

// Camada de API da Classificação GERAL (Fatia 8.7). A lista JSON alimenta o TOP 3 do
// Painel; o export text/plain (§13.5) é o "Copiar classificação geral" que faltava. A
// tela só CONSOME: a lista JÁ vem ordenada pela cascata do back — nunca reordenar aqui.

/** Linha da classificação geral (pontos ACUMULADOS do torneio), já ordenada no back. */
export type LinhaClassificacao = {
  id: string;
  nome: string;
  apelido: string | null;
  pontos: number;
  placaresExatos: number;
  resultadosCertos: number;
};

/** Classificação geral em JSON (para renderizar o TOP 3). Já ordenada pela cascata (§8.5). */
export const listarClassificacaoGeral = () => api.get<LinhaClassificacao[]>("/classificacao");

/** Export §13.5 (text/plain) PRONTO do back — o front só copia. */
export const exportarClassificacaoGeral = () => api.getTexto("/classificacao/export");
