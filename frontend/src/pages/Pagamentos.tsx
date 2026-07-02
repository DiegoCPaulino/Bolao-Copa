import { Loader2, Pencil, VenetianMask } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/api/client";
import * as pagamentosApi from "@/api/pagamentos";
import type { PagamentoParticipante, TotaisPagamento } from "@/api/pagamentos";
import { CopiarWhatsApp } from "@/components/CopiarWhatsApp";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { reais, rotuloParticipante } from "@/lib/formato";

// Sentinela: Radix Select não aceita value vazio, então "Todos" usa um token.
const TODOS = "__todos__";

const TOTAIS_VAZIO: TotaisPagamento = { esperado: 0, recebido: 0, falta: 0 };

/**
 * Tela de Pagamentos (Fatia 8.2) — molde da 8.1 + identidade central. É leitura RICA +
 * uma única mutação (toggle Pago/Pendente). Tudo que aparece (valor, totais) vem
 * DERIVADO da API: a tela só consome (CLAUDE.md §3.1/§3.2). Mostra a VERDADE — quem
 * está "exibir como pago" e não pagou aparece como Pendente + marcador 🎭; só a
 * exportação maquia.
 */
export function Pagamentos() {
  const [lista, setLista] = useState<PagamentoParticipante[]>([]);
  const [totais, setTotais] = useState<TotaisPagamento>(TOTAIS_VAZIO);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>(TODOS);
  const [ordenarPor, setOrdenarPor] = useState<"nome" | "valor" | "status">("nome");

  const [alterandoId, setAlterandoId] = useState<string | null>(null);
  const [textoExport, setTextoExport] = useState<string | null>(null);

  async function recarregar({ silencioso = false } = {}) {
    if (!silencioso) setCarregando(true);
    setErroCarga(null);
    try {
      const { participantes, totais } = await pagamentosApi.listarPagamentos();
      setLista(participantes);
      setTotais(totais);
    } catch (e) {
      setErroCarga(e instanceof ApiError ? e.message : "Falha ao carregar pagamentos.");
    } finally {
      if (!silencioso) setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  // Busca/filtro/ordenação CLIENT-SIDE (na escala do bolão é instantâneo). Filtrar por
  // status é o caso principal; ordenar por valor ajuda a ver quem deve mais.
  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = lista.filter((p) => {
      const casaBusca =
        termo === "" ||
        p.nome.toLowerCase().includes(termo) ||
        (p.apelido?.toLowerCase().includes(termo) ?? false);
      const casaStatus = filtroStatus === TODOS || p.status === filtroStatus;
      return casaBusca && casaStatus;
    });
    return [...filtrados].sort((a, b) => {
      if (ordenarPor === "valor") {
        return b.valorAPagar - a.valorAPagar || a.nome.localeCompare(b.nome, "pt-BR");
      }
      if (ordenarPor === "status") {
        return a.status.localeCompare(b.status) || a.nome.localeCompare(b.nome, "pt-BR");
      }
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [lista, busca, filtroStatus, ordenarPor]);

  async function exportar() {
    try {
      setTextoExport(await pagamentosApi.exportarPagamentos());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao exportar.");
    }
  }

  // Toggle OTIMISTA com rollback: captura a lista anterior → flip imediato do status (a UI
  // responde na hora) → PUT → refetch SILENCIOSO (totais autoritativos da API; a tela nunca
  // soma) → em erro, restaura a lista anterior. Um toggle por vez evita corrida com o refetch.
  async function alternar(p: PagamentoParticipante) {
    if (alterandoId !== null) return;
    const anterior = lista;
    setAlterandoId(p.id);
    setLista((atual) =>
      atual.map((x) =>
        x.id === p.id ? { ...x, status: x.status === "PAGO" ? "PENDENTE" : "PAGO" } : x,
      ),
    );
    try {
      await pagamentosApi.alternarStatus(p.id);
      await recarregar({ silencioso: true });
    } catch (e) {
      setLista(anterior);
      toast.error(e instanceof ApiError ? e.message : "Não foi possível alternar o status.");
    } finally {
      setAlterandoId(null);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Pagamentos</h1>
        <Button variant="gold" onClick={() => void exportar()}>
          Exportar
        </Button>
      </div>

      {/* Totais — VINDOS DA API (a tela nunca soma). */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard titulo="Esperado" valor={reais(totais.esperado)} />
        <StatCard titulo="Recebido" valor={reais(totais.recebido)} tom="success" />
        <StatCard titulo="Falta receber" valor={reais(totais.falta)} tom="warning" />
      </div>

      {/* Busca / filtro / ordenação */}
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar por nome ou apelido…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filtroStatus} onValueChange={setFiltroStatus}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            <SelectItem value="PAGO">Pagos</SelectItem>
            <SelectItem value="PENDENTE">Pendentes</SelectItem>
          </SelectContent>
        </Select>
        <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as typeof ordenarPor)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Ordenar por nome</SelectItem>
            <SelectItem value="valor">Ordenar por valor</SelectItem>
            <SelectItem value="status">Ordenar por status</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {carregando && <p className="text-muted-foreground">Carregando…</p>}
      {erroCarga && (
        <div className="rounded-md border border-destructive/50 p-3 text-sm text-destructive">
          {erroCarga}{" "}
          <button type="button" className="underline" onClick={() => void recarregar()}>
            Tentar de novo
          </button>
        </div>
      )}

      {!carregando && !erroCarga && (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead>Nome</TableHead>
                <TableHead>Apelido</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={5}>
                    Nenhum participante encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                visiveis.map((p) => {
                  const emVoo = alterandoId === p.id;
                  const alvo = p.status === "PAGO" ? "pendente" : "pago";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell className="text-muted-foreground">{p.apelido ?? "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="inline-flex items-center justify-end gap-1">
                          {reais(p.valorAPagar)}
                          {p.valorCustomizado !== null && (
                            <span
                              className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-medium text-info"
                              title="Valor definido manualmente (ignora a fórmula de base/desconto/piso)"
                            >
                              <Pencil className="size-3" aria-hidden />
                              manual
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        {/* Verdade na tela: o badge é SEMPRE o status real; o 🎭 avisa quem
                            aparece como pago só na exportação (legível por si, sem hover). */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusBadge status={p.status} />
                          {p.exibirComoPago && p.status !== "PAGO" && (
                            <span
                              className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium text-info"
                              title="Aparece como pago na exportação do WhatsApp (status real: pendente)"
                            >
                              <VenetianMask className="size-3.5" aria-hidden />
                              exibido como pago
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {/* Mutação única (toggle). Em voo mostramos LOADING VISÍVEL (spinner)
                            em vez de desabilitar o botão — comunica "processando" sem apagar
                            o controle (importante no toque). */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void alternar(p)}
                          aria-label={`Marcar ${rotuloParticipante(p)} como ${alvo}`}
                        >
                          {emVoo ? (
                            <>
                              <Loader2 className="animate-spin" aria-hidden />
                              Processando…
                            </>
                          ) : (
                            `Marcar ${alvo}`
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Exportar → texto pronto (§12.7) + Copiar. O back já maquia a visão pública. */}
      <Dialog open={textoExport !== null} onOpenChange={(v) => !v && setTextoExport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar para o WhatsApp</DialogTitle>
            <DialogDescription>Texto pronto (§12.7) — copie e cole no grupo.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">
            {textoExport}
          </pre>
          <DialogFooter>{textoExport !== null && <CopiarWhatsApp texto={textoExport} />}</DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
