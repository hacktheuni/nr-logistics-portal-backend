-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('DeliveredCollected', 'UnableToDeliverCollect', 'CarryForward', 'MissingParcel');

-- CreateEnum
CREATE TYPE "ParcelType" AS ENUM ('Postable', 'SmallPacket', 'Packet', 'Standard', 'HangingGarment', 'Heavy', 'HeavyLarge', 'SmallCatalogue', 'MediumCatalogue');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "appEmail" TEXT,
    "appPassword" TEXT,
    "appCourierId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "postcodes" TEXT[],
    "ratesPerParcel" JSONB NOT NULL,
    "dropNumber" INTEGER NOT NULL,
    "deliveryUnitLocation" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Manifest" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "totalParcels" INTEGER NOT NULL DEFAULT 0,
    "totalDeliveredOrCollectedParcels" INTEGER NOT NULL DEFAULT 0,
    "totalUndeliveredParcels" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Manifest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManifestParcel" (
    "id" TEXT NOT NULL,
    "manifestId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "status" "Status" NOT NULL,
    "address" TEXT NOT NULL,
    "parcelType" "ParcelType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManifestParcel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "courierId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "ratingDateTime" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Volume" (
    "id" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "volume" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Volume_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Round_roundNumber_key" ON "Round"("roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Manifest_manifestId_key" ON "Manifest"("manifestId");

-- CreateIndex
CREATE UNIQUE INDEX "ManifestParcel_parcelId_key" ON "ManifestParcel"("parcelId");

-- AddForeignKey
ALTER TABLE "Manifest" ADD CONSTRAINT "Manifest_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManifestParcel" ADD CONSTRAINT "ManifestParcel_manifestId_fkey" FOREIGN KEY ("manifestId") REFERENCES "Manifest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_courierId_fkey" FOREIGN KEY ("courierId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Volume" ADD CONSTRAINT "Volume_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
