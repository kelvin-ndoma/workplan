function httpsHost(host?: string) {
  if (!host) return "";
  return `https://${host.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;
}

/** Public site URL. On Vercel, localhost AUTH_URL is ignored. */
export function appUrl() {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const vercelUrl = httpsHost(vercelHost);
  const explicit = (process.env.AUTH_URL || process.env.APP_URL || "").replace(/\/$/, "");
  const localhost = !explicit || /localhost|127\.0\.0\.1/.test(explicit);

  if (process.env.VERCEL && localhost) return vercelUrl || explicit || "http://localhost:3000";
  if (explicit) return explicit;
  if (vercelUrl) return vercelUrl;
  return "http://localhost:3000";
}

export function applyProductionAuthUrl() {
  if (!process.env.VERCEL) return;
  const url = appUrl();
  if (url.startsWith("https://")) process.env.AUTH_URL = url;
}
