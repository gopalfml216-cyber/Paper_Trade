import "dotenv/config";
import { defineConfig } from "prisma/config";

// Detect if we are using standard sqlite or overrides
const dbUrl = process.env.DATABASE_URL || "file:./dev.db";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: dbUrl,
  },
});
