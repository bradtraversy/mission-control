import path from "node:path";
import chokidar, { type FSWatcher } from "chokidar";
import { isExcluded, resolveVaultPath } from "./vault";

export type VaultChange = {
  paths: string[];
  at: number;
};

type Listener = (change: VaultChange) => void;

type WatcherState = {
  watcher: FSWatcher;
  listeners: Set<Listener>;
  pending: Set<string>;
  debounceTimer: NodeJS.Timeout | null;
};

const DEBOUNCE_MS = 100;
const GLOBAL_KEY = "__mcVaultWatcher";

type GlobalWithWatcher = typeof globalThis & {
  [GLOBAL_KEY]?: WatcherState;
};

function getState(): WatcherState {
  const g = globalThis as GlobalWithWatcher;
  if (g[GLOBAL_KEY]) return g[GLOBAL_KEY];

  const vaultRoot = resolveVaultPath();
  const watcher = chokidar.watch(vaultRoot, {
    ignored: (absPath: string) => {
      if (absPath === vaultRoot) return false;
      const rel = path.relative(vaultRoot, absPath);
      if (rel === "") return false;
      return isExcluded(absPath);
    },
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: { stabilityThreshold: 50, pollInterval: 25 },
  });

  const state: WatcherState = {
    watcher,
    listeners: new Set(),
    pending: new Set(),
    debounceTimer: null,
  };

  const onChange = (absPath: string) => {
    const rel = path.relative(vaultRoot, absPath).split(path.sep).join("/");
    state.pending.add(rel);
    if (state.debounceTimer) return;
    state.debounceTimer = setTimeout(() => {
      const paths = Array.from(state.pending);
      state.pending.clear();
      state.debounceTimer = null;
      const change: VaultChange = { paths, at: Date.now() };
      for (const listener of state.listeners) {
        try {
          listener(change);
        } catch (err) {
          console.error("watcher: listener threw", err);
        }
      }
    }, DEBOUNCE_MS);
  };

  watcher.on("add", onChange);
  watcher.on("change", onChange);
  watcher.on("unlink", onChange);
  watcher.on("addDir", onChange);
  watcher.on("unlinkDir", onChange);
  watcher.on("error", (err) => console.error("watcher: error", err));

  g[GLOBAL_KEY] = state;
  return state;
}

export function subscribeVault(listener: Listener): () => void {
  const state = getState();
  state.listeners.add(listener);
  return () => {
    state.listeners.delete(listener);
  };
}
