/**
 * API client factory for the credentials panel.
 *
 * - Auth: localStorage 'cred_token' attached as Authorization: Bearer <token>.
 * - apiBase: window.settings.apiBase (set by deploy-header.js).
 * - 401: clears local auth state, fires window 'auth:expired' (CustomEvent),
 *   throws Error('Unauthorized').
 * - Other errors: throws the original jqXHR so callers can read responseJSON.
 * - Field name conversion: response bodies are deep-camelized; request
 *   bodies and query params are deep-snakeized.
 *
 * The exposed surface is namespaced (credentials/locations/providers/documents/
 * ingest/audit/reminders) so views read like `api.credentials.list({...})`.
 */

const TRANSIENT_CODES = new Set([408, 429, 502, 503, 504]);
const MAX_RETRIES = 2;
const RETRY_DELAY = 1000;
const STORAGE_KEYS = ["cred_token", "cred_display_name", "cred_user_id", "cred_email"];

function camelizeKey(k) {
  return k.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}
function snakeizeKey(k) {
  return k.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}
function deepConvert(value, fn) {
  if (Array.isArray(value)) return value.map((v) => deepConvert(v, fn));
  if (value !== null && typeof value === "object" && value.constructor === Object) {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[fn(k)] = deepConvert(v, fn);
    return out;
  }
  return value;
}
const camelize = (v) => deepConvert(v, camelizeKey);
const snakeize = (v) => deepConvert(v, snakeizeKey);

export function createApi() {
  const apiBase = (window.settings && window.settings.apiBase) || "";

  function getToken() {
    return localStorage.getItem("cred_token");
  }

  function clearAuth() {
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
  }

  function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function isTransient(jq) {
    return jq.status === 0 || TRANSIENT_CODES.has(jq.status);
  }

  async function request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const opts = { method, url: `${apiBase}${path}`, headers, dataType: "json" };
    if (body != null) opts.data = JSON.stringify(snakeize(body));

    let lastError;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const result = await $.ajax(opts);
        return camelize(result);
      } catch (jq) {
        if (jq.status === 401) {
          const hadToken = !!getToken();
          clearAuth();
          if (hadToken) {
            window.dispatchEvent(new CustomEvent("auth:expired"));
          }
          throw new Error("Unauthorized");
        }
        lastError = jq;
        if (!isTransient(jq) || attempt === MAX_RETRIES) break;
        await delay(RETRY_DELAY);
      }
    }
    throw lastError;
  }

  function buildQuery(params) {
    if (!params) return "";
    const snake = snakeize(params || {});
    const qs = Object.entries(snake)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => encodeURIComponent(k) + "=" + encodeURIComponent(v))
      .join("&");
    return qs ? "?" + qs : "";
  }

  const get = (path, params) => request("GET", path + buildQuery(params));
  const post = (path, body) => request("POST", path, body);
  const put = (path, body) => request("PUT", path, body);
  const del = (path) => request("DELETE", path);

  function uploadFile(path, file, fieldName = "file") {
    const fd = new FormData();
    fd.append(fieldName, file, file.name);
    const headers = {};
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
    return $.ajax({
      method: "POST",
      url: `${apiBase}${path}`,
      headers,
      data: fd,
      processData: false,
      contentType: false,
      dataType: "json",
    });
  }

  return {
    // Low-level HTTP, exposed for tests
    get,
    post,
    put,
    delete: del,

    // Auth
    login: ({ email, password }) =>
      post("/api/auth/login", { email, password }),

    // Credentials
    credentials: {
      list: (params) => get("/api/credentials/credentials", params),
      get: (id) => get(`/api/credentials/credentials/${encodeURIComponent(id)}`),
      update: (id, patch) =>
        put(`/api/credentials/credentials/${encodeURIComponent(id)}`, patch),
      remove: (id) =>
        del(`/api/credentials/credentials/${encodeURIComponent(id)}`),
    },

    // Locations
    locations: {
      list: (params) => get("/api/credentials/locations", params),
      get: (id) => get(`/api/credentials/locations/${encodeURIComponent(id)}`),
      create: (body) => post("/api/credentials/locations", body),
      update: (id, body) =>
        put(`/api/credentials/locations/${encodeURIComponent(id)}`, body),
      remove: (id) => del(`/api/credentials/locations/${encodeURIComponent(id)}`),
    },

    // Providers
    providers: {
      list: (params) => get("/api/credentials/providers", params),
      get: (id) => get(`/api/credentials/providers/${encodeURIComponent(id)}`),
      create: (body) => post("/api/credentials/providers", body),
      update: (id, body) =>
        put(`/api/credentials/providers/${encodeURIComponent(id)}`, body),
      remove: (id) => del(`/api/credentials/providers/${encodeURIComponent(id)}`),
    },

    // Documents
    documents: {
      listForCredential: (credentialId) =>
        get(`/api/credentials/credentials/${encodeURIComponent(credentialId)}/documents`),
      downloadUrl: (id) =>
        `${apiBase}/api/credentials/documents/${encodeURIComponent(id)}/download`,
      upload: (file) => uploadFile("/api/credentials/documents", file),
    },

    // Ingest
    ingest: {
      upload: (file) => uploadFile("/api/credentials/ingest", file),
      status: (batchId) =>
        get(`/api/credentials/ingest/${encodeURIComponent(batchId)}`),
      confirm: (itemId, record) =>
        post(`/api/credentials/ingest/items/${encodeURIComponent(itemId)}/confirm`, record),
      reject: (itemId, reason) =>
        post(`/api/credentials/ingest/items/${encodeURIComponent(itemId)}/reject`, { reason }),
    },

    // Audit
    audit: {
      list: (params) => get("/api/credentials/audit", params),
      listForCredential: (credentialId) =>
        get(`/api/credentials/credentials/${encodeURIComponent(credentialId)}/audit`),
    },

    // Reminders
    reminders: {
      recent: (days) => get("/api/credentials/reminders/recent", { days }),
    },
  };
}
