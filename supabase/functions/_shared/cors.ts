export const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // tighten to the Pages origin once known
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Standard response shape, same as the original IQPS: {status, message, data}. */
export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
export const ok = (message: string, data: unknown = null) =>
  json({ status: "success", message, data });
export const fail = (message: string, status = 400, data: unknown = null) =>
  json({ status: "error", message, data }, status);

export function preflight(): Response {
  return new Response("ok", { headers: corsHeaders });
}
