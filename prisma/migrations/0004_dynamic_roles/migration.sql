-- Roles become data: an admin creates them in the admin panel and picks their permissions.

-- CreateTable
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "name_key" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[],
    "system_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key_key" ON "roles"("name_key");

-- CreateIndex
CREATE UNIQUE INDEX "roles_system_key_key" ON "roles"("system_key");

-- Built-in roles (the code finds them by system_key, so they cannot be lost by renaming) and a few
-- ready-to-use examples. Permission ids are listed in src/lib/permissions.ts.
INSERT INTO "roles" ("id", "name", "name_key", "description", "permissions", "system_key") VALUES
  ('role_admin', 'Admin', 'admin', 'Everything, including giving roles to other people.',
    ARRAY['panel.open','panel.alerts','panel.donors','panel.requests','panel.hospitals','panel.fraud','panel.logs','roles.manage','ops.command','stock.own','stock.all','camps.create'], 'admin'),
  ('role_hospital', 'Hospital staff', 'hospital staff', 'Changes the blood stock and creates donation camps for their own hospital.',
    ARRAY['stock.own','camps.create'], 'hospital'),
  ('role_panel_viewer', 'Panel viewer', 'panel viewer', 'Can open the admin panel overview.',
    ARRAY['panel.open'], NULL),
  ('role_alert_operator', 'Alert operator', 'alert operator', 'Runs the emergency alerts and radius messages.',
    ARRAY['panel.open','panel.alerts'], NULL),
  ('role_donor_coordinator', 'Donor coordinator', 'donor coordinator', 'Looks after donors and blood requests.',
    ARRAY['panel.open','panel.donors','panel.requests'], NULL),
  ('role_fraud_reviewer', 'Fraud reviewer', 'fraud reviewer', 'Reviews fraud reports and the audit log.',
    ARRAY['panel.open','panel.fraud','panel.logs'], NULL),
  ('role_blood_bank_manager', 'Blood bank manager', 'blood bank manager', 'Changes the blood stock of every hospital and creates donation camps.',
    ARRAY['stock.all','camps.create'], NULL);

-- Grants point at a role instead of holding the old two-value enum.
ALTER TABLE "role_grants" ADD COLUMN "role_id" TEXT;
UPDATE "role_grants" SET "role_id" = CASE "role"::text WHEN 'ADMIN' THEN 'role_admin' ELSE 'role_hospital' END;
ALTER TABLE "role_grants" ALTER COLUMN "role_id" SET NOT NULL;
ALTER TABLE "role_grants" DROP COLUMN "role";
DROP TYPE "app_role";

-- CreateIndex
CREATE INDEX "role_grants_role_id_idx" ON "role_grants"("role_id");

-- AddForeignKey
ALTER TABLE "role_grants" ADD CONSTRAINT "role_grants_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Same as the earlier migrations: only the server (Prisma) may touch this table, never the browser key.
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;
