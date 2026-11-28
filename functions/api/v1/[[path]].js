/**
 * Cloudflare Pages Functions adapter.
 * Keeps /api/v1/* on the same origin as the Pages site so Secure,
 * SameSite=Strict session cookies work without cross-site cookies.
 */
import worker from "../../../backend/worker.js";

export async function onRequest(context) {
  return worker.fetch(context.request, context.env);
}
