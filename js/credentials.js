import { TemplateUtil } from "./util.js";
import { ExpiryBadge, showToast } from "./components.js";
import { formatExpiry, formatCredentialType } from "./format.js";

const PAGE_SIZE = 25;
const SEARCH_DEBOUNCE_MS = 350;

// Mirrors com.parallel26.credentials.model.CredentialType — keep in sync.
const CREDENTIAL_TYPES = [
  { value: "STATE_DENTAL_LICENSE", label: "State Dental License" },
  { value: "DEA_REGISTRATION",     label: "DEA Registration" },
  { value: "BLS_CERTIFICATION",    label: "BLS Certification" },
  { value: "XRAY_REGISTRATION",    label: "X-Ray Registration" },
  { value: "SEDATION_PERMIT",      label: "Sedation Permit" },
  { value: "BIOWASTE_CONTRACT",    label: "Biowaste Contract" },
  { value: "BUSINESS_LICENSE",     label: "Business License" },
  { value: "MALPRACTICE_INSURANCE",label: "Malpractice Insurance" },
  { value: "OTHER",                label: "Other" },
];

export async function createCredentials({ $holder, api }) {
  const $shell = TemplateUtil.copyTemplate("credentials-shell");
  $holder.empty().append($shell);

  const state = {
    page: 0,
    filters: { q: "", status: "", type: "", locationId: "", providerId: "" },
    selectedId: null,
  };

  await populateFilterOptions();
  bindFilterHandlers();
  bindPaginationHandlers();
  await refresh();

  async function populateFilterOptions() {
    const [locations, providers] = await Promise.all([
      api.locations.list({ limit: 200 }),
      api.providers.list({ limit: 500 }),
    ]);
    fillSelect($shell.find('[data-id="filter-location"]'), locations.items, "id", "name");
    fillSelect($shell.find('[data-id="filter-provider"]'), providers.items, "id", "name");
    fillSelect($shell.find('[data-id="filter-type"]'), CREDENTIAL_TYPES, "value", "label");
  }

  function fillSelect($select, items, valueKey, labelKey) {
    items.forEach((item) => {
      $select.append(
        $("<option>").attr("value", item[valueKey]).text(item[labelKey]),
      );
    });
  }

  function bindFilterHandlers() {
    let searchTimer = null;
    $shell.find('[data-id="filter-q"]').on("input", function () {
      const value = $(this).val();
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.filters.q = value;
        state.page = 0;
        refresh();
      }, SEARCH_DEBOUNCE_MS);
    });
    [
      ["filter-status", "status"],
      ["filter-type", "type"],
      ["filter-location", "locationId"],
      ["filter-provider", "providerId"],
    ].forEach(([dataId, key]) => {
      $shell.find(`[data-id="${dataId}"]`).on("change", function () {
        state.filters[key] = $(this).val();
        state.page = 0;
        refresh();
      });
    });
  }

  function bindPaginationHandlers() {
    $shell.find('[data-id="prev"]').on("click", () => {
      if (state.page > 0) {
        state.page -= 1;
        refresh();
      }
    });
    $shell.find('[data-id="next"]').on("click", () => {
      state.page += 1;
      refresh();
    });
  }

  async function refresh() {
    const params = {
      ...state.filters,
      offset: state.page * PAGE_SIZE,
      limit: PAGE_SIZE,
    };
    const result = await api.credentials.list(params);
    renderList(result.items || []);
    renderPageInfo(result.total ?? result.items?.length ?? 0);
  }

  function renderList(items) {
    const $listHost = $shell.find('[data-id="list-host"]');
    $listHost.empty();
    if (items.length === 0) {
      $listHost.append($("<div>").addClass("empty-state").text("No credentials match these filters."));
      return;
    }
    items.forEach((c) => {
      const $row = TemplateUtil.copyTemplate("credential-row");
      $row.addClass("credential-row");
      $row.find('[data-id="provider"]').text(c.providerName || "—");
      $row.find('[data-id="type"]').text(formatCredentialType(c.credentialType) || "—");
      const $location = $row.find('[data-id="location"]');
      if (c.locationName) {
        $location.text(c.locationName).prop("hidden", false);
      }
      $row.find('[data-id="expiry"]').text(formatExpiry(c.expiresAt));
      $row.find('[data-id="badge-host"]').append(ExpiryBadge(c.expiresAt));
      $row.on("click", () => loadDetail(c.id));
      if (c.id === state.selectedId) $row.addClass("selected");
      $listHost.append($row);
    });
  }

  function renderPageInfo(total) {
    const start = state.page * PAGE_SIZE + 1;
    const end = Math.min(total, (state.page + 1) * PAGE_SIZE);
    $shell.find('[data-id="page-info"]').text(`${start}-${end} of ${total}`);
  }

  async function loadDetail(id) {
    state.selectedId = id;
    $shell.find(".credential-row").removeClass("selected");
    const [credential, documents, auditTrail] = await Promise.all([
      api.credentials.get(id),
      api.documents.listForCredential(id).catch(() => ({ items: [] })),
      api.audit.listForCredential(id).catch(() => ({ items: [] })),
    ]);
    renderDetail(credential, documents.items || [], auditTrail.items || []);
  }

  function renderDetail(c, docs, audit) {
    const $detail = TemplateUtil.copyTemplate("credential-detail");
    $detail.addClass("credential-detail-shell");
    const typeLabel = formatCredentialType(c.credentialType);
    $detail.find('[data-id="header-title"]').text(
      [c.providerName, typeLabel].filter(Boolean).join(" — "),
    );
    $detail.find('[data-id="header-badge"]').append(ExpiryBadge(c.expiresAt));

    const $type = $detail.find('[data-id="field-type"]');
    CREDENTIAL_TYPES.forEach((t) => {
      $type.append($("<option>").attr("value", t.value).text(t.label));
    });
    $type.val(c.credentialType || "");

    $detail.find('[data-id="field-issuer"]').val(c.issuingAuthority || "");
    $detail.find('[data-id="field-identifier"]').val(c.identifier || "");
    $detail.find('[data-id="field-issued"]').val(c.issuedAt || "");
    $detail.find('[data-id="field-expires"]').val(c.expiresAt || "");
    $detail.find('[data-id="field-notes"]').val(c.notes || "");

    const $docs = $detail.find('[data-id="documents"]');
    if (docs.length === 0) {
      $docs.append($("<li>").text("No documents."));
    } else {
      docs.forEach((d) => {
        const $row = TemplateUtil.copyTemplate("document-item");
        $row.find('[data-id="link"]').attr("href", d.url || "#").text(d.fileName || "Document");
        $row.find('[data-id="meta"]').text(d.contentType || "");
        $docs.append($row);
      });
    }

    const $auditSection = $detail.find('[data-id="audit-section"]');
    if (audit.length === 0) {
      $auditSection.prop("hidden", true);
    } else {
      $auditSection.prop("hidden", false);
      const $audit = $detail.find('[data-id="audit"]');
      audit.slice(0, 10).forEach((a) => {
        const $row = TemplateUtil.copyTemplate("audit-item");
        $row.find('[data-id="when"]').text(new Date(a.createdAt).toLocaleString());
        $row.find('[data-id="actor"]').text(a.actor || "system");
        $row.find('[data-id="action"]').text(a.action || "");
        $audit.append($row);
      });
    }

    $detail.find('[data-id="cancel"]').on("click", () => {
      loadDetail(c.id);
    });

    $detail.find('[data-id="form"]').on("submit", async (event) => {
      event.preventDefault();
      const patch = {
        credentialType: $detail.find('[data-id="field-type"]').val()?.trim() || null,
        issuingAuthority: $detail.find('[data-id="field-issuer"]').val()?.trim() || null,
        identifier: $detail.find('[data-id="field-identifier"]').val()?.trim() || null,
        issuedAt: $detail.find('[data-id="field-issued"]').val() || null,
        expiresAt: $detail.find('[data-id="field-expires"]').val() || null,
        notes: $detail.find('[data-id="field-notes"]').val() || null,
      };
      const $status = $detail.find('[data-id="form-status"]');
      $status.text("Saving…");
      try {
        await api.credentials.update(c.id, patch);
        $status.text("Saved.");
        showToast("Credential updated", "success");
        window.dispatchEvent(
          new CustomEvent("credential:updated", { detail: { id: c.id } }),
        );
        await refresh();
      } catch (err) {
        $status.text("Save failed.");
        showToast(err?.responseJSON?.message || "Save failed", "error");
      }
    });

    $shell.find('[data-id="detail-host"]').empty().append($detail);
  }
}

if (typeof window !== "undefined") {
  window.createCredentials = createCredentials;
}
