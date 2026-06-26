import { cva, type VariantProps } from "class-variance-authority";
import { CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/utils";

// Pill de status compartilhado: a fonte ÚNICA da aparência dos status do bolão. Cada tom
// usa os tokens semânticos do tema (success/warning/info) — sem cor hardcoded aqui, para a
// identidade continuar morando no tema central. Reusado em Participantes, Pagamentos, etc.
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      tom: {
        success: "bg-success-soft text-success",
        warning: "bg-warning-soft text-warning",
        info: "bg-info-soft text-info",
      },
    },
  },
);

type Tom = NonNullable<VariantProps<typeof badgeVariants>["tom"]>;

export type StatusBolao = "PAGO" | "PENDENTE" | "ISENTO";

// Mapeia cada status do domínio (vocabulário em pt-BR, Funcional §17) para rótulo + tom +
// ícone. O ícone reforça o significado além da cor (acessibilidade — não depende só de cor).
const CONFIG: Record<StatusBolao, { rotulo: string; tom: Tom; Icone: React.ElementType }> = {
  PAGO: { rotulo: "Pago", tom: "success", Icone: CheckCircle2 },
  PENDENTE: { rotulo: "Pendente", tom: "warning", Icone: Clock },
  ISENTO: { rotulo: "Isento", tom: "info", Icone: ShieldCheck },
};

export function StatusBadge({ status, className }: { status: StatusBolao; className?: string }) {
  const { rotulo, tom, Icone } = CONFIG[status];
  return (
    <span className={cn(badgeVariants({ tom }), className)}>
      <Icone aria-hidden />
      {rotulo}
    </span>
  );
}
