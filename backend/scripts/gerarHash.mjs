// Gera o hash argon2id da senha do organizador para colar no .env.
//
//   npm run gerar-hash
//
// Pede a senha num prompt OCULTO (não ecoa, não fica no histórico) e imprime só o
// HASH — a senha em texto nunca é logada nem gravada. Cole a saída em
// ORGANIZADOR_SENHA_HASH no backend/.env (a senha real não vai para lugar nenhum).

import { password } from "@inquirer/prompts";
import argon2 from "argon2";

const senha = await password({ message: "Senha do organizador:", mask: "*" });

if (!senha || senha.trim() === "") {
  console.error("Senha vazia — nada a fazer.");
  process.exit(1);
}

// argon2id: resistente a ataques de GPU e de canal lateral (recomendação OWASP).
const hash = await argon2.hash(senha, { type: argon2.argon2id });

console.log("\nHash argon2id (cole em ORGANIZADOR_SENHA_HASH no .env):\n");
console.log(hash);
