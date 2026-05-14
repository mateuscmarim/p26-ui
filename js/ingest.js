import { TemplateUtil } from "./util.js";
import { createSideBySideReview, showToast } from "./components.js";

const DEFAULT_POLL_MS = 2000;
const TERMINAL_STATUSES = new Set(["READY", "FAILED"]);

export function createIngest({ $holder, api, pollIntervalMs }) {
  const intervalMs = pollIntervalMs || DEFAULT_POLL_MS;
  const $shell = TemplateUtil.copyTemplate("ingest-shell");
  $holder.empty().append($shell);

  const $dropzone = $shell.find('[data-id="dropzone"]');
  const $input = $shell.find('[data-id="file-input"]');
  const $strip = $shell.find('[data-id="status-strip"]');
  const $statusText = $shell.find('[data-id="status-text"]');
  const $reviewHost = $shell.find('[data-id="review-host"]');

  let providersCache = null;
  async function loadProviders() {
    if (providersCache) return providersCache;
    try {
      const result = await api.providers.list({ limit: 500 });
      providersCache = result.items || [];
    } catch (err) {
      providersCache = [];
      showToast("Could not load CareStack providers", "error");
    }
    return providersCache;
  }

  $input.on("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) await handleFile(file);
  });

  $dropzone.on("dragover", (event) => {
    event.preventDefault();
    $dropzone.addClass("drag-over");
  });
  $dropzone.on("dragleave", () => $dropzone.removeClass("drag-over"));
  $dropzone.on("drop", async (event) => {
    event.preventDefault();
    $dropzone.removeClass("drag-over");
    const file = event.originalEvent?.dataTransfer?.files?.[0];
    if (file) await handleFile(file);
  });

  async function handleFile(file) {
    $reviewHost.empty();
    $strip.prop("hidden", false);
    $statusText.text(`Uploading ${file.name}…`);
    try {
      const { batchId } = await api.ingest.upload(file);
      await pollUntilReady(batchId);
    } catch (err) {
      $statusText.text("Upload failed.");
      showToast(err?.responseJSON?.message || "Upload failed", "error");
    }
  }

  async function pollUntilReady(batchId) {
    while (true) {
      const result = await api.ingest.status(batchId);
      $statusText.text(`Status: ${result.status}`);
      if (TERMINAL_STATUSES.has(result.status)) {
        if (result.status === "FAILED") {
          showToast(result.error || "Extraction failed", "error");
          return;
        }
        await renderItems(result.items || []);
        return;
      }
      await sleep(intervalMs);
    }
  }

  async function renderItems(items) {
    $reviewHost.empty();
    if (items.length === 0) {
      $reviewHost.append($("<div>").addClass("empty-state").text("No items to review."));
      return;
    }
    const providers = await loadProviders();
    items.forEach((item) => {
      const $slot = $("<div>").addClass("ingest-review-slot");
      $reviewHost.append($slot);
      createSideBySideReview({
        $holder: $slot,
        extracted: item.extracted,
        existing: item.existing,
        documentText: item.documentText,
        confidence: item.confidence,
        providers,
        onConfirm: async (record) => {
          try {
            await api.ingest.confirm(item.itemId, record);
            $slot.empty().append($("<div>").addClass("ingest-done").text("Confirmed."));
            window.dispatchEvent(
              new CustomEvent("credential:created", { detail: { itemId: item.itemId } }),
            );
          } catch (err) {
            showToast(err?.responseJSON?.message || "Confirm failed", "error");
          }
        },
        onReject: async (reason) => {
          try {
            await api.ingest.reject(item.itemId, reason);
            $slot.empty().append($("<div>").addClass("ingest-done").text("Rejected."));
          } catch (err) {
            showToast(err?.responseJSON?.message || "Reject failed", "error");
          }
        },
      });
    });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (typeof window !== "undefined") {
  window.createIngest = createIngest;
}
