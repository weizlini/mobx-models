import { RootStore } from "mobx-models";
import UserState from "./UserState";

type AppStore = RootStore;

function createAppStore(): AppStore {
    const root = new RootStore();
    root.register("user", new UserState(root));
    return root;
}

const globalKey = "__demo_appStore__";

export const appStore: AppStore = (() => {
    const g = globalThis as unknown as Record<string, unknown>;
    const existing = g[globalKey] as AppStore | undefined;
    if (existing) return existing;
    const created = createAppStore();
    g[globalKey] = created;
    return created;
})();

export function useStorePath<T = unknown>(...paths: Array<string | number>): T {
    return appStore.getPathFrom(paths) as T;
}