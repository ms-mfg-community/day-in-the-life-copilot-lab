import { lab01 } from "./lab01";
import { lab02 } from "./lab02";
import { lab03 } from "./lab03";
import { lab04 } from "./lab04";
import { lab05 } from "./lab05";
import { lab06 } from "./lab06";
import { lab07 } from "./lab07";
import { lab08 } from "./lab08";
import { lab09 } from "./lab09";
import { lab10 } from "./lab10";
import { lab11 } from "./lab11";
import { lab12 } from "./lab12";
import { lab13 } from "./lab13";
import { lab14 } from "./lab14";
import { lab15 } from "./lab15";
import { lab16 } from "./lab16";
import { lab17 } from "./lab17";
import { lab18 } from "./lab18";
import { lab19 } from "./lab19";
import { lab20 } from "./lab20";
import { nextLabId, previousLabId } from "./tracks";
import type { Lab } from "./types";

/**
 * Every lab, in numeric order. The order and each lab's index never change:
 * persisted learner location is an index into this array. Tracks (see
 * ./tracks) are a reading order laid over it, not a reordering of it.
 */
export const labs: Lab[] = [
  lab01,
  lab02,
  lab03,
  lab04,
  lab05,
  lab06,
  lab07,
  lab08,
  lab09,
  lab10,
  lab11,
  lab12,
  lab13,
  lab14,
  lab15,
  lab16,
  lab17,
  lab18,
  lab19,
  lab20,
];

export {
  LEARNING_PATH,
  TRACKS,
  formatLabRange,
  nextLabId,
  previousLabId,
  trackOfLab,
} from "./tracks";
export type { Track } from "./tracks";

/** Index of a lab in `labs` by its id, or -1 when no lab has that id. */
export function labIndexById(labId: string): number {
  return labs.findIndex((lab) => lab.id === labId);
}

function indexOrUndefined(labId: string | undefined): number | undefined {
  if (labId === undefined) return undefined;
  const index = labIndexById(labId);
  return index === -1 ? undefined : index;
}

/** The `labs` index to open after `labIdx` on the learning path, if any. */
export function nextLabIdx(labIdx: number): number | undefined {
  const id = labs[labIdx]?.id;
  return id === undefined ? undefined : indexOrUndefined(nextLabId(id));
}

/** The `labs` index to open before `labIdx` on the learning path, if any. */
export function previousLabIdx(labIdx: number): number | undefined {
  const id = labs[labIdx]?.id;
  return id === undefined ? undefined : indexOrUndefined(previousLabId(id));
}
