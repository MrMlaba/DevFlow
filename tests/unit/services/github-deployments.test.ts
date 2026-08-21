import { deploymentStatusSummary } from "@/services/github";

describe("deploymentStatusSummary", () => {
  it("maps success to success", () => {
    expect(deploymentStatusSummary("success")).toBe("success");
  });

  it("maps error and failure to failed", () => {
    expect(deploymentStatusSummary("error")).toBe("failed");
    expect(deploymentStatusSummary("failure")).toBe("failed");
  });

  it("maps inactive to superseded", () => {
    expect(deploymentStatusSummary("inactive")).toBe("superseded");
  });

  it("maps in-progress/queued/pending/waiting to pending", () => {
    expect(deploymentStatusSummary("in_progress")).toBe("pending");
    expect(deploymentStatusSummary("queued")).toBe("pending");
    expect(deploymentStatusSummary("pending")).toBe("pending");
    expect(deploymentStatusSummary("waiting")).toBe("pending");
  });
});
