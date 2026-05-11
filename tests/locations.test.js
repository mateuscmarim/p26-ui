import { describe, it, expect, beforeEach, vi } from "vitest";
import $ from "jquery";
global.$ = $;
global.jQuery = $;

import { TemplateUtil } from "../js/util.js";
import { createLocationsAndProviders } from "../js/locations.js";

beforeEach(() => {
  document.body.innerHTML = `
    <div id="loc-host"></div>
    <div id="templates" hidden>
      <div data-id="locations-shell">
        <button data-id="add-location">+ Add</button>
        <button data-id="add-provider">+ Add</button>
        <ul data-id="locations-list"></ul>
        <ul data-id="providers-list"></ul>
        <section data-id="detail-host"></section>
      </div>
      <li data-id="locations-row"><span data-id="name"></span></li>
      <form data-id="locations-form">
        <h3 data-id="form-title"></h3>
        <input data-id="field-name" />
        <input data-id="field-external-id" />
        <button type="submit" data-id="save">Save</button>
        <span data-id="form-status"></span>
      </form>
    </div>
  `;
  TemplateUtil.reset();
});

function fakeApi(overrides = {}) {
  return {
    locations: {
      list: vi.fn().mockResolvedValue({
        items: [{ id: 10, name: "Loc A", externalId: "EXT-A" }],
      }),
      get: vi.fn().mockResolvedValue({ id: 10, name: "Loc A", externalId: "EXT-A" }),
      create: vi.fn().mockResolvedValue({ id: 99 }),
      update: vi.fn().mockResolvedValue({}),
    },
    providers: {
      list: vi.fn().mockResolvedValue({
        items: [{ id: 20, name: "Dr. Lee", externalId: "EXT-L" }],
      }),
      get: vi.fn().mockResolvedValue({ id: 20, name: "Dr. Lee", externalId: "EXT-L" }),
      create: vi.fn().mockResolvedValue({ id: 100 }),
      update: vi.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
}

describe("createLocationsAndProviders", () => {
  it("renders one row per location and per provider", async () => {
    const api = fakeApi();
    await createLocationsAndProviders({ $holder: $("#loc-host"), api });
    expect($('#loc-host [data-id="locations-list"] li').length).toBe(1);
    expect($('#loc-host [data-id="providers-list"] li').length).toBe(1);
  });

  it("loads the location form when a location row is clicked", async () => {
    const api = fakeApi();
    await createLocationsAndProviders({ $holder: $("#loc-host"), api });
    $('#loc-host [data-id="locations-list"] li').first().trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    expect(api.locations.get).toHaveBeenCalledWith(10);
    expect($('#loc-host [data-id="form-title"]').text()).toBe("Edit location");
    expect($('#loc-host [data-id="field-name"]').val()).toBe("Loc A");
  });

  it("calls update when an existing entry is saved", async () => {
    const api = fakeApi();
    await createLocationsAndProviders({ $holder: $("#loc-host"), api });
    $('#loc-host [data-id="providers-list"] li').first().trigger("click");
    await new Promise((r) => setTimeout(r, 0));
    $('#loc-host [data-id="field-name"]').val("Dr. Leigh");
    $('#loc-host [data-id="locations-form"]').trigger("submit");
    await new Promise((r) => setTimeout(r, 0));
    expect(api.providers.update).toHaveBeenCalledWith(
      20,
      expect.objectContaining({ name: "Dr. Leigh" }),
    );
  });

  it("calls create when the new-location button is clicked then saved", async () => {
    const api = fakeApi();
    await createLocationsAndProviders({ $holder: $("#loc-host"), api });
    $('#loc-host [data-id="add-location"]').trigger("click");
    $('#loc-host [data-id="field-name"]').val("Loc B");
    $('#loc-host [data-id="locations-form"]').trigger("submit");
    await new Promise((r) => setTimeout(r, 0));
    expect(api.locations.create).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Loc B" }),
    );
  });
});
