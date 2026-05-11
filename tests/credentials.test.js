import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import { TemplateUtil } from "../js/util.js";
import { createCredentials } from "../js/credentials.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="cred-host"></div>
    <div id="templates" hidden>
      <div data-id="credentials-shell">
        <input data-id="filter-q" />
        <select data-id="filter-status"></select>
        <select data-id="filter-type"></select>
        <select data-id="filter-location"></select>
        <select data-id="filter-provider"></select>
        <div data-id="list-host"></div>
        <div data-id="detail-host"></div>
        <button data-id="prev">Previous</button>
        <span data-id="page-info"></span>
        <button data-id="next">Next</button>
      </div>
      <div data-id="credential-row">
        <span data-id="provider"></span>
        <span data-id="type"></span>
        <span data-id="location"></span>
        <span data-id="expiry"></span>
        <span data-id="badge-host"></span>
      </div>
      <div data-id="credential-detail">
        <h3 data-id="header-title"></h3>
        <span data-id="header-badge"></span>
        <form data-id="form">
          <input data-id="field-type" />
          <input data-id="field-issuer" />
          <input data-id="field-identifier" />
          <input type="date" data-id="field-issued" />
          <input type="date" data-id="field-expires" />
          <textarea data-id="field-notes"></textarea>
          <button type="submit" data-id="save">Save</button>
          <span data-id="form-status"></span>
        </form>
        <ul data-id="documents"></ul>
        <ul data-id="audit"></ul>
      </div>
      <li data-id="document-item">
        <a data-id="link"></a>
        <span data-id="meta"></span>
      </li>
      <li data-id="audit-item">
        <span data-id="when"></span>
        <span data-id="actor"></span>
        <span data-id="action"></span>
      </li>
    </div>
  `;
  TemplateUtil.reset();
});

function fakeApi(overrides = {}) {
  return {
    credentials: {
      list: vi.fn().mockResolvedValue({
        items: [
          {
            id: 1,
            providerName: "Dr. Smith",
            credentialType: "DEA",
            locationName: "Loc A",
            expiresAt: "2026-06-01",
            status: "ACTIVE",
          },
          {
            id: 2,
            providerName: "Dr. Lee",
            credentialType: "STATE_LICENSE",
            locationName: "Loc B",
            expiresAt: "2026-04-01",
            status: "EXPIRED",
          },
        ],
        total: 2,
      }),
      get: vi.fn().mockResolvedValue({
        id: 1,
        providerName: "Dr. Smith",
        credentialType: "DEA",
        issuingAuthority: "DEA",
        identifier: "BX1234567",
        issuedAt: "2024-06-01",
        expiresAt: "2026-06-01",
        notes: "",
        status: "ACTIVE",
      }),
      update: vi.fn().mockResolvedValue({ id: 1 }),
    },
    documents: {
      listForCredential: vi.fn().mockResolvedValue({ items: [] }),
    },
    audit: {
      listForCredential: vi.fn().mockResolvedValue({ items: [] }),
    },
    locations: { list: vi.fn().mockResolvedValue({ items: [] }) },
    providers: { list: vi.fn().mockResolvedValue({ items: [] }) },
    ...overrides,
  };
}

describe("createCredentials", () => {
  it("renders one row per credential returned by the API", async () => {
    const api = fakeApi();
    await createCredentials({ $holder: $("#cred-host"), api });
    expect($("#cred-host .credential-row").length).toBe(2);
  });

  it("debounces the search filter and refetches", async () => {
    vi.useFakeTimers();
    const api = fakeApi();
    await createCredentials({ $holder: $("#cred-host"), api });
    api.credentials.list.mockClear();
    $('#cred-host [data-id="filter-q"]').val("Smith").trigger("input");
    vi.advanceTimersByTime(400);
    await Promise.resolve();
    expect(api.credentials.list).toHaveBeenCalledWith(
      expect.objectContaining({ q: "Smith" }),
    );
    vi.useRealTimers();
  });

  it("loads detail when a row is clicked", async () => {
    const api = fakeApi();
    await createCredentials({ $holder: $("#cred-host"), api });
    $("#cred-host .credential-row").eq(0).trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(api.credentials.get).toHaveBeenCalledWith(1);
    expect($("#cred-host .credential-detail-shell").length).toBe(1);
  });

  it("posts the patch and fires credential:updated on save", async () => {
    const api = fakeApi();
    const handler = vi.fn();
    window.addEventListener("credential:updated", handler);
    await createCredentials({ $holder: $("#cred-host"), api });
    $("#cred-host .credential-row").eq(0).trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    $('#cred-host [data-id="field-notes"]').val("Renewed via portal");
    $('#cred-host [data-id="form"]').trigger("submit");
    await new Promise((r) => setTimeout(r, 0));
    expect(api.credentials.update).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ notes: "Renewed via portal" }),
    );
    expect(handler).toHaveBeenCalled();
  });
});
