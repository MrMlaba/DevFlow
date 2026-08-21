import { can, permissionsFor } from "@/config/permissions";
import { ALL_ROLES } from "@/config/roles";

describe("can()", () => {
  it("grants administrators every permission", () => {
    const adminPermissions = permissionsFor("administrator");
    for (const permission of adminPermissions) {
      expect(can("administrator", permission)).toBe(true);
    }
  });

  it("lets a project_owner manage members but not organizations", () => {
    expect(can("project_owner", "project:manage_members")).toBe(true);
    expect(can("project_owner", "project:delete")).toBe(true);
    expect(can("project_owner", "organization:manage")).toBe(false);
  });

  it("lets a developer create and update tasks, but not delete them", () => {
    expect(can("developer", "task:create")).toBe(true);
    expect(can("developer", "task:update")).toBe(true);
    expect(can("developer", "task:delete")).toBe(false);
  });

  it("restricts a reviewer to updates and comments, no creation", () => {
    expect(can("reviewer", "task:update")).toBe(true);
    expect(can("reviewer", "task:create")).toBe(false);
    expect(can("reviewer", "comment:create")).toBe(true);
  });

  it("limits a lecturer to viewing and commenting only", () => {
    expect(can("lecturer", "activity:view")).toBe(true);
    expect(can("lecturer", "comment:create")).toBe(true);
    expect(can("lecturer", "task:create")).toBe(false);
    expect(can("lecturer", "project:delete")).toBe(false);
  });

  it("denies everything when there's no role", () => {
    expect(can(null, "activity:view")).toBe(false);
    expect(can(undefined, "task:create")).toBe(false);
  });

  it("defines a permission list for every role", () => {
    for (const role of ALL_ROLES) {
      expect(permissionsFor(role).length).toBeGreaterThan(0);
    }
  });
});
