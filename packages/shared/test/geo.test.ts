import { describe, expect, it } from "vitest";
import { directionsUrl, hasOwnPoint, marinaPoint, validPoint, withMarinaPoints } from "../src/geo";
import type { City, Marina } from "../src/types";

const city = { id: "ct-1", name: "San Francisco", countyId: "c-1", lat: 37.77, lng: -122.42 } as City;
const marina = (m: Partial<Marina> = {}): Marina =>
  ({ id: "m-1", name: "Golden Gate", cityId: "ct-1", phone: "", email: "", address: "", status: "active", amenities: [], ...m }) as Marina;

describe("map helpers", () => {
  it("uses the marina's own position, or its city's center", () => {
    expect(marinaPoint(marina({ lat: 37.8, lng: -122.44 }), city)).toEqual({ lat: 37.8, lng: -122.44 });
    expect(marinaPoint(marina(), city)).toEqual({ lat: 37.77, lng: -122.42 });
    expect(marinaPoint(marina())).toBeUndefined();
  });

  it("validates coordinates", () => {
    expect(validPoint(37.8, -122.4)).toBe(true);
    expect(validPoint(91, 0)).toBe(false);
    expect(validPoint(0, -181)).toBe(false);
    expect(validPoint(NaN, 0)).toBe(false);
  });

  it("fills positions for older data from the sample, without overwriting", () => {
    const sample = [marina({ lat: 1, lng: 2 }), marina({ id: "m-2", lat: 3, lng: 4 })];
    const db = { marinas: [marina(), marina({ id: "m-2", lat: 9, lng: 9 }), marina({ id: "m-new" })] };
    const out = withMarinaPoints(db, sample).marinas;
    expect(out[0]).toMatchObject({ lat: 1, lng: 2 });
    expect(out[1]).toMatchObject({ lat: 9, lng: 9 });
    expect(hasOwnPoint(out[2])).toBe(false);
  });

  it("returns the same data when nothing is missing", () => {
    const db = { marinas: [marina({ lat: 1, lng: 2 })] };
    expect(withMarinaPoints(db, [])).toBe(db);
  });

  it("builds a directions link", () => {
    expect(directionsUrl({ lat: 37.8, lng: -122.4 })).toBe("https://www.google.com/maps/dir/?api=1&destination=37.8,-122.4");
  });
});
