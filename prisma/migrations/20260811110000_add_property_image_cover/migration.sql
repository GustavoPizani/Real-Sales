-- Marca qual imagem do imóvel é a capa (antes era implicitamente "a de id menor",
-- que é arbitrário já que o id é um UUID aleatório).
ALTER TABLE "property_images" ADD COLUMN     "isCover" BOOLEAN NOT NULL DEFAULT false;
