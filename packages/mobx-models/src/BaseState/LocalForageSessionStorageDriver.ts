type Callback<T = unknown> = (err: unknown, value?: T) => void;

const LocalForageSessionStorageDriver = {
  _driver: "SessionStorage",

  _initStorage: function (_options: unknown): void {},

  clear: async function (_callback?: Callback<void>): Promise<void> {},

  getItem: async function (_key: string, _callback?: Callback<unknown>): Promise<unknown> {
    return null;
  },

  iterate: async function (
      _iteratorCallback: (value: unknown, key: string, iterationNumber: number) => unknown,
      _successCallback?: Callback<unknown>
  ): Promise<unknown> {
    return null;
  },

  key: async function (_n: number, _callback?: Callback<string | null>): Promise<string | null> {
    return null;
  },

  keys: async function (_callback?: Callback<string[]>): Promise<string[]> {
    return [];
  },

  length: async function (_callback?: Callback<number>): Promise<number> {
    return 0;
  },

  removeItem: async function (_key: string, _callback?: Callback<void>): Promise<void> {},

  setItem: async function (
      _key: string,
      value: unknown,
      _callback?: Callback<unknown>
  ): Promise<unknown> {
    return value;
  },
} as const;

export default LocalForageSessionStorageDriver;