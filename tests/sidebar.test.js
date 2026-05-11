import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import { TemplateUtil } from "../js/util.js";
import { createSidebar } from "../js/sidebar.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="sidebar-host"></div>
    <div id="templates" hidden>
      <div data-id="sidebar-shell">
        <div class="sidebar-header">Credentials</div>
        <nav class="sidebar-nav" data-id="nav"></nav>
        <div class="sidebar-footer">
          <span data-id="user-name"></span>
          <button class="btn-link" data-id="logout">Sign out</button>
        </div>
      </div>
      <button class="sidebar-btn" data-id="sidebar-btn">
        <span class="sidebar-btn-label" data-id="label"></span>
        <span class="sidebar-btn-badge" data-id="badge" hidden></span>
      </button>
    </div>
  `;
  TemplateUtil.reset();
});

describe("createSidebar", () => {
  it("renders one button per view", () => {
    createSidebar({
      $holder: $("#sidebar-host"),
      displayName: "Mateus",
      onViewChange: () => {},
      onLogout: () => {},
    });
    expect($("#sidebar-host .sidebar-btn").length).toBe(5);
  });

  it("invokes onViewChange with the view id when a button is clicked", () => {
    const onViewChange = vi.fn();
    createSidebar({
      $holder: $("#sidebar-host"),
      displayName: "Mateus",
      onViewChange,
      onLogout: () => {},
    });
    $("#sidebar-host .sidebar-btn").eq(2).trigger("click");
    expect(onViewChange).toHaveBeenCalledWith("audit");
  });

  it("updates the credentials button badge when credentials:counts fires", () => {
    createSidebar({
      $holder: $("#sidebar-host"),
      displayName: "Mateus",
      onViewChange: () => {},
      onLogout: () => {},
    });
    window.dispatchEvent(
      new CustomEvent("credentials:counts", {
        detail: { expiringSoon: 7 },
      }),
    );
    const $badge = $("#sidebar-host .sidebar-btn")
      .filter((_, el) => $(el).text().includes("Credentials"))
      .find('[data-id="badge"]');
    expect($badge.text()).toBe("7");
    expect($badge.css("display")).not.toBe("none");
  });

  it("hides the badge when expiringSoon is zero", () => {
    createSidebar({
      $holder: $("#sidebar-host"),
      displayName: "Mateus",
      onViewChange: () => {},
      onLogout: () => {},
    });
    window.dispatchEvent(
      new CustomEvent("credentials:counts", {
        detail: { expiringSoon: 0 },
      }),
    );
    const $badge = $("#sidebar-host .sidebar-btn")
      .filter((_, el) => $(el).text().includes("Credentials"))
      .find('[data-id="badge"]');
    expect($badge.css("display")).toBe("none");
  });

  it("invokes onLogout when the footer button is clicked", () => {
    const onLogout = vi.fn();
    createSidebar({
      $holder: $("#sidebar-host"),
      displayName: "Mateus",
      onViewChange: () => {},
      onLogout,
    });
    $('#sidebar-host [data-id="logout"]').trigger("click");
    expect(onLogout).toHaveBeenCalledOnce();
  });
});
