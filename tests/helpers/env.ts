/** Shared env defaults for QA harness (Compose / local eng). */

export const WEB_BASE_URL =
  process.env.WEB_BASE_URL?.replace(/\/$/, "") || "http://localhost:8081";

/** Nest API base including `/api` prefix (direct or via nginx). */
export const API_BASE_URL =
  process.env.API_BASE_URL?.replace(/\/$/, "") || "http://localhost:3000/api";
