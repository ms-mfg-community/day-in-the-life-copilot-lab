export interface Student {
  readonly id: number;
  readonly firstMidName: string;
  readonly lastName: string;
  readonly enrollmentDate: Date;
}

export interface NewStudent {
  readonly firstMidName: string;
  readonly lastName: string;
  readonly enrollmentDate: Date;
}

export interface StudentPatch {
  readonly firstMidName?: string;
  readonly lastName?: string;
  readonly enrollmentDate?: Date;
}
