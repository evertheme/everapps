import { cn, formatDate, PRIORITY_COLORS, STATUS_COLORS } from "@/lib/utils";

describe("cn()", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts — last wins", () => {
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false && "bar", undefined, null, "baz")).toBe("foo baz");
  });

  it("applies conditional classes", () => {
    const active = true;
    expect(cn("base", active && "active")).toBe("base active");
    expect(cn("base", !active && "inactive")).toBe("base");
  });
});

describe("formatDate()", () => {
  it("formats an ISO date string to a readable format", () => {
    const result = formatDate("2024-06-15T10:00:00Z");
    expect(result).toMatch(/Jun/);
    expect(result).toMatch(/2024/);
    expect(result).toMatch(/15/);
  });
});

describe("PRIORITY_COLORS", () => {
  it("has entries for all priority levels", () => {
    expect(PRIORITY_COLORS).toHaveProperty("critical");
    expect(PRIORITY_COLORS).toHaveProperty("high");
    expect(PRIORITY_COLORS).toHaveProperty("medium");
    expect(PRIORITY_COLORS).toHaveProperty("low");
  });
});

describe("STATUS_COLORS", () => {
  it("has entries for all story statuses", () => {
    expect(STATUS_COLORS).toHaveProperty("draft");
    expect(STATUS_COLORS).toHaveProperty("reviewed");
    expect(STATUS_COLORS).toHaveProperty("approved");
    expect(STATUS_COLORS).toHaveProperty("exported");
  });
});
