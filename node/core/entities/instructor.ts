export interface Instructor {
  readonly id: number;
  readonly firstMidName: string;
  readonly lastName: string;
  readonly hireDate: Date;
}

export interface NewInstructor {
  readonly firstMidName: string;
  readonly lastName: string;
  readonly hireDate: Date;
}
