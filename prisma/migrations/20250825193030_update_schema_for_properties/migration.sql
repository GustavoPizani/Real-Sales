-- CreateTable
CREATE TABLE "PropertyTypology" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "area" DOUBLE PRECISION,
    "bedrooms" INTEGER,
    "bathrooms" INTEGER,
    "parking_spaces" INTEGER,
    "propertyId" TEXT NOT NULL,

    CONSTRAINT "PropertyTypology_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PropertyTypology" ADD CONSTRAINT "PropertyTypology_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Imovel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
