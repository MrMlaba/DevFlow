import { cn, formatDuration, formatRelativeTime, initials } from "@/lib/utils";
import { slugify } from "@/lib/slug";

describe("initials", () => {
  it("takes the first and last initial for a full name", () => {
    expect(initials("Ada Lovelace")).toBe("AL");
  });

  it("uses a single initial for a one-word name", () => {
    expect(initials("Cher")).toBe("C");
  });

  it("falls back to an email when there's no name", () => {
    expect(initials("ada@example.com")).toBe("A");
  });

  it("returns a placeholder for an empty string", () => {
    expect(initials("")).toBe("?");
  });
});

describe("slugify", () => {
  it("lowercases and hyphenates a name", () => {
    expect(slugify("Student Portal")).toBe("student-portal");
  });

  it("strips punctuation", () => {
    expect(slugify("DevFlow: University Edition!")).toBe("devflow-university-edition");
  });

  it("collapses repeated separators and trims leading/trailing hyphens", () => {
    expect(slugify("  --Multiple   spaces--  ")).toBe("multiple-spaces");
  });
});

describe("formatRelativeTime", () => {
  it("describes a time a few minutes in the past", () => {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    expect(formatRelativeTime(fiveMinutesAgo)).toMatch(/minute/);
  });

  it("describes a time a few days in the future", () => {
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    const result = formatRelativeTime(inTwoDays);
    expect(result).toMatch(/day/);
    expect(result).not.toMatch(/ago/);
  });
});

describe("formatDuration", () => {
  it("shows seconds only under a minute", () => {
    expect(formatDuration(8)).toBe("8s");
    expect(formatDuration(59)).toBe("59s");
  });

  it("shows minutes and seconds", () => {
    expect(formatDuration(72)).toBe("1m 12s");
    expect(formatDuration(226)).toBe("3m 46s");
  });

  it("drops the seconds when they're exactly zero", () => {
    expect(formatDuration(120)).toBe("2m");
  });
});

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("drops falsy values", () => {
    expect(cn("text-sm", false && "hidden", undefined, "font-bold")).toBe(
      "text-sm font-bold",
    );
  });
});
