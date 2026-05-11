import { TemplateUtil } from "./util.js";

const AUDIT_SEARCH_DEBOUNCE_MS = 350;

export async function createAudit({ $holder, api }) {
  const $shell = TemplateUtil.copyTemplate("audit-shell");
  $holder.empty().append($shell);

  const state = {
    cursor: null,
    filters: { actor: "", action: "", from: "", to: "" },
  };

  const $rows = $shell.find('[data-id="rows"]');
  const $loadMore = $shell.find('[data-id="load-more"]');
  const $empty = $shell.find('[data-id="empty"]');
  $loadMore.on("click", () => loadPage(false));

  let actorTimer = null;
  $shell.find('[data-id="filter-actor"]').on("input", function () {
    const value = $(this).val();
    clearTimeout(actorTimer);
    actorTimer = setTimeout(() => {
      state.filters.actor = value;
      reset();
    }, AUDIT_SEARCH_DEBOUNCE_MS);
  });
  [
    ["filter-action", "action"],
    ["filter-from", "from"],
    ["filter-to", "to"],
  ].forEach(([dataId, key]) => {
    $shell.find(`[data-id="${dataId}"]`).on("change", function () {
      state.filters[key] = $(this).val();
      reset();
    });
  });

  await loadPage(true);

  async function reset() {
    state.cursor = null;
    $rows.empty();
    await loadPage(true);
  }

  async function loadPage(initial) {
    const params = { ...state.filters, limit: 50 };
    if (!initial && state.cursor) params.cursor = state.cursor;
    const result = await api.audit.list(params);
    (result.items || []).forEach((row) => {
      const $row = TemplateUtil.copyTemplate("audit-row");
      $row.find('[data-id="when"]').text(new Date(row.createdAt).toLocaleString());
      $row.find('[data-id="actor"]').text(row.actor || "system");
      $row.find('[data-id="action"]').text(row.action || "");
      $row.find('[data-id="credential"]').text(row.credentialId ?? "");
      $row.find('[data-id="detail"]').text(row.detail || "");
      $rows.append($row);
    });
    state.cursor = result.nextCursor || null;
    $loadMore.prop("hidden", !state.cursor);
    $empty.prop("hidden", $rows.children().length > 0);
  }
}

if (typeof window !== "undefined") {
  window.createAudit = createAudit;
}
