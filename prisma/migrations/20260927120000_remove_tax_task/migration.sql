-- DropForeignKey
ALTER TABLE "TaxTask" DROP CONSTRAINT "TaxTask_userId_fkey";

-- DropTable
DROP TABLE "TaxTask";

-- DropEnum
DROP TYPE "TaskStatus";