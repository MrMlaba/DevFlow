import { pullRequestStatusMeta } from "@/config/status";

describe("pullRequestStatusMeta", () => {
  it("labels a merged PR as merged, regardless of its raw state", () => {
    expect(pullRequestStatusMeta("closed", true)).toEqual({
      label: "Merged",
      tone: "info",
    });
  });

  it("labels a closed, unmerged PR as closed", () => {
    expect(pullRequestStatusMeta("closed", false)).toEqual({
      label: "Closed",
      tone: "neutral",
    });
  });

  it("labels everything else as open", () => {
    expect(pullRequestStatusMeta("open", false)).toEqual({
      label: "Open",
      tone: "success",
    });
  });
});
