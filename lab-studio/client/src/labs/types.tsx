import type { ReactNode } from "react";
import type { StepKind } from "../types";

export interface LabStep {
  /** Stable key for progress tracking, e.g. "lab01/explore". */
  key: string;
  title: string;
  kind: StepKind;
  /** Server-side verification id; omit for read-only steps (manual mark-complete). */
  verifyId?: string;
  body: ReactNode;
}

export interface Lab {
  id: string;
  number: string;
  title: string;
  tagline: string;
  steps: LabStep[];
}
