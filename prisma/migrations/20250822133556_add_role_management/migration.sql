-- CreateTable
CREATE TABLE "RoleSetting" (
    "roleName" "Role" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "RoleSetting_pkey" PRIMARY KEY ("roleName")
);
