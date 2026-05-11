import { daysUntil } from "./format.js";
import { TemplateUtil } from "./util.js";

export function showToast(message, variant = "info", durationMs = 3000) {
  const $toast = $("<div>")
    .addClass("toast")
    .addClass(`toast-${variant}`)
    .text(message);
  $(document.body).append($toast);
  setTimeout(() => $toast.remove(), durationMs);
}

export function createSpinner() {
  return $("<div>").addClass("spinner");
}

export function createEmptyState({ message, actionLabel, onAction }) {
  const $node = $("<div>").addClass("empty-state");
  $("<div>").addClass("empty-state-message").text(message).appendTo($node);
  if (actionLabel) {
    const $btn = $("<button>")
      .addClass("btn btn-primary")
      .text(actionLabel)
      .on("click", () => {
        if (typeof onAction === "function") onAction();
      });
    $node.append($btn);
  }
  return $node;
}

export function ExpiryBadge(expiryDate, today = new Date().toISOString().slice(0, 10)) {
  const $badge = $("<span>").addClass("badge");
  if (!expiryDate) {
    return $badge.addClass("badge-unknown").text("Unknown");
  }
  const days = daysUntil(expiryDate, today);
  if (days < 0) return $badge.addClass("badge-expired").text("Expired");
  if (days <= 30) return $badge.addClass("badge-warning").text(`Expires in ${days}d`);
  return $badge.addClass("badge-active").text("Active");
}

export function ConfidenceDot(score) {
  const $dot = $("<span>").addClass("confidence-dot");
  if (score == null) return $dot.addClass("dot-unknown");
  if (score >= 0.8) return $dot.addClass("dot-high");
  if (score >= 0.5) return $dot.addClass("dot-medium");
  return $dot.addClass("dot-low");
}

const REVIEW_FIELDS = [
  ["provider", "providerName"],
  ["type", "credentialType"],
  ["issuer", "issuingAuthority"],
  ["identifier", "identifier"],
  ["issued", "issuedAt"],
  ["expires", "expiresAt"],
];

export function createSideBySideReview({
  $holder,
  extracted,
  existing,
  documentText,
  confidence,
  onConfirm,
  onReject,
}) {
  const $shell = TemplateUtil.copyTemplate("review-shell");

  if (confidence != null) {
    $shell.find('[data-id="confidence"]').text(`Confidence: ${(confidence * 100).toFixed(0)}%`);
  }
  $shell.find('[data-id="source-text"]').text(documentText || "");

  REVIEW_FIELDS.forEach(([slug, key]) => {
    const value = extracted?.[key];
    if (value != null) $shell.find(`[data-id="field-${slug}"]`).val(value);
    if (existing && existing[key] != null && existing[key] !== value) {
      $shell.find(`[data-id="diff-${slug}"]`).prop("hidden", false);
    }
  });

  $shell.find('[data-id="confirm"]').on("click", () => {
    const record = {};
    REVIEW_FIELDS.forEach(([slug, key]) => {
      const v = $shell.find(`[data-id="field-${slug}"]`).val();
      record[key] = v === "" ? null : v;
    });
    if (typeof onConfirm === "function") onConfirm(record);
  });

  $shell.find('[data-id="reject"]').on("click", () => {
    const reason = $shell.find('[data-id="reject-reason"]').val()?.trim() || "";
    if (typeof onReject === "function") onReject(reason);
  });

  $holder.empty().append($shell);
  return { $shell };
}

if (typeof window !== "undefined") {
  window.createSideBySideReview = createSideBySideReview;
}
