// Limpieza de eventos de error antes de enviarlos a Sentry (app, panel y API).
// Las intenciones son datos de creencias religiosas (GDPR art. 9): ningún error puede llevarlas.
// - Sin cuerpo de peticiones, cookies ni cabeceras de autenticación.
// - Sin usuario ni IP: ip_address a null impide que Sentry la deduzca ("{{auto}}").
// - Migas solo de navegación y de peticiones, con URL, método y estado.
// - Sin datos extra.
// Sin dependencias de Sentry: trabaja sobre la forma del evento, común a los tres SDK.

// Formas mínimas (sin firmas de índice, para que encajen las interfaces de los SDK de Sentry).
type Crumb = { category?: string; type?: string; message?: string; data?: { [key: string]: unknown } };
type Mutable = {
  request?: { url?: string; data?: unknown; cookies?: unknown; headers?: { [key: string]: string }; query_string?: unknown };
  user?: object;
  breadcrumbs?: Crumb[];
  extra?: object;
};
export type ScrubbableEvent = object;

const SAFE_CRUMBS = new Set(["navigation", "fetch", "xhr", "http"]);
const SAFE_CRUMB_DATA = ["url", "method", "status_code", "from", "to"];

export function scrubEvent<E extends ScrubbableEvent>(input: E): E {
  const event = input as Mutable;
  if (event.request) {
    delete event.request.data;
    delete event.request.cookies;
    delete event.request.query_string;
    if (event.request.url) event.request.url = stripQuery(event.request.url) as string;
    if (event.request.headers) {
      const ua = event.request.headers["user-agent"] ?? event.request.headers["User-Agent"];
      event.request.headers = ua ? { "user-agent": ua } : {};
    }
  }
  event.user = { ip_address: null };
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .filter((b) => SAFE_CRUMBS.has(b.category ?? b.type ?? ""))
      .map((b) => ({
        ...b,
        message: undefined,
        data: b.data ? Object.fromEntries(SAFE_CRUMB_DATA.filter((k) => k in b.data!).map((k) => [k, stripQuery(b.data![k])])) : undefined,
      }));
  }
  delete event.extra;
  return input;
}

// Las URLs solo conservan la ruta: los parámetros pueden llevar datos.
function stripQuery(v: unknown) {
  return typeof v === "string" ? v.split("?")[0] : v;
}
