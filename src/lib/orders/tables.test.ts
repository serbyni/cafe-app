import { describe, expect, it } from "vitest";
import { spotError } from "@/lib/location/location";
import { groupTables, tooFarDetail, type PublicTable } from "./schema";

const t = (label: string, area: string, free: boolean): PublicTable => ({
  id: label,
  label,
  seats: 2,
  area,
  free,
});

describe("groupTables", () => {
  it("keeps free tables and the current one, grouped by area in database order", () => {
    const g = groupTables(
      [
        t("T1", "Salle", false),
        t("T2", "Salle", true),
        t("B1", "Terrasse", true),
        t("B2", "Terrasse", false),
      ],
      "T1",
    );
    expect(g).toEqual([
      { area: "Salle", tables: [t("T1", "Salle", false), t("T2", "Salle", true)] },
      { area: "Terrasse", tables: [t("B1", "Terrasse", true)] },
    ]);
  });
  it("no current table: only free ones", () => {
    expect(groupTables([t("T1", "Salle", false)], null)).toEqual([]);
  });
});

describe("location errors", () => {
  it("maps the browser's error codes", () => {
    expect(spotError(1)).toBe("denied");
    expect(spotError(2)).toBe("unavailable");
    expect(spotError(3)).toBe("timeout");
  });
  it("reads the too_far detail", () => {
    expect(tooFarDetail('{"radius": 100, "distance": 900}')).toEqual({
      distance: 900,
      radius: 100,
    });
    expect(tooFarDetail(undefined)).toEqual({ distance: 0, radius: 0 });
  });
});
