import { cn } from "@/lib/utils";

/**
 * Rótulo de uma seleção: bandeira como ADORNO discreto (muted) à esquerda + nome na cor
 * normal, que DOMINA. Motivo: no desktop (Windows) o emoji de bandeira não renderiza e
 * vira a sigla do país ("ZA"/"CA"); deixando a sigla em muted e o nome em destaque, o
 * organizador acha o jogo pelo NOME e a sigla não atrapalha. Só apresentação — não força
 * fonte de emoji nem toca no dado (a bandeira segue correta no celular/export).
 *
 * Aceita `{ nome, bandeira }` estrutural (casa com `Selecao` e com o resumo do jogo).
 */
export function SelecaoLabel({
  selecao,
  className,
}: {
  selecao: { nome: string; bandeira: string };
  className?: string;
}) {
  return (
    <span className={className}>
      <span className="text-muted-foreground">{selecao.bandeira}</span> {selecao.nome}
    </span>
  );
}

/**
 * Confronto entre duas seleções — FLAG-FIRST nos dois lados (🇿🇦 Nome × 🇨🇦 Nome), leitura
 * uniforme (sem espelhar a bandeira para a direita). Centraliza o formato das 4 telas +
 * do seletor (DRY): cada tela mantém o que é seu (J{n}, ⚽, placar).
 */
export function Confronto({
  esquerda,
  direita,
  className,
}: {
  esquerda: { nome: string; bandeira: string };
  direita: { nome: string; bandeira: string };
  className?: string;
}) {
  return (
    <span className={cn(className)}>
      <SelecaoLabel selecao={esquerda} /> <span className="text-muted-foreground">×</span>{" "}
      <SelecaoLabel selecao={direita} />
    </span>
  );
}
