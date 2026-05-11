import { TemplateUtil } from "./util.js";

const VIEWS = [
  { id: "dashboard", label: "Dashboard" },
  { id: "credentials", label: "Credentials" },
  { id: "audit", label: "Audit" },
  { id: "locations", label: "Locations & Providers" },
  { id: "ingest", label: "Ingest" },
];

export function createSidebar({ $holder, displayName, onViewChange, onLogout }) {
  const $shell = TemplateUtil.copyTemplate("sidebar-shell");
  $shell.find('[data-id="user-name"]').text(displayName || "");
  $shell.find('[data-id="logout"]').on("click", () => {
    if (typeof onLogout === "function") onLogout();
  });

  const $nav = $shell.find('[data-id="nav"]');
  const buttonsByView = {};

  VIEWS.forEach(({ id, label }) => {
    const $btn = TemplateUtil.copyTemplate("sidebar-btn");
    $btn.find('[data-id="label"]').text(label);
    $btn.on("click", () => {
      $nav.find(".sidebar-btn").removeClass("active");
      $btn.addClass("active");
      if (typeof onViewChange === "function") onViewChange(id);
    });
    if (id === "dashboard") $btn.addClass("active");
    buttonsByView[id] = $btn;
    $nav.append($btn);
  });

  $holder.empty().append($shell);

  window.addEventListener("credentials:counts", (event) => {
    const expiringSoon = event?.detail?.expiringSoon ?? 0;
    const $badge = buttonsByView.credentials.find('[data-id="badge"]');
    if (expiringSoon > 0) {
      $badge.text(String(expiringSoon)).prop("hidden", false);
    } else {
      $badge.prop("hidden", true);
    }
  });

  return { setActive: (id) => buttonsByView[id]?.trigger("click") };
}
