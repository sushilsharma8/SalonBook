-- Run this once on the target database before deploying app changes.
-- Adds user gender, service variants, and booking snapshot fields.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserGender') THEN
    CREATE TYPE "UserGender" AS ENUM ('MALE', 'FEMALE', 'OTHER');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ServiceTargetGender') THEN
    CREATE TYPE "ServiceTargetGender" AS ENUM ('MALE', 'FEMALE', 'UNISEX');
  END IF;
END $$;

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "gender" "UserGender";

CREATE TABLE IF NOT EXISTS "ServiceVariant" (
  "id" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "targetGender" "ServiceTargetGender" NOT NULL,
  "price" INTEGER NOT NULL,
  "duration" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceVariant_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ServiceVariant_serviceId_targetGender_key'
  ) THEN
    ALTER TABLE "ServiceVariant"
      ADD CONSTRAINT "ServiceVariant_serviceId_targetGender_key"
      UNIQUE ("serviceId", "targetGender");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'ServiceVariant_serviceId_fkey'
  ) THEN
    ALTER TABLE "ServiceVariant"
      ADD CONSTRAINT "ServiceVariant_serviceId_fkey"
      FOREIGN KEY ("serviceId") REFERENCES "Service"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "BookingService" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "BookingService" ADD COLUMN IF NOT EXISTS "serviceNameAtBooking" TEXT;
ALTER TABLE "BookingService" ADD COLUMN IF NOT EXISTS "targetGenderAtBooking" "ServiceTargetGender";
ALTER TABLE "BookingService" ADD COLUMN IF NOT EXISTS "priceAtBooking" INTEGER;
ALTER TABLE "BookingService" ADD COLUMN IF NOT EXISTS "durationAtBooking" INTEGER;

UPDATE "BookingService" bs
SET
  "serviceNameAtBooking" = s."name",
  "targetGenderAtBooking" = 'UNISEX'::"ServiceTargetGender",
  "priceAtBooking" = COALESCE(s."price", 0),
  "durationAtBooking" = COALESCE(s."duration", 0)
FROM "Service" s
WHERE bs."serviceId" = s."id"
  AND (bs."serviceNameAtBooking" IS NULL
    OR bs."targetGenderAtBooking" IS NULL
    OR bs."priceAtBooking" IS NULL
    OR bs."durationAtBooking" IS NULL);

ALTER TABLE "BookingService" ALTER COLUMN "serviceNameAtBooking" SET NOT NULL;
ALTER TABLE "BookingService" ALTER COLUMN "targetGenderAtBooking" SET NOT NULL;
ALTER TABLE "BookingService" ALTER COLUMN "priceAtBooking" SET NOT NULL;
ALTER TABLE "BookingService" ALTER COLUMN "durationAtBooking" SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'BookingService_variantId_fkey'
  ) THEN
    ALTER TABLE "BookingService"
      ADD CONSTRAINT "BookingService_variantId_fkey"
      FOREIGN KEY ("variantId") REFERENCES "ServiceVariant"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
