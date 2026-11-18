import { describe, expect, it } from "vitest";
import {
  LEARNING_PATH,
  TRACKS,
  formatLabRange,
  nextLabId,
  previousLabId,
  trackOfLab,
} from "../../client/src/labs/tracks.js";

const ALL_LAB_IDS = Array.from(
  { length: 20 },
  (_, i) => `lab${String(i + 1).padStart(2, "0")}`,
);

describe("learning tracks", () => {
  it("tracks.areFour.numberedOneToFour", () => {
    expect(TRACKS.map((t) => t.number)).toEqual([1, 2, 3, 4]);
    expect(TRACKS.map((t) => t.id)).toEqual([
      "track1",
      "track2",
      "track3",
      "track4",
    ]);
  });

  it("tracks.everyLab01To20.appearsInExactlyOneTrack", () => {
    const placed = TRACKS.flatMap((t) => [...t.labIds]);

    expect([...placed].sort()).toEqual(ALL_LAB_IDS);
  });

  it("tracks.groupLabsAsTheReadmeDoes", () => {
    expect(TRACKS.map((t) => [...t.labIds])).toEqual([
      ["lab01", "lab02", "lab03", "lab04", "lab05", "lab06", "lab07"],
      ["lab08", "lab09", "lab10", "lab12", "lab15"],
      ["lab11", "lab13", "lab14", "lab16"],
      ["lab17", "lab18", "lab19", "lab20"],
    ]);
  });

  it("tracks.titles.matchTheReadmeHeadings", () => {
    expect(TRACKS.map((t) => t.title)).toEqual([
      "Core Customizations & Guardrails",
      "Cloud Agents, Memory & Context Engineering",
      "Multi-Agent Orchestration, A2A & Extensions",
      "Enterprise Governance, Spec-Driven Delivery & FinOps",
    ]);
  });

  it("tracks.everyTrack.hasASummarySentence", () => {
    for (const track of TRACKS) {
      expect(track.summary.length, `${track.id} summary`).toBeGreaterThan(40);
    }
  });
});

describe("learning path", () => {
  it("learningPath.followsTrackOrderNotNumericOrder", () => {
    expect(LEARNING_PATH).toEqual([
      "lab01",
      "lab02",
      "lab03",
      "lab04",
      "lab05",
      "lab06",
      "lab07",
      "lab08",
      "lab09",
      "lab10",
      "lab12",
      "lab15",
      "lab11",
      "lab13",
      "lab14",
      "lab16",
      "lab17",
      "lab18",
      "lab19",
      "lab20",
    ]);
  });

  it("nextLabId.insideATrack.isTheFollowingLab", () => {
    expect(nextLabId("lab03")).toBe("lab04");
  });

  it("nextLabId.endOfTrackOne.opensTrackTwo", () => {
    expect(nextLabId("lab07")).toBe("lab08");
  });

  it("nextLabId.skipsLabsThatBelongToAnotherTrack", () => {
    // Lab 11 lives in track 3, so track 2 goes 10 -> 12 -> 15, then crosses over.
    expect(nextLabId("lab10")).toBe("lab12");
    expect(nextLabId("lab15")).toBe("lab11");
    expect(nextLabId("lab14")).toBe("lab16");
  });

  it("nextLabId.lastLab.isUndefined", () => {
    expect(nextLabId("lab20")).toBeUndefined();
  });

  it("previousLabId.mirrorsNextLabId", () => {
    for (const id of LEARNING_PATH) {
      const next = nextLabId(id);
      if (next !== undefined) expect(previousLabId(next)).toBe(id);
    }
  });

  it("previousLabId.firstLab.isUndefined", () => {
    expect(previousLabId("lab01")).toBeUndefined();
  });

  it("nextLabId.unknownLab.isUndefined", () => {
    expect(nextLabId("lab99")).toBeUndefined();
  });
});

describe("track lookup", () => {
  it("trackOfLab.eachLab.returnsItsTrack", () => {
    expect(trackOfLab("lab05")?.number).toBe(1);
    expect(trackOfLab("lab12")?.number).toBe(2);
    expect(trackOfLab("lab16")?.number).toBe(3);
    expect(trackOfLab("lab20")?.number).toBe(4);
  });

  it("trackOfLab.unknownLab.isUndefined", () => {
    expect(trackOfLab("lab99")).toBeUndefined();
  });
});

describe("lab range labels", () => {
  it("formatLabRange.contiguousRun.usesAnEnDash", () => {
    expect(formatLabRange(["lab01", "lab02", "lab03", "lab04"])).toBe("01–04");
  });

  it("formatLabRange.gaps.listsEachRun", () => {
    expect(formatLabRange(["lab08", "lab09", "lab10", "lab12", "lab15"])).toBe(
      "08–10, 12, 15",
    );
    expect(formatLabRange(["lab11", "lab13", "lab14", "lab16"])).toBe(
      "11, 13–14, 16",
    );
  });

  it("formatLabRange.singleLab.hasNoDash", () => {
    expect(formatLabRange(["lab11"])).toBe("11");
  });

  it("formatLabRange.unsortedInput.isSortedFirst", () => {
    expect(formatLabRange(["lab04", "lab02", "lab03"])).toBe("02–04");
  });

  it("formatLabRange.noLabs.isEmpty", () => {
    expect(formatLabRange([])).toBe("");
  });
});
