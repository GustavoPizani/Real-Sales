-- CreateTable
CREATE TABLE "ImagemPlanta" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipologiaId" TEXT NOT NULL,

    CONSTRAINT "ImagemPlanta_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "ImagemPlanta" ADD CONSTRAINT "ImagemPlanta_tipologiaId_fkey" FOREIGN KEY ("tipologiaId") REFERENCES "TipologiaImovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
