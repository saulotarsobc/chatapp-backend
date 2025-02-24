-- CreateTable
CREATE TABLE "WhatsappSession" (
    "id" TEXT NOT NULL,
    "sessionName" TEXT NOT NULL,
    "sessionData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsappSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsappSession_sessionName_key" ON "WhatsappSession"("sessionName");
