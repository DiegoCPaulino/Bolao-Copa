import { ChevronDown, ChevronLeft, ChevronRight, Copy, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import * as palpitesApi from "@/api/palpites";
import type { Pendente } from "@/api/palpites";
import { listarParticipantes } from "@/api/participantes";
import type { Participante } from "@/api/participantes";
import { definirEstado, detalharRodada } from "@/api/rodadas";
import type { Jogo, RodadaDetalhada } from "@/api/rodadas";
import * as resultadosApi from "@/api/resultados";
import type { LinhaPontuacao, ResumoJogo } from "@/api/resultados";
import { Combobox } from "@/components/Combobox";
import { Confronto } from "@/components/Confronto";
import { CopiarWhatsApp } from "@/components/CopiarWhatsApp";
import { ESTADOS_ORDEM, EstadoBadge, FASE_LABEL } from "@/components/rodada/labels";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

type Aba = "palpites" | "resultados" | "pontuacao";
type Placar = { golsEsquerda: number; golsDireita: number };
type Rascunho = { gE: string; gD: string };

/** Rótulo: nome + apelido entre aspas, se houver. Aceita Participante e Pendente (só usa nome/apelido). */
function rotuloParticipante(p: { nome: string; apelido: string | null }): string {
  return p.apelido ? `${p.nome} "${p.apelido}"` : p.nome;
}

/** Um rascunho é válido se os dois placares são inteiros >= 0 (o back revalida). */
function rascunhoValido(c: Rascunho | undefined): boolean {
  if (!c || c.gE === "" || c.gD === "") return false;
  const e = Number(c.gE);
  const d = Number(c.gD);
  return Number.isInteger(e) && e >= 0 && Number.isInteger(d) && d >= 0;
}

/** Jogo decidido = tem os dois gols reais (empate é resultado válido, §3.6). */
function temPlacar(j: Jogo): boolean {
  return j.golsEsquerdaReal !== null && j.golsDireitaReal !== null;
}

/**
 * Rodada-detalhe — a página de operação de uma rodada: controle do ciclo de vida (guia,
 * §3.7) + 3 abas (Palpites 8.4-B / Resultados / Pontuação 8.4-C). Só consome a API
 * (CLAUDE.md §3.1): nunca recalcula ponto, nunca ordena, nunca soma, nunca formata
 * WhatsApp — os derivados vêm prontos do back (recálculo sob demanda).
 */
export function RodadaDetalhe() {
  const { id = "" } = useParams<{ id: string }>();

  const [rodada, setRodada] = useState<RodadaDetalhada | null>(null);
  const [participantes, setParticipantes] = useState<Participante[]>([]);
  const [pendentes, setPendentes] = useState<Pendente[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);
  const [aba, setAba] = useState<Aba>("palpites");

  // Controle de estado da rodada (movido do drawer da 8.3): direção em voo → Loader visível.
  const [direcaoEstado, setDirecaoEstado] = useState<"ret" | "av" | null>(null);

  // Aba Palpites: participante escolhido + o que está salvo (verdade do back) e o rascunho.
  const [participanteId, setParticipanteId] = useState<string | null>(null);
  const [salvos, setSalvos] = useState<Record<string, Placar>>({});
  const [rascunho, setRascunho] = useState<Record<string, Rascunho>>({});
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  // Aba Resultados: rascunho dos placares reais (semeado do que já está lançado).
  const [rascunhoRes, setRascunhoRes] = useState<Record<string, Rascunho>>({});
  const [salvandoResId, setSalvandoResId] = useState<string | null>(null);

  // Aba Pontuação: classificação da rodada (lazy) + resumos por jogo (lazy, cacheados).
  const [pontuacao, setPontuacao] = useState<LinhaPontuacao[] | null>(null);
  const [carregandoPontuacao, setCarregandoPontuacao] = useState(false);
  const [erroPontuacao, setErroPontuacao] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());
  const [resumosCache, setResumosCache] = useState<Record<string, ResumoJogo>>({});
  const [carregandoResumo, setCarregandoResumo] = useState<Record<string, boolean>>({});

  // Dialog de exportação (text/plain pronto do back) — reusado por todos os "Copiar".
  const [exportTexto, setExportTexto] = useState<string | null>(null);

  // Carga inicial: rodada + participantes + quem-falta (insumos das abas Palpites/Resultados).
  useEffect(() => {
    let vivo = true;
    setCarregando(true);
    setErroCarga(null);
    (async () => {
      try {
        const [r, ps] = await Promise.all([detalharRodada(id), listarParticipantes()]);
        if (!vivo) return;
        setRodada(r);
        setParticipantes(ps);
        setPendentes(await palpitesApi.pendentes(id));
      } catch (e) {
        if (vivo) setErroCarga(e instanceof ApiError ? e.message : "Falha ao carregar a rodada.");
      } finally {
        if (vivo) setCarregando(false);
      }
    })();
    return () => {
      vivo = false;
    };
  }, [id]);

  // Semeia o rascunho de resultados a partir do placar real, SEM clobber: só preenche
  // jogos ainda sem rascunho (preserva edições em andamento e o valor recém-salvo).
  useEffect(() => {
    if (!rodada) return;
    setRascunhoRes((prev) => {
      const next = { ...prev };
      for (const j of rodada.jogos) {
        if (next[j.id]) continue;
        next[j.id] = temPlacar(j)
          ? { gE: String(j.golsEsquerdaReal), gD: String(j.golsDireitaReal) }
          : { gE: "", gD: "" };
      }
      return next;
    });
  }, [rodada]);

  // Pontuação: carrega ao abrir a aba (e quando foi invalidada após salvar um resultado).
  useEffect(() => {
    if (aba !== "pontuacao" || pontuacao !== null) return;
    let vivo = true;
    setCarregandoPontuacao(true);
    setErroPontuacao(null);
    resultadosApi
      .pontosDaRodada(id)
      .then((p) => vivo && setPontuacao(p))
      .catch((e) => {
        if (vivo) setErroPontuacao(e instanceof ApiError ? e.message : "Falha ao carregar a pontuação.");
      })
      .finally(() => {
        if (vivo) setCarregandoPontuacao(false);
      });
    return () => {
      vivo = false;
    };
  }, [aba, pontuacao, id]);

  const itensParticipante = useMemo(
    () => participantes.map((p) => ({ id: p.id, rotulo: rotuloParticipante(p) })),
    [participantes],
  );

  const idxEstado = rodada ? ESTADOS_ORDEM.indexOf(rodada.estado) : -1;

  // Ciclo de vida = GUIA, não trava (§3.7): só muda o badge; resposta vem SEM jogos → MERGE.
  async function mudarEstado(direcao: "ret" | "av") {
    if (direcaoEstado || idxEstado < 0) return;
    const alvo = ESTADOS_ORDEM[idxEstado + (direcao === "av" ? 1 : -1)];
    if (!alvo) return;
    setDirecaoEstado(direcao);
    try {
      const r = await definirEstado(id, alvo);
      setRodada((prev) => (prev ? { ...prev, estado: r.estado } : prev));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível mudar o estado.");
    } finally {
      setDirecaoEstado(null);
    }
  }

  async function escolherParticipante(pid: string) {
    setParticipanteId(pid);
    setSalvos({});
    setRascunho({});
    try {
      const ps = await palpitesApi.palpitesDoParticipante(id, pid);
      const sal: Record<string, Placar> = {};
      const rasc: Record<string, Rascunho> = {};
      for (const p of ps) {
        sal[p.jogoId] = { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita };
        rasc[p.jogoId] = { gE: String(p.golsEsquerda), gD: String(p.golsDireita) };
      }
      setSalvos(sal);
      setRascunho(rasc);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao carregar os palpites.");
    }
  }

  // Atualização de um lado de um rascunho (genérica: serve palpites e resultados).
  function setLado(
    setter: React.Dispatch<React.SetStateAction<Record<string, Rascunho>>>,
    jogoId: string,
    lado: "gE" | "gD",
    valor: string,
  ) {
    setter((prev) => {
      const atual = prev[jogoId] ?? { gE: "", gD: "" };
      return { ...prev, [jogoId]: { ...atual, [lado]: valor } };
    });
  }

  async function salvar(jogo: Jogo) {
    if (salvandoId) return; // um save por vez (guarda transitória, não trava por estado)
    const c = rascunho[jogo.id];
    if (!rascunhoValido(c)) {
      toast.error("Informe os dois placares (inteiros ≥ 0).");
      return;
    }
    setSalvandoId(jogo.id);
    try {
      const p = await palpitesApi.registrarPalpite(id, participanteId ?? "", jogo.id, Number(c.gE), Number(c.gD));
      setSalvos((prev) => ({
        ...prev,
        [jogo.id]: { golsEsquerda: p.golsEsquerda, golsDireita: p.golsDireita },
      }));
      toast.success(`Palpite do J${jogo.ordem} salvo.`);
      setPendentes(await palpitesApi.pendentes(id)); // binário: quem zerou pode ter saído
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar o palpite.");
    } finally {
      setSalvandoId(null);
    }
  }

  // Lançar/corrigir resultado (mesmo PUT, §8.6 livre). A resposta é IGNORADA: a pontuação
  // não volta daqui — re-busco a rodada (o jogo vira "tem placar") e a pontuação (se aberta).
  // A tela NUNCA soma ponto: só relê os derivados que o back recalculou sob demanda.
  async function salvarResultado(jogo: Jogo) {
    if (salvandoResId) return;
    const c = rascunhoRes[jogo.id];
    if (!rascunhoValido(c)) {
      toast.error("Informe os dois placares (inteiros ≥ 0).");
      return;
    }
    setSalvandoResId(jogo.id);
    try {
      await resultadosApi.registrarResultado(jogo.id, Number(c.gE), Number(c.gD));
      toast.success(`Resultado do J${jogo.ordem} salvo.`);
      setRodada(await detalharRodada(id));
      // o resumo do jogo mudou → invalida o cache e recolhe; pontuação relê se estiver aberta.
      setResumosCache((prev) => {
        const n = { ...prev };
        delete n[jogo.id];
        return n;
      });
      setExpandidos((prev) => {
        const n = new Set(prev);
        n.delete(jogo.id);
        return n;
      });
      if (pontuacao !== null) setPontuacao(await resultadosApi.pontosDaRodada(id));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar o resultado.");
    } finally {
      setSalvandoResId(null);
    }
  }

  // Expande/recolhe o resumo de um jogo. Ao ABRIR sem cache: busca (loader visível) e
  // cacheia (reabrir o mesmo jogo não re-busca). Só é chamado para jogo DECIDIDO.
  async function alternarResumo(jogoId: string) {
    const abrindo = !expandidos.has(jogoId);
    setExpandidos((prev) => {
      const n = new Set(prev);
      if (n.has(jogoId)) n.delete(jogoId);
      else n.add(jogoId);
      return n;
    });
    if (!abrindo || resumosCache[jogoId] || carregandoResumo[jogoId]) return;
    setCarregandoResumo((p) => ({ ...p, [jogoId]: true }));
    try {
      const r = await resultadosApi.resumoJogo(jogoId);
      setResumosCache((p) => ({ ...p, [jogoId]: r }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao carregar o resumo.");
      setExpandidos((prev) => {
        const n = new Set(prev);
        n.delete(jogoId);
        return n;
      });
    } finally {
      setCarregandoResumo((p) => ({ ...p, [jogoId]: false }));
    }
  }

  async function copiar(fn: () => Promise<string>) {
    try {
      setExportTexto(await fn());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao exportar.");
    }
  }

  if (carregando) return <p className="text-muted-foreground">Carregando…</p>;
  if (erroCarga || !rodada) {
    return (
      <div className="flex flex-col gap-3">
        <Link to="/rodadas" className="text-sm text-muted-foreground underline">
          ← Rodadas
        </Link>
        <p className="text-destructive">{erroCarga ?? "Rodada não encontrada."}</p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Link to="/rodadas" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" /> Rodadas
      </Link>

      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold uppercase tracking-wide">{FASE_LABEL[rodada.fase]}</h1>
        {/* Ciclo de vida: estado EXIBIDO + avançar/retroceder (limites só nas pontas). NÃO
            trava lançar/editar resultado — é guia, não trava (§3.7). Loader visível em voo. */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={idxEstado <= 0 || direcaoEstado !== null}
            onClick={() => void mudarEstado("ret")}
          >
            {direcaoEstado === "ret" ? <Loader2 className="animate-spin" aria-hidden /> : <ChevronLeft className="size-4" />}
            Retroceder
          </Button>
          <EstadoBadge estado={rodada.estado} />
          <Button
            variant="outline"
            size="sm"
            disabled={idxEstado >= ESTADOS_ORDEM.length - 1 || direcaoEstado !== null}
            onClick={() => void mudarEstado("av")}
          >
            Avançar
            {direcaoEstado === "av" ? <Loader2 className="animate-spin" aria-hidden /> : <ChevronRight className="size-4" />}
          </Button>
        </div>
      </div>

      {/* Abas (dep-free). aria-selected marca a ativa; cada conteúdo é um tabpanel. */}
      <div role="tablist" aria-label="Seções da rodada" className="flex gap-1 border-b">
        {(["palpites", "resultados", "pontuacao"] as const).map((a) => (
          <button
            key={a}
            type="button"
            role="tab"
            aria-selected={aba === a}
            onClick={() => setAba(a)}
            className={
              aba === a
                ? "border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            }
          >
            {a === "palpites" ? "Palpites" : a === "resultados" ? "Resultados" : "Pontuação"}
          </button>
        ))}
      </div>

      {aba === "palpites" && (
        <div role="tabpanel" className="flex flex-col gap-4">
          {/* Exportações (text/plain pronto do back) */}
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => void copiar(() => palpitesApi.exportarTabela(id))}>
              Copiar tabela de palpites
            </Button>
            <Button variant="gold" onClick={() => void copiar(() => palpitesApi.exportarPendencias(id))}>
              Copiar pendências
            </Button>
          </div>

          {/* Quem ainda não palpitou — REGRA BINÁRIA (vem pronta do back: só zero palpites) */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Quem ainda não palpitou ({pendentes.length})
            </h2>
            {pendentes.length === 0 ? (
              <p className="mt-1 text-sm text-success">✅ Todos já palpitaram nesta rodada.</p>
            ) : (
              <p className="mt-1 text-sm">{pendentes.map(rotuloParticipante).join(", ")}</p>
            )}
          </div>

          {/* Copiar POR JOGO (§13.2/§13.8) — artefato da RODADA, sempre visível (independe do
              participante). Os botões gerais da rodada seguem no topo; estes são adição. */}
          {rodada.jogos.length > 0 && (
            <div className="flex flex-col gap-2 rounded-xl border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
                Copiar por jogo
              </h2>
              {rodada.jogos.map((j) => (
                <div key={j.id} className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm">
                    <span className="text-muted-foreground">⚽ J{j.ordem}</span>{" "}
                    <Confronto esquerda={j.selecaoEsquerda} direita={j.selecaoDireita} />
                  </span>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void copiar(() => palpitesApi.exportarTabelaJogo(j.id))}
                    >
                      <Copy className="size-3.5" aria-hidden /> Tabela
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void copiar(() => palpitesApi.exportarPendenciasJogo(j.id))}
                    >
                      <Copy className="size-3.5" aria-hidden /> Pendências
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Registrar palpite jogo a jogo, por participante */}
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Palpites de:</span>
            <Combobox
              itens={itensParticipante}
              value={participanteId}
              onChange={(pid) => void escolherParticipante(pid)}
              placeholder="Escolher participante…"
            />
          </div>

          {participanteId === null ? (
            <p className="text-sm text-muted-foreground">
              Escolha um participante para registrar/editar os palpites jogo a jogo.
            </p>
          ) : rodada.jogos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta rodada ainda não tem jogos.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {rodada.jogos.map((j) => {
                const c = rascunho[j.id] ?? { gE: "", gD: "" };
                const salvo = salvos[j.id];
                const semMudanca =
                  salvo !== undefined &&
                  c.gE === String(salvo.golsEsquerda) &&
                  c.gD === String(salvo.golsDireita);
                const emVoo = salvandoId === j.id;
                return (
                  <div key={j.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
                    <span className="text-sm">
                      <span className="text-muted-foreground">⚽ J{j.ordem}</span>{" "}
                      <Confronto esquerda={j.selecaoEsquerda} direita={j.selecaoDireita} />
                    </span>
                    <div className="flex flex-wrap items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Gols ${j.selecaoEsquerda.nome}`}
                        className="w-16"
                        value={c.gE}
                        onChange={(e) => setLado(setRascunho, j.id, "gE", e.target.value)}
                      />
                      <span className="text-muted-foreground">×</span>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        aria-label={`Gols ${j.selecaoDireita.nome}`}
                        className="w-16"
                        value={c.gD}
                        onChange={(e) => setLado(setRascunho, j.id, "gD", e.target.value)}
                      />
                      <Button
                        size="sm"
                        onClick={() => void salvar(j)}
                        disabled={!rascunhoValido(c) || semMudanca}
                      >
                        {emVoo ? (
                          <>
                            <Loader2 className="animate-spin" aria-hidden /> Salvando…
                          </>
                        ) : (
                          "Salvar"
                        )}
                      </Button>
                      {semMudanca && !emVoo && (
                        <span className="text-xs font-medium text-success">✓ salvo</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {aba === "resultados" && (
        <div role="tabpanel" className="flex flex-col gap-3">
          {rodada.jogos.length === 0 ? (
            <p className="text-sm text-muted-foreground">Esta rodada ainda não tem jogos.</p>
          ) : (
            rodada.jogos.map((j) => {
              const c = rascunhoRes[j.id] ?? { gE: "", gD: "" };
              const lancado = temPlacar(j);
              const igualAoReal =
                lancado && c.gE === String(j.golsEsquerdaReal) && c.gD === String(j.golsDireitaReal);
              const emVoo = salvandoResId === j.id;
              return (
                <div key={j.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
                  <span className="text-sm">
                    <span className="text-muted-foreground">⚽ J{j.ordem}</span>{" "}
                    <Confronto esquerda={j.selecaoEsquerda} direita={j.selecaoDireita} />
                    {lancado && (
                      <span className="ml-1 font-medium">
                        — {j.golsEsquerdaReal}×{j.golsDireitaReal}
                      </span>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`Gols ${j.selecaoEsquerda.nome}`}
                      className="w-16"
                      value={c.gE}
                      onChange={(e) => setLado(setRascunhoRes, j.id, "gE", e.target.value)}
                    />
                    <span className="text-muted-foreground">×</span>
                    <Input
                      type="number"
                      min={0}
                      inputMode="numeric"
                      aria-label={`Gols ${j.selecaoDireita.nome}`}
                      className="w-16"
                      value={c.gD}
                      onChange={(e) => setLado(setRascunhoRes, j.id, "gD", e.target.value)}
                    />
                    <Button
                      size="sm"
                      onClick={() => void salvarResultado(j)}
                      disabled={!rascunhoValido(c) || igualAoReal}
                    >
                      {emVoo ? (
                        <>
                          <Loader2 className="animate-spin" aria-hidden /> Salvando…
                        </>
                      ) : lancado ? (
                        "Corrigir"
                      ) : (
                        "Lançar"
                      )}
                    </Button>
                    {igualAoReal && !emVoo && (
                      <span className="text-xs font-medium text-success">✓ lançado</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {aba === "pontuacao" && (
        <div role="tabpanel" className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button variant="gold" onClick={() => void copiar(() => resultadosApi.exportarResumoRodada(id))}>
              Copiar resumo da rodada
            </Button>
          </div>

          {/* Classificação DA RODADA — já ordenada pelo back; a tela só EXIBE (não ordena/soma). */}
          <div className="rounded-xl border bg-card p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Classificação da rodada
            </h2>
            {carregandoPontuacao ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando…
              </p>
            ) : erroPontuacao ? (
              <p className="text-sm text-destructive">{erroPontuacao}</p>
            ) : !pontuacao || pontuacao.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem participantes para classificar.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="py-1 pr-2 font-medium">#</th>
                    <th className="py-1 pr-2 font-medium">Participante</th>
                    <th className="py-1 px-2 text-right font-medium">Pts</th>
                    <th className="py-1 px-2 text-right font-medium">Exatos</th>
                    {/* Split do "resultado certo" (1 pt): empates e vitórias acertados. */}
                    <th className="py-1 px-2 text-right font-medium" title="Empates acertados (placar errado)">
                      Emp.
                    </th>
                    <th className="py-1 pl-2 text-right font-medium" title="Vitórias acertadas (placar errado)">
                      Vit.
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pontuacao.map((l, i) => (
                    <tr key={l.id} className="border-t">
                      <td className="py-1 pr-2 text-muted-foreground">{i + 1}</td>
                      <td className="py-1 pr-2">{rotuloParticipante(l)}</td>
                      <td className="py-1 px-2 text-right font-medium">{l.pontos}</td>
                      <td className="py-1 px-2 text-right">{l.placaresExatos}</td>
                      <td className="py-1 px-2 text-right">{l.empatesAcertados}</td>
                      <td className="py-1 pl-2 text-right">{l.vitoriasAcertadas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Resumo por jogo: decidido → placar + copiar (13.3) + "Ver palpites" (lazy/cache);
              não-decidido → aguardando resultado (NÃO chama o resumo: o back daria 400). */}
          <div className="flex flex-col gap-2">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              Resumo por jogo
            </h2>
            {rodada.jogos.length === 0 ? (
              <p className="text-sm text-muted-foreground">Esta rodada ainda não tem jogos.</p>
            ) : (
              rodada.jogos.map((j) => {
                const cabecalho = (
                  <span className="text-sm">
                    <span className="text-muted-foreground">⚽ J{j.ordem}</span>{" "}
                    <Confronto esquerda={j.selecaoEsquerda} direita={j.selecaoDireita} />
                  </span>
                );
                if (!temPlacar(j)) {
                  return (
                    <div key={j.id} className="flex flex-col gap-1 rounded-xl border bg-card p-3 shadow-sm">
                      {cabecalho}
                      <span className="text-xs text-muted-foreground">⏳ aguardando resultado</span>
                    </div>
                  );
                }
                const aberto = expandidos.has(j.id);
                const resumo = resumosCache[j.id];
                const carregandoR = carregandoResumo[j.id] === true;
                return (
                  <div key={j.id} className="flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm">
                        {cabecalho}
                        <span className="ml-1 font-medium">
                          — {j.golsEsquerdaReal}×{j.golsDireitaReal}
                        </span>
                      </span>
                      <div className="flex gap-2">
                        <Button variant="gold" size="sm" onClick={() => void copiar(() => resultadosApi.exportarResumoJogo(j.id))}>
                          Copiar resumo do jogo
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          aria-expanded={aberto}
                          onClick={() => void alternarResumo(j.id)}
                        >
                          {carregandoR ? (
                            <Loader2 className="size-4 animate-spin" aria-hidden />
                          ) : (
                            <ChevronDown className={aberto ? "size-4 rotate-180 transition" : "size-4 transition"} aria-hidden />
                          )}
                          {aberto ? "Ocultar" : "Ver palpites"}
                        </Button>
                      </div>
                    </div>
                    {aberto && (
                      <div className="rounded-lg border bg-muted/30 p-2">
                        {carregandoR ? (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-4 animate-spin" aria-hidden /> Carregando palpites…
                          </p>
                        ) : !resumo ? (
                          <p className="text-sm text-muted-foreground">Sem dados.</p>
                        ) : resumo.palpites.length === 0 ? (
                          <p className="text-sm text-muted-foreground">Ninguém palpitou neste jogo.</p>
                        ) : (
                          <ul className="flex flex-col gap-1 text-sm">
                            {resumo.palpites.map((p) => (
                              <li key={`${p.nome}-${p.apelido ?? ""}`} className="flex justify-between gap-2">
                                <span>{rotuloParticipante(p)}</span>
                                <span className="text-muted-foreground">
                                  {p.palpite.golsEsquerda}×{p.palpite.golsDireita} →{" "}
                                  <span className="font-medium text-foreground">{p.pontos} pt(s)</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Export (text/plain pronto do back) + Copiar — reusado por todas as abas */}
      <Dialog open={exportTexto !== null} onOpenChange={(v) => !v && setExportTexto(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar para o WhatsApp</DialogTitle>
            <DialogDescription>Texto pronto — copie e cole no grupo.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">
            {exportTexto}
          </pre>
          {exportTexto !== null && <CopiarWhatsApp texto={exportTexto} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}
