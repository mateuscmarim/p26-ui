import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import { TemplateUtil } from "../js/util.js";
import { createSideBySideReview } from "../js/components.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="review-host"></div>
    <div id="templates" hidden>
      <div data-id="review-shell">
        <span data-id="confidence"></span>
        <pre data-id="source-text"></pre>
        <form data-id="form">
          <input data-id="field-provider" />
          <span data-id="diff-provider" hidden></span>
          <input data-id="field-type" />
          <span data-id="diff-type" hidden></span>
          <input data-id="field-issuer" />
          <span data-id="diff-issuer" hidden></span>
          <input data-id="field-identifier" />
          <span data-id="diff-identifier" hidden></span>
          <input type="date" data-id="field-issued" />
          <span data-id="diff-issued" hidden></span>
          <input type="date" data-id="field-expires" />
          <span data-id="diff-expires" hidden></span>
        </form>
        <button data-id="confirm">Confirm</button>
        <button data-id="reject">Reject</button>
        <input data-id="reject-reason" />
      </div>
    </div>
  `;
  TemplateUtil.reset();
});

describe("createSideBySideReview", () => {
  it("populates the form with extracted values", () => {
    createSideBySideReview({
      $holder: $("#review-host"),
      extracted: {
        providerName: "Dr. A",
        credentialType: "DEA",
        issuingAuthority: "DEA",
        identifier: "BX1",
        issuedAt: "2024-01-01",
        expiresAt: "2026-01-01",
      },
      existing: null,
      documentText: "Doc text",
      confidence: 0.92,
      onConfirm: () => {},
      onReject: () => {},
    });
    expect($('#review-host [data-id="field-provider"]').val()).toBe("Dr. A");
    expect($('#review-host [data-id="source-text"]').text()).toBe("Doc text");
  });

  it("flags diffs when extracted differs from existing", () => {
    createSideBySideReview({
      $holder: $("#review-host"),
      extracted: { providerName: "Dr. A", credentialType: "DEA" },
      existing: { providerName: "Dr. A", credentialType: "STATE_LICENSE" },
      documentText: "",
      onConfirm: () => {},
      onReject: () => {},
    });
    expect($('#review-host [data-id="diff-provider"]').prop("hidden")).toBe(true);
    expect($('#review-host [data-id="diff-type"]').prop("hidden")).toBe(false);
  });

  it("invokes onConfirm with the current form values", () => {
    const onConfirm = vi.fn();
    createSideBySideReview({
      $holder: $("#review-host"),
      extracted: { providerName: "Dr. A" },
      existing: null,
      documentText: "",
      onConfirm,
      onReject: () => {},
    });
    $('#review-host [data-id="field-identifier"]').val("BX9");
    $('#review-host [data-id="confirm"]').trigger("click");
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ providerName: "Dr. A", identifier: "BX9" }),
    );
  });

  it("invokes onReject with the reason", () => {
    const onReject = vi.fn();
    createSideBySideReview({
      $holder: $("#review-host"),
      extracted: {},
      existing: null,
      documentText: "",
      onConfirm: () => {},
      onReject,
    });
    $('#review-host [data-id="reject-reason"]').val("Not a credential doc");
    $('#review-host [data-id="reject"]').trigger("click");
    expect(onReject).toHaveBeenCalledWith("Not a credential doc");
  });
});
