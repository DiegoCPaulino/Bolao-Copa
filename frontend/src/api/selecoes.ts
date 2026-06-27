import { api } from "./client";

// Catálogo de seleções (só leitura) — reusado pela montagem de rodadas para escolher os
// times. A tela só consome; o catálogo se completa pelo seed no backend.
export type Selecao = { id: string; nome: string; bandeira: string };

export const listarSelecoes = () => api.get<Selecao[]>("/selecoes");
