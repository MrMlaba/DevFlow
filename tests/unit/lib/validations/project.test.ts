import { createProjectSchema, inviteMemberSchema } from "@/lib/validations/project";

const ORG_ID = "11111111-1111-4111-8111-111111111111";

describe("createProjectSchema", () => {
  const valid = {
    organizationId: ORG_ID,
    name: "Student Portal",
    slug: "student-portal",
  };

  it("accepts a valid project with just the required fields", () => {
    expect(createProjectSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a slug with uppercase letters or spaces", () => {
    expect(
      createProjectSchema.safeParse({ ...valid, slug: "Student Portal" }).success,
    ).toBe(false);
  });

  it("rejects a slug with a leading hyphen", () => {
    expect(
      createProjectSchema.safeParse({ ...valid, slug: "-student-portal" }).success,
    ).toBe(false);
  });

  it("rejects a non-UUID organizationId", () => {
    expect(
      createProjectSchema.safeParse({ ...valid, organizationId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });

  it("rejects an invalid repository URL when one is provided", () => {
    const result = createProjectSchema.safeParse({
      ...valid,
      repositoryUrl: "not a url",
    });
    expect(result.success).toBe(false);
  });

  it("allows an empty repository URL", () => {
    expect(
      createProjectSchema.safeParse({ ...valid, repositoryUrl: "" }).success,
    ).toBe(true);
  });
});

describe("inviteMemberSchema", () => {
  it("accepts a valid email and role", () => {
    const result = inviteMemberSchema.safeParse({
      projectId: ORG_ID,
      email: "teammate@example.com",
      role: "developer",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a role outside the five defined roles", () => {
    const result = inviteMemberSchema.safeParse({
      projectId: ORG_ID,
      email: "teammate@example.com",
      role: "superadmin",
    });
    expect(result.success).toBe(false);
  });
});
