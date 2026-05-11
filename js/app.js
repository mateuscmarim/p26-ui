import { createApi } from "./api.js";
import { createAuth } from "./auth.js";
import { createSidebar } from "./sidebar.js";

const $loginView = $("#login-view");
const $appView = $("#app-view");
const $views = {
  dashboard: $("#dashboard-view"),
  credentials: $("#credentials-view"),
  audit: $("#audit-view"),
  locations: $("#locations-view"),
  ingest: $("#ingest-view"),
};

const api = createApi();
const auth = createAuth({ api, $form: $("#login-form"), $error: $("#login-error") });

const created = {};

function showView(id) {
  Object.entries($views).forEach(([key, $el]) => {
    if (key === id) $el.removeAttr("hidden").show();
    else $el.hide();
  });
  ensureView(id);
}

function ensureView(id) {
  if (created[id]) return;
  created[id] = true;
  switch (id) {
    case "dashboard":
      if (typeof window.createDashboard === "function") {
        window.createDashboard({ $holder: $views.dashboard, api });
      }
      break;
    case "credentials":
      if (typeof window.createCredentials === "function") {
        window.createCredentials({ $holder: $views.credentials, api });
      }
      break;
    case "audit":
      if (typeof window.createAudit === "function") {
        window.createAudit({ $holder: $views.audit, api });
      }
      break;
    case "locations":
      if (typeof window.createLocationsAndProviders === "function") {
        window.createLocationsAndProviders({ $holder: $views.locations, api });
      }
      break;
    case "ingest":
      if (typeof window.createIngest === "function") {
        window.createIngest({ $holder: $views.ingest, api });
      }
      break;
  }
}

function enterApp(displayName) {
  $loginView.hide();
  // The HTML5 `hidden` attribute on #app-view wins over jQuery's inline display:'',
  // so it must be removed explicitly before .show() can take effect.
  $appView.removeAttr("hidden").show();
  createSidebar({
    $holder: $("#sidebar"),
    displayName,
    onViewChange: showView,
    onLogout: () => {
      auth.logout();
      location.reload();
    },
  });
  showView("dashboard");
}

window.addEventListener("auth:expired", () => {
  auth.logout();
  location.reload();
});

if (auth.getStoredToken()) {
  enterApp(auth.getDisplayName());
} else {
  auth.onLoginSuccess((displayName) => enterApp(displayName));
}
