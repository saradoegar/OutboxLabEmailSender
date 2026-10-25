-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'RESCHEDULED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "slackAccessToken" TEXT,
    "slackChannel" TEXT,
    "slackWebhookUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "senderAccountId" TEXT,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "delaySeconds" INTEGER NOT NULL DEFAULT 2,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SenderAccount" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "etherealUser" TEXT NOT NULL,
    "etherealPass" TEXT NOT NULL,
    "maxPerHour" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SenderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "EmailJob_status_scheduledAt_idx" ON "EmailJob"("status", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "SenderAccount_email_key" ON "SenderAccount"("email");

-- AddForeignKey
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailJob" ADD CONSTRAINT "EmailJob_senderAccountId_fkey" FOREIGN KEY ("senderAccountId") REFERENCES "SenderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
