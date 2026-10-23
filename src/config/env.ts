import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  FRONTEND_URL: z.string().default("*"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET est requis"),
  SECRET_KEY: z.string().min(1, "SECRET_KEY est requis"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL est requis"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Erreur de configuration des variables d'environnement:");
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
export default env;
