import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { Pool } from "pg";
import { config } from "../../config/index.js";

export const auth = betterAuth({
  database: new Pool({ connectionString: config.databaseUrl }),
  baseURL: config.authUrl,
  secret: config.authSecret,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [bearer()],
});
