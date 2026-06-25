import { api } from "./client";

// Funções de auth tipadas (single-user: só senha, sem usuário). As funções das features
// (participantes, pagamentos, ...) entram na Fase 8 — também aqui, nunca nos componentes.

export type Me = { autenticado: boolean };

/** POST /auth/login — senha errada vem como ApiError(401) do cliente. */
export const login = (senha: string) => api.post<{ autenticado: true }>("/auth/login", { senha });

/** POST /auth/logout — encerra a sessão (limpa o cookie). */
export const logout = () => api.post<{ ok: true }>("/auth/logout");

/** GET /me — 200 = logado; 401 (sessão ausente/expirada) vira ApiError. */
export const me = () => api.get<Me>("/me");
