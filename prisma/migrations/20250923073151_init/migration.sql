-- CreateEnum
CREATE TYPE "public"."AgreementType" AS ENUM ('SOW', 'MSA');

-- CreateEnum
CREATE TYPE "public"."TaxIdentificationType" AS ENUM ('VAT', 'FISCAL_ID');

-- CreateTable
CREATE TABLE "public"."invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdByUserId" TEXT NOT NULL,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "password" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "uniqueProjectIdentifier" TEXT,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "contactPerson" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "agreementType" "public"."AgreementType" NOT NULL DEFAULT 'SOW',
    "agreementRef" TEXT,
    "poNumber" TEXT,
    "invoicePurpose" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "taxIdentificationType" "public"."TaxIdentificationType" DEFAULT 'VAT',
    "taxNumber" TEXT DEFAULT '',
    "status" TEXT NOT NULL DEFAULT 'active',
    "paymentDueDays" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastImportedAt" TIMESTAMP(3),
    "lastImportedTab" TEXT,
    "lastImportedEmployeeCount" INTEGER,
    "userId" TEXT NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ratePerHour" DOUBLE PRECISION NOT NULL,
    "hours" DOUBLE PRECISION NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "projectId" TEXT NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."companies" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "cinNumber" TEXT,
    "gstNumber" TEXT,
    "ifscCode" TEXT,
    "bankName" TEXT,
    "bankAddress" TEXT,
    "swiftCode" TEXT,
    "remittingBankName" TEXT,
    "remittingCurrency" TEXT,
    "remittingAccountNo" TEXT,
    "remittingSwiftCode" TEXT,
    "remittingIbanNo" TEXT,
    "remittingAbaFedNo" TEXT,
    "signatureImage" TEXT,
    "companyStampImage" TEXT,
    "signatoryName" TEXT,
    "signatoryDesignation" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."currency_accounts" (
    "id" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "encryptedData" TEXT NOT NULL,
    "last4" VARCHAR(4) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "currency_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_key" ON "public"."invitations"("token");

-- CreateIndex
CREATE INDEX "invitations_email_idx" ON "public"."invitations"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_uniqueProjectIdentifier_key" ON "public"."projects"("uniqueProjectIdentifier");

-- CreateIndex
CREATE INDEX "currency_accounts_userId_idx" ON "public"."currency_accounts"("userId");

-- CreateIndex
CREATE INDEX "currency_accounts_currency_idx" ON "public"."currency_accounts"("currency");

-- AddForeignKey
ALTER TABLE "public"."invitations" ADD CONSTRAINT "invitations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."projects" ADD CONSTRAINT "projects_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."employees" ADD CONSTRAINT "employees_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "public"."projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."currency_accounts" ADD CONSTRAINT "currency_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
