import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import { TemplateUtil } from "../js/util.js";
import { createDashboard } from "../js/dashboard.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="dashboard-host"></div>
    <div id="templates" hidden>
      <div data-id="dashboard-shell">
        <div class="dashboard-cards" data-id="cards"></div>
        <canvas data-id="expiry-chart"></canvas>
        <button class="btn-link" data-id="show-reminders">Recent reminders</button>
      </div>
      <div data-id="dashboard-card">
        <div class="dashboard-card-label" data-id="label"></div>
        <div class="dashboard-card-value" data-id="value"></div>
      </div>
      <div data-id="reminders-modal">
        <div class="modal-backdrop" data-id="backdrop"></div>
        <button class="btn-link" data-id="close">Close</button>
        <ul data-id="list"></ul>
      </div>
      <li data-id="reminder-item">
        <div data-id="when"></div>
        <div data-id="recipient"></div>
        <div data-id="template"></div>
      </li>
    </div>
  `;
  TemplateUtil.reset();
  global.Chart = vi.fn().mockImplementation(() => ({ destroy: vi.fn() }));
});

function fakeApi(overrides = {}) {
  return {
    credentials: {
      list: vi.fn().mockResolvedValue({
        items: [
          { id: 1, expiresAt: "2026-05-20", credentialType: "DEA", status: "ACTIVE" },
          { id: 2, expiresAt: "2026-05-01", credentialType: "DEA", status: "EXPIRED" },
          { id: 3, expiresAt: "2027-01-01", credentialType: "STATE_LICENSE", status: "ACTIVE" },
        ],
      }),
    },
    reminders: {
      recent: vi.fn().mockResolvedValue({ items: [] }),
    },
    ...overrides,
  };
}

describe("createDashboard", () => {
  it("renders the four summary cards from the credential list", async () => {
    const api = fakeApi();
    await createDashboard({ $holder: $("#dashboard-host"), api, today: "2026-05-06" });
    const labels = $("#dashboard-host .dashboard-card-label")
      .map((_, el) => $(el).text())
      .get();
    expect(labels).toEqual(
      expect.arrayContaining(["Total", "Expiring (30d)", "Expired", "Reminders today"]),
    );
  });

  it("fires credentials:counts with the expiring-soon count", async () => {
    const api = fakeApi();
    const handler = vi.fn();
    window.addEventListener("credentials:counts", handler);
    await createDashboard({ $holder: $("#dashboard-host"), api, today: "2026-05-06" });
    expect(handler).toHaveBeenCalled();
    const detail = handler.mock.calls[0][0].detail;
    expect(detail.expiringSoon).toBe(1);
  });

  it("instantiates a Chart.js bar chart on the canvas", async () => {
    const api = fakeApi();
    await createDashboard({ $holder: $("#dashboard-host"), api, today: "2026-05-06" });
    expect(global.Chart).toHaveBeenCalled();
    const config = global.Chart.mock.calls[0][1];
    expect(config.type).toBe("bar");
  });

  it("opens the reminders modal and lists items returned by the API", async () => {
    const api = fakeApi({
      reminders: {
        recent: vi.fn().mockResolvedValue({
          items: [
            {
              id: 1,
              recipientEmail: "ops@x.com",
              sentAt: "2026-05-05T10:00:00Z",
              templateName: "expiry-30d",
            },
          ],
        }),
      },
    });
    await createDashboard({ $holder: $("#dashboard-host"), api, today: "2026-05-06" });
    $('#dashboard-host [data-id="show-reminders"]').trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(api.reminders.recent).toHaveBeenCalledWith(7);
    expect($("body .reminders-list .reminder-item").length).toBe(1);
    expect($("body .reminders-list .reminder-recipient").text()).toBe("ops@x.com");
  });
});
