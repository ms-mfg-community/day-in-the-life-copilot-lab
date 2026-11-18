export interface Course {
  /** Department-assigned integer in the range 1000-9999 — not auto-generated. */
  readonly courseId: number;
  readonly title: string;
  readonly credits: number;
  readonly instructorId: number | null;
}

export interface Enrollment {
  readonly studentId: number;
  readonly courseId: number;
  readonly grade: "A" | "B" | "C" | "D" | "F" | null;
}
