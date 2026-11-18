import { create } from "zustand";
import type { GitHubState, SessionMeta, TermEntry, TreeNode } from "./types";

export interface Location {
  /** -1 = home screen. */
  labIdx: number;
  stepIdx: number;
}

interface StudioState {
  location: Location;
  progress: Record<string, boolean>;
  termEntries: TermEntry[];
  termMode: "shell" | "copilot";
  termBusy: boolean;
  copilotBusy: boolean;
  benchTab: "terminal" | "files" | "github";
  tree: TreeNode[];
  selectedFile: string | null;
  fileContent: string;
  fileDirty: boolean;
  sessionMeta: SessionMeta | null;
  github: GitHubState | null;

  navigate: (loc: Location) => void;
  markDone: (stepKey: string) => void;
  resetProgress: () => void;
  pushEntries: (entries: TermEntry[]) => void;
  updateEntries: (fn: (entries: TermEntry[]) => TermEntry[]) => void;
  setTermMode: (mode: "shell" | "copilot") => void;
  setTermBusy: (busy: boolean) => void;
  setCopilotBusy: (busy: boolean) => void;
  setBenchTab: (tab: "terminal" | "files" | "github") => void;
  setTree: (tree: TreeNode[]) => void;
  openFile: (path: string, content: string) => void;
  setFileContent: (content: string, dirty: boolean) => void;
  closeFile: () => void;
  setSessionMeta: (meta: SessionMeta | null) => void;
  setGithub: (state: GitHubState | null) => void;
}

const PROGRESS_KEY = "lab-studio-progress";
const LOCATION_KEY = "lab-studio-location";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export const useStudio = create<StudioState>((set) => ({
  location: loadJson<Location>(LOCATION_KEY, { labIdx: -1, stepIdx: 0 }),
  progress: loadJson<Record<string, boolean>>(PROGRESS_KEY, {}),
  termEntries: [
    {
      kind: "out",
      blocks: [
        { text: "Copilot Lab Studio — workspace shell.", tone: "accent" },
        {
          text: "Type 'help' for commands, or follow the manual on the left.",
          tone: "dim",
        },
      ],
    },
  ],
  termMode: "shell",
  termBusy: false,
  copilotBusy: false,
  benchTab: "terminal",
  tree: [],
  selectedFile: null,
  fileContent: "",
  fileDirty: false,
  sessionMeta: null,
  github: null,

  navigate: (location) => {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(location));
    set({ location });
  },
  markDone: (stepKey) =>
    set((s) => {
      const progress = { ...s.progress, [stepKey]: true };
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
      return { progress };
    }),
  resetProgress: () => {
    localStorage.removeItem(PROGRESS_KEY);
    set({ progress: {} });
  },
  pushEntries: (entries) =>
    set((s) => ({ termEntries: [...s.termEntries, ...entries] })),
  updateEntries: (fn) => set((s) => ({ termEntries: fn(s.termEntries) })),
  setTermMode: (termMode) => set({ termMode }),
  setTermBusy: (termBusy) => set({ termBusy }),
  setCopilotBusy: (copilotBusy) => set({ copilotBusy }),
  setBenchTab: (benchTab) => set({ benchTab }),
  setTree: (tree) => set({ tree }),
  openFile: (path, content) =>
    set({
      selectedFile: path,
      fileContent: content,
      fileDirty: false,
      benchTab: "files",
    }),
  setFileContent: (fileContent, fileDirty) => set({ fileContent, fileDirty }),
  closeFile: () =>
    set({ selectedFile: null, fileContent: "", fileDirty: false }),
  setSessionMeta: (sessionMeta) => set({ sessionMeta }),
  setGithub: (github) => set({ github }),
}));
