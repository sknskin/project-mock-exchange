/*
  Warnings:

  - Added the required column `name` to the `users` table without a default value. This is not possible if the table is not empty.
  - Made the column `phone` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `encrypted_rrn` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `address` on table `users` required. This step will fail if there are existing NULL values in that column.
  - Made the column `zip_code` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "name" VARCHAR(50) NOT NULL,
ALTER COLUMN "phone" SET NOT NULL,
ALTER COLUMN "encrypted_rrn" SET NOT NULL,
ALTER COLUMN "address" SET NOT NULL,
ALTER COLUMN "zip_code" SET NOT NULL;
