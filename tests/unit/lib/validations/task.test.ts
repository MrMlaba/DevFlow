import {
  createTaskSchema,
  updateTaskStatusSchema,
} from "@/lib/validations/task";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const USER_ID = "22222222-2222-4222-8222-222222222222";

describe("createTaskSchema", () => {
  it("accepts a minimal task and defaults status/priority", () => {
    const result = createTaskSchema.safeParse({
      projectId: PROJECT_ID,
      title: "Implement authentication",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("backlog");
      expect(result.data.priority).toBe("medium");
    }
  });

  it("rejects a title that's too short", () => {
    const result = createTaskSchema.safeParse({
      projectId: PROJECT_ID,
      title: "x",
    });
    expect(result.success).toBe(false);
  });

  it("accepts assigning a task to a user by id (task assignment)", () => {
    const result = createTaskSchema.safeParse({
      projectId: PROJECT_ID,
      title: "Fix session refresh race condition",
      assigneeId: USER_ID,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.assigneeId).toBe(USER_ID);
    }
  });

  it("rejects an assignee that isn't a valid uuid", () => {
    const result = createTaskSchema.safeParse({
      projectId: PROJECT_ID,
      title: "Fix session refresh race condition",
      assigneeId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown status value", () => {
    const result = createTaskSchema.safeParse({
      projectId: PROJECT_ID,
      title: "Some task",
      status: "in_review", // not one of the 7 defined statuses
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTaskStatusSchema", () => {
  it("accepts every defined task status", () => {
    const statuses = [
      "backlog",
      "todo",
      "in_progress",
      "code_review",
      "testing",
      "blocked",
      "done",
    ];
    for (const status of statuses) {
      const result = updateTaskStatusSchema.safeParse({
        taskId: PROJECT_ID,
        status,
      });
      expect(result.success).toBe(true);
    }
  });
});
