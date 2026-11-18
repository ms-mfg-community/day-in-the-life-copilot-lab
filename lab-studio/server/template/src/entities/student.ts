export interface Student {
  readonly id: number;
  readonly firstMidName: string;
  readonly lastName: string;
  /** ISO date string — see AGENTS.md for why this is not a Date. */
  readonly enrollmentDate: string;
}

export interface NewStudent {
  readonly firstMidName: string;
  readonly lastName: string;
  readonly enrollmentDate: string;
}

/** Display convention: "LastName, FirstMidName" throughout the UI. */
export function displayName(student: Student): string {
  return `${student.lastName}, ${student.firstMidName}`;
}
