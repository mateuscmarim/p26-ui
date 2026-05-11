import { TemplateUtil } from "./util.js";
import { showToast } from "./components.js";

export async function createLocationsAndProviders({ $holder, api }) {
  const $shell = TemplateUtil.copyTemplate("locations-shell");
  $holder.empty().append($shell);

  await Promise.all([refreshList("locations"), refreshList("providers")]);

  $shell.find('[data-id="add-location"]').on("click", () => renderForm("locations", null));
  $shell.find('[data-id="add-provider"]').on("click", () => renderForm("providers", null));

  async function refreshList(kind) {
    const $list = $shell.find(`[data-id="${kind}-list"]`);
    $list.empty();
    const result = await api[kind].list({ limit: 200 });
    (result.items || []).forEach((entry) => {
      const $row = TemplateUtil.copyTemplate("locations-row");
      const label = entry.name || `#${entry.id}`;
      $row.find('[data-id="name"]').text(label).on("click", () => loadDetail(kind, entry.id));
      $row.find('[data-id="delete"]').on("click", async (event) => {
        event.stopPropagation();
        const noun = kind === "locations" ? "location" : "provider";
        if (!window.confirm(`Delete ${noun} "${label}"? This cannot be undone.`)) return;
        try {
          await api[kind].remove(entry.id);
          showToast("Deleted", "success");
          await refreshList(kind);
          resetDetail();
        } catch (err) {
          showToast(err?.responseJSON?.message || "Delete failed", "error");
        }
      });
      $list.append($row);
    });
  }

  async function loadDetail(kind, id) {
    const entry = await api[kind].get(id);
    renderForm(kind, entry);
  }

  function resetDetail() {
    $shell.find('[data-id="detail-host"]').empty().append(
      $("<div>").addClass("empty-state").text("Select a location or provider to edit, or add a new one."),
    );
  }

  function renderForm(kind, entry) {
    const $form = TemplateUtil.copyTemplate("locations-form");
    const isNew = entry == null;
    const label = kind === "locations" ? "location" : "provider";
    $form.find('[data-id="form-title"]').text(`${isNew ? "New" : "Edit"} ${label}`);
    if (entry) {
      $form.find('[data-id="field-name"]').val(entry.name || "");
      $form.find('[data-id="field-external-id"]').val(entry.externalId || "");
    }
    $form.on("submit", async (event) => {
      event.preventDefault();
      const payload = {
        name: $form.find('[data-id="field-name"]').val()?.trim() || "",
        externalId: $form.find('[data-id="field-external-id"]').val()?.trim() || null,
      };
      const $status = $form.find('[data-id="form-status"]');
      $status.text("Saving…");
      try {
        if (isNew) {
          await api[kind].create(payload);
        } else {
          await api[kind].update(entry.id, payload);
        }
        $status.text("Saved.");
        showToast("Saved", "success");
        await refreshList(kind);
      } catch (err) {
        $status.text("Save failed.");
        showToast(err?.responseJSON?.message || "Save failed", "error");
      }
    });
    $shell.find('[data-id="detail-host"]').empty().append($form);
  }
}

if (typeof window !== "undefined") {
  window.createLocationsAndProviders = createLocationsAndProviders;
}
