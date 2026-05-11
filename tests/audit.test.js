import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import { TemplateUtil } from "../js/util.js";
import { createAudit } from "../js/audit.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="audit-host"></div>
    <div id="templates" hidden>
      <div data-id="audit-shell">
        <input data-id="filter-actor" />
        <select data-id="filter-action"></select>
        <input type="date" data-id="filter-from" />
        <input type="date" data-id="filter-to" />
        <table><tbody data-id="rows"></tbody></table>
        <button data-id="load-more">Load more</button>
      </div>
      <table><tbody><tr data-id="audit-row">
        <td data-id="when"></td>
        <td data-id="actor"></td>
        <td data-id="action"></td>
        <td data-id="credential"></td>
        <td data-id="detail"></td>
      </tr></tbody></table>
    </div>
  `;
  TemplateUtil.reset();
});

function fakeApi() {
  return {
    audit: {
      list: vi
        .fn()
        .mockResolvedValueOnce({
          items: [
            {
              id: 1,
              actor: "mateus",
              action: "UPDATE",
              credentialId: 42,
              createdAt: "2026-05-05T10:00:00Z",
              detail: "notes changed",
            },
          ],
          nextCursor: "c1",
        })
        .mockResolvedValueOnce({
          items: [
            {
              id: 2,
              actor: "system",
              action: "REMINDER_SENT",
              credentialId: 42,
              createdAt: "2026-05-04T09:00:00Z",
              detail: "30d reminder",
            },
          ],
          nextCursor: null,
        }),
    },
  };
}

describe("createAudit", () => {
  it("renders rows from the first page", async () => {
    const api = fakeApi();
    await createAudit({ $holder: $("#audit-host"), api });
    expect($("#audit-host tbody tr").length).toBe(1);
    expect($("#audit-host tbody tr").first().find('[data-id="actor"]').text()).toBe("mateus");
  });

  it("appends rows when 'Load more' is clicked and hides the button when no more pages", async () => {
    const api = fakeApi();
    await createAudit({ $holder: $("#audit-host"), api });
    $('#audit-host [data-id="load-more"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect($("#audit-host tbody tr").length).toBe(2);
    expect($('#audit-host [data-id="load-more"]').prop("hidden")).toBe(true);
  });

  it("sends filter params to the API on filter change", async () => {
    vi.useFakeTimers();
    const api = fakeApi();
    await createAudit({ $holder: $("#audit-host"), api });
    api.audit.list.mockClear();
    api.audit.list.mockResolvedValue({ items: [], nextCursor: null });
    $('#audit-host [data-id="filter-actor"]').val("mateus").trigger("input");
    vi.advanceTimersByTime(400);
    await Promise.resolve();
    expect(api.audit.list).toHaveBeenCalledWith(
      expect.objectContaining({ actor: "mateus" }),
    );
    vi.useRealTimers();
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("production index.html templates", () => {
  it("places audit-row inside a <table> so the parser preserves it", () => {
    const html = readFileSync(
      resolve(__dirname, "..", "index.html"),
      "utf8",
    );
    document.body.innerHTML = html;
    const tpl = document.querySelector('#templates [data-id="audit-row"]');
    expect(tpl).not.toBeNull();
    expect(tpl?.tagName.toLowerCase()).toBe("tr");
  });
});
