-- AlterTable
ALTER TABLE "FrequenciaRegistro" ADD COLUMN     "configId" TEXT;

-- AddForeignKey
ALTER TABLE "FrequenciaRegistro" ADD CONSTRAINT "FrequenciaRegistro_configId_fkey" FOREIGN KEY ("configId") REFERENCES "FrequenciaConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;
