export interface Course {
  readonly id: number;
  readonly title: string;
  readonly credits: number;
  readonly departmentId: number | null;
}

export interface NewCourse {
  readonly title: string;
  readonly credits: number;
  readonly departmentId?: number | null;
}
