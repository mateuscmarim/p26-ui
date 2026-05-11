import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import { TemplateUtil } from "../js/util.js";
import { createIngest } from "../js/ingest.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="ingest-host"></div>
    <div id="templates" hidden>
      <div data-id="ingest-shell">
        <div data-id="dropzone">
          <input type="file" data-id="file-input" />
        </div>
        <div data-id="status-strip" hidden>
          <span data-id="status-text"></span>
        </div>
        <div data-id="review-host"></div>
      </div>
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

function fakeApi(overrides = {}) {
  return {
    ingest: {
      upload: vi.fn().mockResolvedValue({ batchId: "B1" }),
      status: vi.fn(),
      confirm: vi.fn().mockResolvedValue({}),
      reject: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

describe("createIngest", () => {
  it("uploads the chosen file and shows the status strip", async () => {
    const api = fakeApi();
    api.ingest.status.mockResolvedValue({ status: "READY", items: [] });
    createIngest({ $holder: $("#ingest-host"), api, pollIntervalMs: 1 });

    const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
    const $input = $('#ingest-host [data-id="file-input"]');
    Object.defineProperty($input[0], "files", { value: [file] });
    $input.trigger("change");

    await new Promise((r) => setTimeout(r, 20));
    expect(api.ingest.upload).toHaveBeenCalledWith(file);
    expect($('#ingest-host [data-id="status-strip"]').prop("hidden")).toBe(false);
  });

  it("renders a SideBySideReview per ready item", async () => {
    const api = fakeApi();
    api.ingest.status.mockResolvedValue({
      status: "READY",
      items: [
        {
          itemId: "I1",
          extracted: { providerName: "Dr. A", credentialType: "DEA" },
          existing: null,
          documentText: "txt",
          confidence: 0.91,
        },
      ],
    });
    createIngest({ $holder: $("#ingest-host"), api, pollIntervalMs: 1 });

    const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
    const $input = $('#ingest-host [data-id="file-input"]');
    Object.defineProperty($input[0], "files", { value: [file] });
    $input.trigger("change");

    await new Promise((r) => setTimeout(r, 20));
    expect($('#ingest-host [data-id="review-host"] [data-id="form"]').length).toBe(1);
  });

  it("calls api.ingest.confirm with the form record", async () => {
    const api = fakeApi();
    api.ingest.status.mockResolvedValue({
      status: "READY",
      items: [
        {
          itemId: "I1",
          extracted: { providerName: "Dr. A" },
          existing: null,
          documentText: "",
          confidence: 0.5,
        },
      ],
    });
    createIngest({ $holder: $("#ingest-host"), api, pollIntervalMs: 1 });
    const file = new File(["pdf"], "doc.pdf", { type: "application/pdf" });
    const $input = $('#ingest-host [data-id="file-input"]');
    Object.defineProperty($input[0], "files", { value: [file] });
    $input.trigger("change");
    await new Promise((r) => setTimeout(r, 20));

    $('#ingest-host [data-id="confirm"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(api.ingest.confirm).toHaveBeenCalledWith(
      "I1",
      expect.objectContaining({ providerName: "Dr. A" }),
    );
  });
});
