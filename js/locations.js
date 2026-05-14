import { TemplateUtil } from "./util.js";
import { showToast } from "./components.js";

/**
 * Read-only Locations & Providers view. Add/edit/delete controls are kept
 * visible but disabled — the data is sourced from the CareStack ETL.
 */
export async function createLocationsAndProviders({ $holder, api }) {
  const $shell = TemplateUtil.copyTemplate("locations-shell");
  $holder.empty().append($shell);

  await Promise.all([refreshList("locations"), refreshList("providers")]);

  // Add buttons are disabled in markup, but guard against any future
  // re-enable accidentally wiring a create flow.
  $shell.find('[data-id="add-location"]').on("click", (event) => event.preventDefault());
  $shell.find('[data-id="add-provider"]').on("click", (event) => event.preventDefault());

  async function refreshList(kind) {
    const $list = $shell.find(`[data-id="${kind}-list"]`);
    $list.empty();
    const result = await api[kind].list({ limit: 200 });
    (result.items || []).forEach((entry) => {
      const $row = TemplateUtil.copyTemplate("locations-row");
      const label = entry.name || `#${entry.id}`;
      $row.find('[data-id="name"]').text(label).on("click", () => loadDetail(kind, entry.id));
      // Delete is disabled in markup; keep a no-op handler so any stray
      // event doesn't bubble up to the row's click handler.
      $row.find('[data-id="delete"]').on("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
      });
      $list.append($row);
    });
  }

  async function loadDetail(kind, id) {
    const entry = await api[kind].get(id);
    renderForm(kind, entry);
  }

  function renderForm(kind, entry) {
    const $form = TemplateUtil.copyTemplate("locations-form");
    const label = kind === "locations" ? "location" : "provider";
    $form.find('[data-id="form-title"]').text(`View ${label}`);
    if (entry) {
      $form.find('[data-id="field-name"]').val(entry.name || "");
      $form.find('[data-id="field-external-id"]').val(entry.externalId || "");
    }
    // Form fields are readonly and the save button is disabled in markup.
    // Block any submit (e.g. Enter inside an input) just in case.
    $form.on("submit", (event) => {
      event.preventDefault();
      showToast("Read-only — sourced from CareStack ETL", "info");
    });
    $shell.find('[data-id="detail-host"]').empty().append($form);
  }
}

if (typeof window !== "undefined") {
  window.createLocationsAndProviders = createLocationsAndProviders;
}
