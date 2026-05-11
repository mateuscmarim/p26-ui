import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import {
  showToast,
  createSpinner,
  createEmptyState,
  ExpiryBadge,
  ConfidenceDot,
} from "../js/components.js";

describe("showToast", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    vi.useFakeTimers();
  });

  it("appends a toast element with the message", () => {
    showToast("Saved");
    const $toast = $(document.body).find(".toast");
    expect($toast.length).toBe(1);
    expect($toast.text()).toBe("Saved");
  });

  it("applies the variant class", () => {
    showToast("Boom", "error");
    expect($(document.body).find(".toast").hasClass("toast-error")).toBe(true);
  });

  it("removes itself after the timeout", () => {
    showToast("Bye", "info", 1000);
    vi.advanceTimersByTime(1500);
    expect($(document.body).find(".toast").length).toBe(0);
  });
});

describe("createSpinner", () => {
  it("returns a jQuery node with the spinner class", () => {
    const $node = createSpinner();
    expect($node.hasClass("spinner")).toBe(true);
  });
});

describe("createEmptyState", () => {
  it("renders the message and optional action label", () => {
    const $node = createEmptyState({
      message: "Nothing here",
      actionLabel: "Add one",
      onAction: () => {},
    });
    expect($node.find(".empty-state-message").text()).toBe("Nothing here");
    expect($node.find("button").text()).toBe("Add one");
  });

  it("invokes onAction when the action button is clicked", () => {
    const onAction = vi.fn();
    const $node = createEmptyState({
      message: "x",
      actionLabel: "Go",
      onAction,
    });
    $node.find("button").trigger("click");
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("omits the button when no actionLabel is provided", () => {
    const $node = createEmptyState({ message: "x" });
    expect($node.find("button").length).toBe(0);
  });
});

describe("ExpiryBadge", () => {
  it("renders 'Expired' for past dates", () => {
    const $node = ExpiryBadge("2026-01-01", "2026-05-06");
    expect($node.hasClass("badge-expired")).toBe(true);
    expect($node.text()).toMatch(/expired/i);
  });

  it("renders 'Expiring soon' for dates within 30 days", () => {
    const $node = ExpiryBadge("2026-05-20", "2026-05-06");
    expect($node.hasClass("badge-warning")).toBe(true);
  });

  it("renders 'Active' for far-future dates", () => {
    const $node = ExpiryBadge("2027-05-06", "2026-05-06");
    expect($node.hasClass("badge-active")).toBe(true);
  });

  it("renders 'Unknown' when the date is null", () => {
    const $node = ExpiryBadge(null, "2026-05-06");
    expect($node.hasClass("badge-unknown")).toBe(true);
  });
});

describe("ConfidenceDot", () => {
  it("colors green for >= 0.8", () => {
    expect(ConfidenceDot(0.85).hasClass("dot-high")).toBe(true);
  });

  it("colors yellow for 0.5-0.79", () => {
    expect(ConfidenceDot(0.65).hasClass("dot-medium")).toBe(true);
  });

  it("colors red for < 0.5", () => {
    expect(ConfidenceDot(0.2).hasClass("dot-low")).toBe(true);
  });

  it("colors gray for null", () => {
    expect(ConfidenceDot(null).hasClass("dot-unknown")).toBe(true);
  });
});
