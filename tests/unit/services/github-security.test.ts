import { codeScanningSeverity, dependabotStatus } from "@/services/github";

describe("codeScanningSeverity", () => {
  it("prefers security_severity_level when present", () => {
    expect(codeScanningSeverity({ security_severity_level: "critical", severity: "note" })).toBe(
      "critical",
    );
  });

  it("falls back to the generic severity field when security_severity_level is null", () => {
    expect(codeScanningSeverity({ security_severity_level: null, severity: "error" })).toBe(
      "high",
    );
    expect(codeScanningSeverity({ security_severity_level: null, severity: "warning" })).toBe(
      "medium",
    );
    expect(codeScanningSeverity({ security_severity_level: null, severity: "note" })).toBe("low");
  });

  it("defaults to low when both fields are missing", () => {
    expect(codeScanningSeverity({ security_severity_level: null, severity: null })).toBe("low");
  });
});

describe("dependabotStatus", () => {
  it("maps auto_dismissed to dismissed", () => {
    expect(dependabotStatus("auto_dismissed")).toBe("dismissed");
  });

  it("passes through open/dismissed/fixed unchanged", () => {
    expect(dependabotStatus("open")).toBe("open");
    expect(dependabotStatus("dismissed")).toBe("dismissed");
    expect(dependabotStatus("fixed")).toBe("fixed");
  });
});
