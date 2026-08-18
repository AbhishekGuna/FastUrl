import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { config } from "../../config/index.js";
import { pool } from "../postgres/pool.js";

export const auth = betterAuth({
  database: pool,
  baseURL: config.authUrl,
  trustedOrigins: ["http://localhost:8080"],
  secret: config.authSecret,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [bearer()],
});
