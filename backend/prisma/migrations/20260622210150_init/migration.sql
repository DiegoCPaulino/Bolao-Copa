-- CreateEnum
CREATE TYPE "StatusPagamento" AS ENUM ('PAGO', 'PENDENTE');

-- CreateEnum
CREATE TYPE "FaseRodada" AS ENUM ('DEZESSEIS_AVOS', 'OITAVAS', 'QUARTAS', 'SEMIFINAIS', 'FINAL');

-- CreateEnum
CREATE TYPE "EstadoRodada" AS ENUM ('MONTADA', 'PALPITES_ABERTOS', 'RESULTADOS_EM_ANDAMENTO', 'ENCERRADA');

-- CreateTable
CREATE TABLE "Selecao" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "bandeira" TEXT NOT NULL,

    CONSTRAINT "Selecao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participante" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "apelido" TEXT,
    "status" "StatusPagamento" NOT NULL DEFAULT 'PENDENTE',
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indicadorId" TEXT,

    CONSTRAINT "Participante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rodada" (
    "id" TEXT NOT NULL,
    "fase" "FaseRodada" NOT NULL,
    "ordem" INTEGER NOT NULL,
    "estado" "EstadoRodada" NOT NULL DEFAULT 'MONTADA',

    CONSTRAINT "Rodada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Jogo" (
    "id" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL,
    "rodadaId" TEXT NOT NULL,
    "selecaoEsquerdaId" TEXT NOT NULL,
    "selecaoDireitaId" TEXT NOT NULL,
    "golsEsquerdaReal" INTEGER,
    "golsDireitaReal" INTEGER,

    CONSTRAINT "Jogo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Palpite" (
    "id" TEXT NOT NULL,
    "golsEsquerda" INTEGER NOT NULL,
    "golsDireita" INTEGER NOT NULL,
    "participanteId" TEXT NOT NULL,
    "jogoId" TEXT NOT NULL,

    CONSTRAINT "Palpite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Palpite_participanteId_jogoId_key" ON "Palpite"("participanteId", "jogoId");

-- AddForeignKey
ALTER TABLE "Participante" ADD CONSTRAINT "Participante_indicadorId_fkey" FOREIGN KEY ("indicadorId") REFERENCES "Participante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_rodadaId_fkey" FOREIGN KEY ("rodadaId") REFERENCES "Rodada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_selecaoEsquerdaId_fkey" FOREIGN KEY ("selecaoEsquerdaId") REFERENCES "Selecao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Jogo" ADD CONSTRAINT "Jogo_selecaoDireitaId_fkey" FOREIGN KEY ("selecaoDireitaId") REFERENCES "Selecao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Palpite" ADD CONSTRAINT "Palpite_participanteId_fkey" FOREIGN KEY ("participanteId") REFERENCES "Participante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Palpite" ADD CONSTRAINT "Palpite_jogoId_fkey" FOREIGN KEY ("jogoId") REFERENCES "Jogo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
