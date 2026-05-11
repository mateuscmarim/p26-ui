import { TemplateUtil } from "./util.js";
import { daysUntil, formatCredentialType } from "./format.js";

const REMINDERS_INLINE_LIMIT = 5;

export async function createDashboard({ $holder, api, today }) {
  const $shell = TemplateUtil.copyTemplate("dashboard-shell");
  $holder.empty().append($shell);

  const todayStr = today || new Date().toISOString().slice(0, 10);

  const [credentialsResult, recentRemindersResult] = await Promise.all([
    api.credentials.list({ limit: 500 }),
    api.reminders.recent(7).catch(() => ({ items: [] })),
  ]);
  const items = credentialsResult.items || [];
  const recentReminders = recentRemindersResult.items || [];

  const total = items.length;
  const expiring = items.filter((c) => {
    if (!c.expiresAt) return false;
    const d = daysUntil(c.expiresAt, todayStr);
    return d >= 0 && d <= 30;
  }).length;
  const expired = items.filter((c) => c.status === "EXPIRED").length;
  const remindersToday = recentReminders.filter((r) => {
    const sent = r.sentAt ? r.sentAt.slice(0, 10) : null;
    return sent === todayStr;
  }).length;

  const $cards = $shell.find('[data-id="cards"]');
  [
    ["Total", total],
    ["Expiring (30d)", expiring],
    ["Expired", expired],
    ["Reminders today", remindersToday],
  ].forEach(([label, value]) => {
    const $card = TemplateUtil.copyTemplate("dashboard-card");
    $card.find('[data-id="label"]').text(label);
    $card.find('[data-id="value"]').text(value);
    $cards.append($card);
  });

  window.dispatchEvent(
    new CustomEvent("credentials:counts", { detail: { expiringSoon: expiring } }),
  );

  renderChart($shell.find('[data-id="expiry-chart"]')[0], items, todayStr);

  renderRemindersInline($shell, recentReminders);

  $shell.find('[data-id="show-reminders"]').on("click", async () => {
    const result = await api.reminders.recent(7);
    showRemindersModal(result.items || []);
  });
}

function renderRemindersInline($shell, reminders) {
  const $section = $shell.find('[data-id="reminders-section"]');
  const $list = $shell.find('[data-id="reminders-inline"]');
  $list.empty();
  if (!reminders.length) {
    $section.prop("hidden", true);
    return;
  }
  $section.prop("hidden", false);
  reminders.slice(0, REMINDERS_INLINE_LIMIT).forEach((r) => {
    const $row = TemplateUtil.copyTemplate("reminder-item").addClass("reminder-item");
    $row.find('[data-id="when"]').addClass("reminder-when").text(new Date(r.sentAt).toLocaleString());
    $row.find('[data-id="recipient"]').addClass("reminder-recipient").text(r.recipientEmail || "");
    $row.find('[data-id="template"]').addClass("reminder-template").text(r.templateName || "");
    $list.append($row);
  });
}

function renderChart(canvas, items, todayStr) {
  if (!canvas || typeof window.Chart !== "function") return;
  const buckets = { Expired: {}, "0-30d": {}, "31-90d": {}, "90d+": {} };
  items.forEach((c) => {
    const type = c.credentialType || "Other";
    let bucket = "90d+";
    if (!c.expiresAt) bucket = "Expired";
    else {
      const d = daysUntil(c.expiresAt, todayStr);
      if (d < 0) bucket = "Expired";
      else if (d <= 30) bucket = "0-30d";
      else if (d <= 90) bucket = "31-90d";
    }
    buckets[bucket][type] = (buckets[bucket][type] || 0) + 1;
  });
  const types = Array.from(new Set(items.map((c) => c.credentialType || "Other"))).sort();
  const datasets = types.map((type) => ({
    label: formatCredentialType(type),
    data: Object.keys(buckets).map((b) => buckets[b][type] || 0),
  }));
  new window.Chart(canvas, {
    type: "bar",
    data: { labels: Object.keys(buckets), datasets },
    options: { responsive: false, scales: { x: { stacked: true }, y: { stacked: true } } },
  });
}

function showRemindersModal(items) {
  const $modal = TemplateUtil.copyTemplate("reminders-modal");
  const $list = $modal.find('[data-id="list"]').addClass("reminders-list");
  if (items.length === 0) {
    $list.append($("<li>").text("No reminders sent in this window."));
  } else {
    items.forEach((r) => {
      const $row = TemplateUtil.copyTemplate("reminder-item").addClass("reminder-item");
      $row.find('[data-id="when"]').addClass("reminder-when").text(new Date(r.sentAt).toLocaleString());
      $row.find('[data-id="recipient"]').addClass("reminder-recipient").text(r.recipientEmail || "");
      $row.find('[data-id="template"]').addClass("reminder-template").text(r.templateName || "");
      $list.append($row);
    });
  }
  function close() {
    $modal.remove();
  }
  $modal.find('[data-id="close"]').on("click", close);
  $modal.find('[data-id="backdrop"]').on("click", close);
  $(document.body).append($modal);
}

if (typeof window !== "undefined") {
  window.createDashboard = createDashboard;
}
