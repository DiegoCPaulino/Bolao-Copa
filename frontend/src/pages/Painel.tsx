import { CopiarWhatsApp } from "@/components/CopiarWhatsApp";

// Stub do Painel (Fase 8 preenche). Demonstra o botão Copiar com um texto de EXEMPLO —
// na Fase 8 esse texto virá pronto da API (text/plain dos formatadores), não daqui.
const EXEMPLO_WHATSAPP = `💰 *PAGAMENTOS*

✅ *Pagos*
• Diego — R$ 35

⏳ *Pendentes*
• Ana — R$ 40

🏆 *Prêmio*: R$ 90 / R$ 1.065`;

export function Painel() {
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Painel</h1>
      <p className="text-muted-foreground">Tela em construção (Fase 8).</p>

      <div className="rounded-md border p-4">
        <p className="mb-2 text-sm text-muted-foreground">
          Demonstração do botão Copiar (na Fase 8 o texto vem pronto da API):
        </p>
        <pre className="mb-3 overflow-x-auto whitespace-pre-wrap rounded bg-muted p-3 text-sm">
          {EXEMPLO_WHATSAPP}
        </pre>
        <CopiarWhatsApp texto={EXEMPLO_WHATSAPP} />
      </div>
    </section>
  );
}
