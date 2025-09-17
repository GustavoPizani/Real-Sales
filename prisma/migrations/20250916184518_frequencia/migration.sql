-- CreateTable
CREATE TABLE "FrequenciaConfig" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "raio" INTEGER NOT NULL,
    "horarios" JSONB NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrequenciaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrequenciaRegistro" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "distancia" INTEGER NOT NULL,
    "dentroDoRaio" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FrequenciaRegistro_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FrequenciaRegistro" ADD CONSTRAINT "FrequenciaRegistro_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
