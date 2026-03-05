import { RootStore } from "mobx-models";
import UserState from "./UserState";

type AppStore = RootStore;

declare global {
    // Extend this in other apps if you want, without editing this file.
    interface DemoAppSubStores {
        user: UserState;
    }
}

type AppSubStores = DemoAppSubStores;

type PathKey = string | number;
type Path = readonly PathKey[];

type PathValue<T, P extends Path> = P extends readonly []
    ? T
    : P extends readonly [infer K, ...infer R]
        ? K extends number
            ? T extends readonly (infer U)[]
                ? PathValue<U, Extract<R, Path>>
                : unknown
            : K extends keyof T
                ? PathValue<T[K], Extract<R, Path>>
                : unknown
        : unknown;

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

export function useStorePath<K extends keyof AppSubStores>(key: K): AppSubStores[K];
export function useStorePath<
    K extends keyof AppSubStores,
    R extends Path,
>(key: K, ...rest: R): PathValue<AppSubStores[K], R>;
export function useStorePath<T = unknown>(...paths: Array<string | number>): T;

export function useStorePath<T = unknown>(...paths: Array<string | number>): T {
    return appStore.getPathFrom(paths) as T;
}