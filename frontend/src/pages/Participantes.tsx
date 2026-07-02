import { zodResolver } from "@hookform/resolvers/zod";
import { VenetianMask } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { ApiError } from "@/api/client";
import * as participantesApi from "@/api/participantes";
import type { Participante } from "@/api/participantes";
import { CopiarWhatsApp } from "@/components/CopiarWhatsApp";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Sentinelas: Radix Select não aceita value vazio, então "Nenhum"/"Todos" usam tokens.
const NENHUM = "__nenhum__";
const TODOS = "__todos__";

/** Rótulo de exibição: nome + apelido entre aspas, se houver. */
function rotulo(p: { nome: string; apelido: string | null }): string {
  return p.apelido ? `${p.nome} "${p.apelido}"` : p.nome;
}

// Validação de FORMA no cliente (espelha o participanteInputSchema do back, que valida de
// verdade). O front NÃO reimplementa regra de negócio — só valida o formulário (§3.1).
const formSchema = z.object({
  nome: z.string().trim().min(1, "O nome é obrigatório."),
  apelido: z.string().trim(),
  indicadorId: z.string(),
  isento: z.boolean(),
  exibirComoPago: z.boolean(),
  // Valor customizado (override): texto no form. Vazio = sem override (usa a fórmula).
  // Preenchido = inteiro >= 0 (livre — o override dispensa o piso). O back revalida.
  valorCustomizado: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), "Informe um valor inteiro ≥ 0 (ou deixe vazio)."),
});
type FormCampos = z.infer<typeof formSchema>;

