-- CreateTable
CREATE TABLE "MetaLeadEvent" (
    "id" SERIAL NOT NULL,
    "eventName" TEXT NOT NULL,
    "eventTime" TIMESTAMP(3) NOT NULL,
    "userData" TEXT NOT NULL,
    "customData" TEXT NOT NULL,
    "rawData" TEXT NOT NULL,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetaLeadEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetaLeadEvent_eventName_idx" ON "MetaLeadEvent"("eventName");

-- CreateIndex
CREATE INDEX "MetaLeadEvent_createdAt_idx" ON "MetaLeadEvent"("createdAt");
