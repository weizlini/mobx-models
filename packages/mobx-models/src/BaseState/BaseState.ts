import { action, toJS, reaction, makeObservable, observable, runInAction } from "mobx";
import localForage from "localforage";
import type { RootStore } from "../index";

type StoragePlatform = {
  getItem(key: string): Promise<string | null | undefined>;
  setItem(key: string, value: string): Promise<unknown>;
};

export default class BaseState {
  root: RootStore;

  save: Record<string, unknown> = {};
  session: Record<string, unknown> = {};

  initialStateRestored = false;

  reactionDisposers: Record<string, () => void> = {};

  constructor(root: RootStore) {
    this.root = root;
    makeObservable(this, {
      loadFromStorage: action,
      saveToStorage: action,
      initialStateRestored: observable,
    });
  }

  private __getKey(key: string): unknown {
    return (this as unknown as Record<string, unknown>)[key];
  }

  private __setKey(key: string, value: unknown): void {
    (this as unknown as Record<string, unknown>)[key] = value;
  }

  register(): void {
    Object.keys(this.save).forEach((key) => {
      this.reactionDisposers[key] = reaction(
        () => this.__getKey(key),
        async () => {
          if (this.initialStateRestored) {
            await this.saveToStorage(platformLocalStorage, key);
          }
        }
      );
    });

    Object.keys(this.session).forEach((key) => {
      this.reactionDisposers[key] = reaction(
        () => this.__getKey(key),
        async () => {
          if (this.initialStateRestored) {
            await this.saveToStorage(platformSessionStorage, key);
          }
        }
      );
    });
  }

  async restoreInitialState(): Promise<void> {
    const promises: Array<Promise<void>> = Object.keys(this.save).map((key) => {
      return this.loadFromStorage(platformLocalStorage, key, this.save[key]);
    });

    promises.push(
      ...Object.keys(this.session).map((key) => {
        return this.loadFromStorage(platformSessionStorage, key, this.session[key]);
      })
    );

    await Promise.all(promises);

    runInAction(() => {
      this.initialStateRestored = true;
    });
  }

  async loadFromStorage(
    storagePlatform: StoragePlatform,
    key: string,
    initialValue: unknown
  ): Promise<void> {
    try {
      const value = await storagePlatform.getItem(this.constructor.name + "_" + key);

      if (value === null || value === undefined) {
        this.__setKey(key, initialValue);
        await this.saveToStorage(storagePlatform, key, initialValue);
        return;
      }

      runInAction(() => {
        this.__setKey(key, JSON.parse(value).value);
      });
    } catch (e) {
      console.error(`error getting ${this.constructor.name}.${key} from storage.`);
      console.error(e);
      this.__setKey(key, initialValue);
      await this.saveToStorage(storagePlatform, key, initialValue);
    }
  }

  async saveToStorage(
    storagePlatform: StoragePlatform,
    key: string,
    overrideValue?: unknown
  ): Promise<void> {
    const value = overrideValue !== undefined ? overrideValue : this.__getKey(key);
    console.log(toJS(value));

    const jsonValue = JSON.stringify({ value });

    try {
      await storagePlatform.setItem(this.constructor.name + "_" + key, jsonValue);
    } catch {
      // swallow
    }
  }

  async init(..._args: unknown[]): Promise<void> {
    this.register();
    await this.restoreInitialState();
  }
}

const platformSessionStorage: StoragePlatform = localForage;
const platformLocalStorage: StoragePlatform = localForage;