export function Participantes() {
  const [lista, setLista] = useState<Participante[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarga, setErroCarga] = useState<string | null>(null);

  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<string>(TODOS);
  const [ordenarPor, setOrdenarPor] = useState<"nome" | "status">("nome");

  const [editando, setEditando] = useState<Participante | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const [removendo, setRemovendo] = useState<Participante | null>(null);
  const [textoExport, setTextoExport] = useState<string | null>(null);

  const navigate = useNavigate();

  async function recarregar() {
    setCarregando(true);
    setErroCarga(null);
    try {
      setLista(await participantesApi.listarParticipantes());
    } catch (e) {
      setErroCarga(e instanceof ApiError ? e.message : "Falha ao carregar participantes.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    void recarregar();
  }, []);

  // Busca/filtro/ordenação CLIENT-SIDE: na escala do bolão (~63) é instantâneo e ainda
  // permite ordenar por status (que a query da API não oferece). A API tem os filtros
  // server-side (ver api/participantes.ts) caso um dia precise.
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
    return [...filtrados].sort((a, b) =>
      ordenarPor === "nome"
        ? a.nome.localeCompare(b.nome, "pt-BR")
        : a.status.localeCompare(b.status) || a.nome.localeCompare(b.nome, "pt-BR"),
    );
  }, [lista, busca, filtroStatus, ordenarPor]);

  async function exportar() {
    try {
      setTextoExport(await participantesApi.exportarParticipantes());
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Falha ao exportar.");
    }
  }

  async function confirmarRemocao() {
    if (!removendo) return;
    try {
      await participantesApi.removerParticipante(removendo.id);
      toast.success("Participante removido.");
      setRemovendo(null);
      await recarregar();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível remover.");
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold uppercase tracking-wide">Participantes</h1>
        <div className="flex gap-2">
          <Button variant="gold" onClick={() => void exportar()}>
            Exportar
          </Button>
          <Button
            onClick={() => {
              setEditando(null);
              setFormAberto(true);
            }}
          >
            Novo participante
          </Button>
        </div>
      </div>

      {/* Busca / filtro / ordenação (ricos — §16) */}
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
        <Select value={ordenarPor} onValueChange={(v) => setOrdenarPor(v as "nome" | "status")}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="nome">Ordenar por nome</SelectItem>
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
                <TableHead>Indicado por</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Isento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visiveis.length === 0 ? (
                <TableRow>
                  <TableCell className="text-muted-foreground" colSpan={6}>
                    Nenhum participante encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                visiveis.map((p) => (
                  // A linha abre o PERFIL. Os botões de Ações param a propagação (não navegam).
                  <TableRow
                    key={p.id}
                    onClick={() => navigate(`/participantes/${p.id}`)}
                    className="cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{p.apelido ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.indicador ? rotulo(p.indicador) : "—"}
                    </TableCell>
                    <TableCell>
                      {/* Visão INTERNA mostra a VERDADE: o badge é sempre o status REAL.
                          Quando o participante está marcado p/ aparecer como pago no grupo
                          (e ainda não pagou de fato), um marcador discreto avisa — legível
                          POR SI (ícone + texto), sem depender de hover (§8.8; mobile). */}
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
                    <TableCell>
                      {p.isento ? (
                        <StatusBadge status="ISENTO" />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditando(p);
                            setFormAberto(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRemovendo(p);
                          }}
                        >
                          Remover
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Cadastrar / Editar */}
      <Dialog open={formAberto} onOpenChange={setFormAberto}>
        <DialogContent key={editando?.id ?? "novo"}>
          <DialogHeader>
            <DialogTitle>{editando ? "Editar participante" : "Novo participante"}</DialogTitle>
            <DialogDescription>
              {editando ? "Atualize os dados do participante." : "Cadastre um novo participante."}
            </DialogDescription>
          </DialogHeader>
          <FormParticipante
            editando={editando}
            candidatos={lista}
            onCancelar={() => setFormAberto(false)}
            onSalvo={() => {
              setFormAberto(false);
              void recarregar();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Remover (confirmação de ação destrutiva) */}
      <Dialog open={removendo !== null} onOpenChange={(v) => !v && setRemovendo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover participante</DialogTitle>
            <DialogDescription>
              Remover <strong>{removendo ? rotulo(removendo) : ""}</strong>? Se ele indicou
              outras pessoas, elas NÃO são apagadas — apenas deixam de constar como indicadas
              por ele.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemovendo(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={() => void confirmarRemocao()}>
              Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Exportar → texto pronto (§12.6) + Copiar */}
      <Dialog open={textoExport !== null} onOpenChange={(v) => !v && setTextoExport(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar para o WhatsApp</DialogTitle>
            <DialogDescription>Texto pronto (§12.6) — copie e cole no grupo.</DialogDescription>
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

function FormParticipante({
  editando,
  candidatos,
  onSalvo,
  onCancelar,
}: {
  editando: Participante | null;
  candidatos: Participante[];
  onSalvo: () => void;
  onCancelar: () => void;
}) {
  // "Indicado por": seleciona de quem já existe (NUNCA digita). Na edição, exclui o próprio.
  const candidatosValidos = candidatos.filter((c) => c.id !== editando?.id);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormCampos>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: editando?.nome ?? "",
      apelido: editando?.apelido ?? "",
      indicadorId: editando?.indicadorId ?? NENHUM,
      isento: editando?.isento ?? false,
      exibirComoPago: editando?.exibirComoPago ?? false,
      valorCustomizado:
        editando?.valorCustomizado != null ? String(editando.valorCustomizado) : "",
    },
  });

  async function aoEnviar(campos: FormCampos) {
    const dados = {
      nome: campos.nome,
      apelido: campos.apelido.trim() === "" ? null : campos.apelido.trim(),
      indicadorId: campos.indicadorId === NENHUM ? null : campos.indicadorId,
      isento: campos.isento,
      exibirComoPago: campos.exibirComoPago,
      // Vazio = sem override (null → volta à fórmula); preenchido = override (inteiro ≥ 0).
      valorCustomizado: campos.valorCustomizado.trim() === "" ? null : Number(campos.valorCustomizado),
    };
    try {
      if (editando) {
        await participantesApi.editarParticipante(editando.id, dados);
        toast.success("Participante atualizado.");
      } else {
        await participantesApi.criarParticipante(dados);
        toast.success("Participante cadastrado.");
      }
      onSalvo();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    }
  }

  return (
    <form onSubmit={handleSubmit(aoEnviar)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="nome">Nome</Label>
        <Input id="nome" aria-invalid={errors.nome ? true : undefined} {...register("nome")} />
        {errors.nome && <p className="text-sm text-destructive">{errors.nome.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="apelido">Apelido (opcional)</Label>
        <Input id="apelido" {...register("apelido")} />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Indicado por</Label>
        <Controller
          control={control}
          name="indicadorId"
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NENHUM}>Nenhum</SelectItem>
                {candidatosValidos.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {rotulo(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      </div>

      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="isento"
          render={({ field }) => (
            <Switch id="isento" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="isento">Isento de pagamento</Label>
      </div>

      <div className="flex items-center gap-3">
        <Controller
          control={control}
          name="exibirComoPago"
          render={({ field }) => (
            <Switch id="exibirComoPago" checked={field.value} onCheckedChange={field.onChange} />
          )}
        />
        <Label htmlFor="exibirComoPago" className="leading-snug">
          Exibir como pago no grupo
          <span className="block text-xs font-normal text-muted-foreground">
            Só maquia a exportação do WhatsApp — não muda o status real.
          </span>
        </Label>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="valorCustomizado">Valor customizado (R$)</Label>
        <Input
          id="valorCustomizado"
          type="number"
          min={0}
          inputMode="numeric"
          placeholder="Vazio = usa a fórmula"
          aria-invalid={errors.valorCustomizado ? true : undefined}
          {...register("valorCustomizado")}
        />
        <span className="text-xs text-muted-foreground">
          Substitui o cálculo (base, desconto e piso). Vazio = usa a fórmula. Isento ignora este valor.
        </span>
        {errors.valorCustomizado && (
          <p className="text-sm text-destructive">{errors.valorCustomizado.message}</p>
        )}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
