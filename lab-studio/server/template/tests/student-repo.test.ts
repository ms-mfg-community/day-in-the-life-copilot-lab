import { describe, expect, it } from "vitest";
import { createInMemoryStudentRepo } from "../src/repos/in-memory-student-repo.js";

describe("createInMemoryStudentRepo", () => {
  it("create.assignsSequentialIds", async () => {
    const repo = createInMemoryStudentRepo();
    const a = await repo.create({
      firstMidName: "Carson",
      lastName: "Alexander",
      enrollmentDate: "2024-09-01",
    });
    const b = await repo.create({
      firstMidName: "Meredith",
      lastName: "Alonso",
      enrollmentDate: "2024-09-01",
    });
    expect(a.id).toBe(1);
    expect(b.id).toBe(2);
  });

  it("list.returnsCopies.mutationDoesNotLeak", async () => {
    const repo = createInMemoryStudentRepo();
    await repo.create({
      firstMidName: "Arturo",
      lastName: "Anand",
      enrollmentDate: "2024-09-01",
    });
    const first = (await repo.list())[0]!;
    (first as { lastName: string }).lastName = "Mutated";
    const again = (await repo.list())[0]!;
    expect(again.lastName).toBe("Anand");
  });
});
