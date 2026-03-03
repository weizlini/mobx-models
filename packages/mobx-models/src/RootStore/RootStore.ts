import { action, observable } from "mobx";

export type StoreKey = string;

export class RootStore {
  @observable.shallow accessor stores: Map<StoreKey, unknown> = new Map();

  @action
  register<TStore>(key: StoreKey, store: TStore): TStore {
    this.stores.set(key, store as unknown);
    return store;
  }

  has(key: StoreKey): boolean {
    return this.stores.has(key);
  }

  get<TStore = unknown>(key: StoreKey): TStore {
    const v = this.stores.get(key);
    if (v === undefined) {
      throw new Error(`RootStore.get: missing store "${key}"`);
    }
    return v as TStore;
  }

  tryGet<TStore = unknown>(key: StoreKey): TStore | null {
    const v = this.stores.get(key);
    return v === undefined ? null : (v as TStore);
  }

  getPath(...paths: Array<string | number>): unknown {
    return getPathFrom(this, paths);
  }
}
function getPathFrom(start: RootStore, paths: Array<string | number>): unknown {
  let current: unknown = start;

  for (const p of paths) {
    if (current == null) return null;

    if (current instanceof RootStore) {
      if (typeof p !== "string") return null;
      current = current.tryGet(p);
      continue;
    }

    if (typeof current === "object") {
      const obj = current as Record<string | number, unknown>;
      if (p in obj) current = obj[p];
      else return null;
      continue;
    }

    return null;
  }

  return current;
}
