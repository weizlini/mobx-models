import { runInAction, toJS, observable, action, computed, flow } from "mobx";

import type BaseModel from "./BaseModel";

export type SyncValidationResult = string | null | undefined;

export type SyncValidator<TValue, TModel extends BaseModel> = (
    value: TValue,
    model: TModel
) => SyncValidationResult;

export type AsyncValidator<TValue, TModel extends BaseModel> = (
    value: TValue,
    model: TModel
) => Promise<string | null>;

export type ValueProducer<TValue, TModel extends BaseModel> = TValue | ((model: TModel) => TValue);

export type Transformer<TValue, TModel extends BaseModel> = (
    value: TValue,
    model: TModel
) => unknown;

export type Formatter<TValue, TModel extends BaseModel> = (value: TValue, model: TModel) => TValue;

export interface FieldOptions<TModel extends BaseModel = BaseModel, TValue = unknown> {
  type?: FieldTypeValue | FieldTypeKey | string;
  ui?: string;
  primary?: boolean;
  label?: string;

  required?: boolean | ((model: TModel) => boolean);
  requiredMessage?: string;

  unique?: AsyncValidator<TValue, TModel>;
  asyncValidation?: AsyncValidator<TValue, TModel>;
  asyncValidationOnChange?: boolean;

  validation?: SyncValidator<TValue, TModel>;

  /**
   * Readonly-only producer.
   * (If provided, `readonly` must be true.)
   *
   * IMPORTANT:
   * - If this is a function, we store it internally (not in `value`).
   * - Its produced value is re-applied during BaseModel.validateSync() passes so
   *   derived/readonly fields stay consistent even though the UI never sets them.
   */
  value?: ValueProducer<TValue, TModel>;

  /**
   * Default value for non-readonly fields.
   */
  default?: TValue;

  readonly?: boolean;

  testId?: string;

  transform?: Transformer<TValue, TModel>;
  format?: Formatter<TValue, TModel>;

  help?: string;
  pseudo?: boolean;

  onSet?: (value: TValue, model: TModel) => void | Promise<void>;
  onInit?: (value: TValue, model: TModel) => void | Promise<void>;

  postAlias?: string;
  min?: number | null;
  max?: number | null;
}

export const FieldType = {
  bool: "bool",
  date: "date",
  int: "int",
  float: "float",
  json: "json",
  string: "string",
  polygon: "polygon",
  postAlias: "string",
  html: "string",
  collection: "collection",
  map: "map",
  set: "set",
  modelCollection: "ModelCollection",
  modelMap: "ModelMap",
  object: "object",

  /**
   * Database-stored binary for images (ArrayBuffer-ish).
   * Intended value type: Uint8Array | null
   */
  image: "image",
} as const;

export type FieldTypeKey = keyof typeof FieldType;
export type FieldTypeValue = (typeof FieldType)[FieldTypeKey];

/**
 * Minimal TC39 decorator context shape we rely on (TypeScript 5+).
 *
 * We avoid importing lib types directly so the package can compile against
 * different TS lib configurations while remaining strictly typed.
 */
export interface FieldDecoratorContext<TThis, _TValue> {
  readonly kind: "field" | "accessor";
  readonly name: string | symbol;
  addInitializer(initializer: (this: TThis) => void): void;
}

export type FieldPropertyDecorator<TThis extends BaseModel, TValue> = (
    _value: undefined,
    context: FieldDecoratorContext<TThis, Field<TValue, TThis>>
) => void | ((this: TThis, initialValue: unknown) => Field<TValue, TThis>);

function emptyForType(type: FieldTypeValue | FieldTypeKey | string): unknown {
  switch (type) {
    case FieldType.collection:
      return [];
    case FieldType.map:
      return {};
    case FieldType.set:
      return new Set();
    case FieldType.image:
      return null;
    default:
      return "";
  }
}

function coerceImageBytes(v: unknown): Uint8Array | null {
  if (v === null || v === undefined) return null;

  if (v instanceof Uint8Array) return v;

  if (v instanceof ArrayBuffer) return new Uint8Array(v);

  if (typeof DataView !== "undefined" && v instanceof DataView) {
    return new Uint8Array(v.buffer, v.byteOffset, v.byteLength);
  }

  const maybeBuffer = (globalThis as any)?.Buffer;
  if (maybeBuffer && typeof maybeBuffer.isBuffer === "function" && maybeBuffer.isBuffer(v)) {
    return new Uint8Array(v as Uint8Array);
  }

  return null;
}

export default class Field<TValue = unknown, TModel extends BaseModel = BaseModel> {
  public readonly isModel: false = false;
  public isModelCollection: boolean = false;

  public model: TModel;
  public fieldName: string;

  @observable accessor isPrimary: boolean = false;
  @observable accessor isPseudo: boolean = false;
  @observable accessor isReadonly: boolean = false;

  @observable accessor hasAsyncValidator: boolean = false;
  @observable accessor doAsyncValidationOnChange: boolean = false;

  @observable accessor min: number | null = null;
  @observable accessor max: number | null = null;

  @observable accessor initialValue: TValue = undefined as any;

  @observable accessor requiredMessage: string = "errors:requiredField";

  @observable accessor testId: string = "";
  @observable accessor help: string = "";
  @observable accessor ui: string = "";
  @observable accessor label: string = "";

  @observable accessor postAlias: string = "";

  @observable accessor type: FieldTypeValue | FieldTypeKey | string = FieldType.string;

  @observable accessor value: TValue = undefined as any;

  @observable accessor error: string | null = null;
  @observable accessor isAsyncValidating: boolean = false;

  public requiredFunction: (model: TModel) => boolean = () => false;

  public validator: SyncValidator<TValue, TModel> = () => null;
  public asyncValidator: AsyncValidator<TValue, TModel> = async () => null;

  public transform: Transformer<TValue, TModel> = (v) => v;
  public format: Formatter<TValue, TModel> = (v) => v;

  public onSet: (value: TValue, model: TModel) => void | Promise<void> = () => {};
  public onInit: (value: TValue, model: TModel) => void | Promise<void> = () => {};

  /**
   * Stored readonly value producer (if configured).
   *
   * This is used for derived/readonly fields whose value should be refreshed
   * during validation passes.
   */
  private readonlyValueProducer: ((model: TModel) => TValue) | null = null;

  @computed
  public get isRequired(): boolean {
    return this.requiredFunction(this.model);
  }

  @computed
  public get isValid(): boolean {
    return !this.error;
  }

  @computed
  public get isDirty(): boolean {
    return toJS(this.value as any) !== toJS(this.initialValue as any);
  }

  constructor(model: TModel, fieldName: string, options: FieldOptions<TModel, TValue> = {}) {
    this.model = model;
    this.fieldName = fieldName;

    if (options.primary === true) {
      this.isPrimary = true;
      this.model.primaryKey = fieldName;
    }

    if (options.pseudo === true) this.isPseudo = true;
    if (options.readonly === true) this.isReadonly = true;

    if (typeof options.required === "function") {
      this.requiredFunction = options.required as (m: TModel) => boolean;
    } else if (typeof options.required === "boolean") {
      const v = options.required;
      this.requiredFunction = () => v;
    }

    if (options.requiredMessage) this.requiredMessage = options.requiredMessage;
    if (options.testId) this.testId = options.testId;
    if (options.ui) this.ui = options.ui;
    if (options.help) this.help = options.help;
    if (options.label) this.label = options.label;
    if (options.postAlias) this.postAlias = options.postAlias;

    if (options.min !== undefined) this.min = options.min ?? null;
    if (options.max !== undefined) this.max = options.max ?? null;

    if (options.validation) this.validator = options.validation;

    if (options.unique) {
      this.asyncValidator = options.unique;
      this.hasAsyncValidator = true;
    }

    if (options.asyncValidation) {
      this.asyncValidator = options.asyncValidation;
      this.hasAsyncValidator = true;
    }

    if (options.asyncValidationOnChange === true) this.doAsyncValidationOnChange = true;

    if (options.transform) this.transform = options.transform as any;
    if (options.format) this.format = options.format as any;

    if (options.onSet) this.onSet = options.onSet as any;
    if (options.onInit) this.onInit = options.onInit as any;

    if (options.type) {
      this.type = options.type;
    }

    if (options.value !== undefined) {
      if (!this.isReadonly) {
        throw new Error(
            'Field option "value" is only for readonly fields. Use "format" for UI formatting or "transform" for submit formatting.'
        );
      }
      if (options.default !== undefined) {
        throw new Error('Field cannot have both "value" and "default".');
      }

      this.readonlyValueProducer =
          typeof options.value === "function"
              ? (options.value as (m: TModel) => TValue)
              : () => options.value as TValue;

      const produced = this.readonlyValueProducer(this.model);
      this.initValue(produced);
    } else if (options.default !== undefined) {
      if (this.isReadonly) throw new Error("default cannot be used with readonly fields");
      this.initValue(options.default);
    } else {
      this.initValue(emptyForType(this.type) as any);
    }

    this.model.__registerField(fieldName, this as any, !this.isPseudo);
  }

  private __coerceValue(v: unknown): TValue {
    if (v === null || v === undefined) return emptyForType(this.type) as TValue;

    switch (this.type) {
      case FieldType.collection:
        return (Array.isArray(v) ? v : []) as any;
      case FieldType.map:
        return (typeof v === "object" && !Array.isArray(v) ? v : {}) as any;
      case FieldType.set:
        return (v instanceof Set ? v : new Set(v as any)) as any;
      case FieldType.image:
        return coerceImageBytes(v) as any;
      default:
        return v as TValue;
    }
  }

  /**
   * Internal setter used by readonly value producers.
   *
   * - Does NOT call onSet
   * - Does NOT trigger model.validateSync()
   * - Does NOT trigger async validation
   */
  @action
  public __setDerivedValue(newValue: unknown): void {
    if (!this.isReadonly || !this.readonlyValueProducer) return;

    const coerced = this.__coerceValue(newValue);

    runInAction(() => {
      switch (this.type) {
        case FieldType.set:
          this.value = (coerced instanceof Set ? coerced : (new Set(coerced as any) as any)) as any;
          break;
        default:
          this.value = this.format(coerced as any, this.model) as any;
      }
    });
  }

  /**
   * Called by BaseModel.validateSync() passes to keep readonly/derived fields up to date.
   */
  @action
  public __recomputeReadonlyValue(): void {
    if (!this.isReadonly || !this.readonlyValueProducer) return;
    const produced = this.readonlyValueProducer(this.model);
    this.__setDerivedValue(produced);
  }

  @action
  public initValue(v: unknown): void {
    const value = this.__coerceValue(v);

    void this.onInit(value, this.model);

    this.setValue(value, true);

    this.initialValue = toJS(this.value as any) as any;
  }

  @action
  public setValue(newValue: unknown, setReadOnlyField: boolean = false): void {
    if (this.isReadonly && !setReadOnlyField) return;

    const coerced = this.__coerceValue(newValue);

    runInAction(() => {
      switch (this.type) {
        case FieldType.set:
          this.value = (coerced instanceof Set ? coerced : (new Set(coerced as any) as any)) as any;
          break;
        default:
          this.value = this.format(coerced as any, this.model) as any;
      }
    });

    void this.onSet(this.value as any, this.model);

    let modelToValidate: BaseModel = this.model;
    while (modelToValidate.parent) modelToValidate = modelToValidate.parent;
    modelToValidate.validateSync();

    if (this.doAsyncValidationOnChange && this.hasAsyncValidator) {
      void this.validate();
    }
  }

  @action
  public setError(error: string | null): void {
    this.error = error;
  }

  @action
  public async asyncSetValue(newValue: unknown, setReadOnlyField: boolean = false): Promise<void> {
    if (this.isReadonly && !setReadOnlyField) return;

    const coerced = this.__coerceValue(newValue);
    const formatted = await Promise.resolve(this.format(coerced as any, this.model) as any);

    runInAction(() => {
      this.value = formatted;
    });

    await Promise.resolve(this.onSet(this.value as any, this.model));

    let modelToValidate: BaseModel = this.model;
    while (modelToValidate.parent) modelToValidate = modelToValidate.parent;
    modelToValidate.validateSync();

    if (this.doAsyncValidationOnChange && this.hasAsyncValidator) {
      await this.validate();
    }
  }

  @action
  public setItem(key: string | number, value: unknown): void {
    if (this.type === FieldType.map) {
      this.setValue({ ...(this.value as any), [key]: value } as any);
      return;
    }

    if (this.type === FieldType.collection) {
      const next = toJS(this.value as any) as any[];
      next[key as number] = value;
      this.setValue(next as any);
      return;
    }

    throw new Error("Field.setItem can only be used by fields of type map or collection");
  }

  @action
  public push(value: unknown): void {
    if (this.type !== FieldType.collection) {
      throw new Error("Field.push can only be used by fields of type collection");
    }
    (this.value as any[]).push(value);
    this.validateSync();
  }

  @action
  public clearItems(): void {
    switch (this.type) {
      case FieldType.map:
        this.setValue({} as any);
        break;
      case FieldType.collection:
        this.setValue([] as any);
        break;
      default:
        throw new Error("Field.clearItems can only be used by fields of type collection or map");
    }
  }

  @action
  public add(item: unknown): void {
    switch (this.type) {
      case FieldType.collection:
        (this.value as any[]).push(item);
        break;
      case FieldType.set:
        (this.value as Set<unknown>).add(item);
        this.validateSync();
        break;
      default:
        throw new Error("Field.add can only be used by fields of type collection or set");
    }
  }

  @action
  public remove(item: unknown): void {
    switch (this.type) {
      case FieldType.collection:
        this.value = (this.value as any[]).filter((v) => v !== item) as any;
        this.validateSync();
        break;
      case FieldType.set:
        (this.value as Set<unknown>).delete(item);
        this.validateSync();
        break;
      default:
        throw new Error("Field.remove can only be used by fields of type collection or set");
    }
  }

  @action
  public removeItem(key: string | number): void {
    if (this.type === FieldType.map) {
      const next = { ...(this.value as any) } as Record<string, unknown>;
      delete next[String(key)];
      this.setValue(next as any);
      return;
    }

    if (this.type === FieldType.collection) {
      const next = [...(this.value as any[])];
      next.splice(key as number, 1);
      this.setValue(next as any);
      return;
    }

    throw new Error("Field.removeItem can only be used by fields of type map or collection");
  }

  @action
  public reset(): void {
    this.setValue(this.initialValue as any, true);
    this.error = null;
  }

  @flow
  public *validate(): unknown {
    this.validateSync();

    if (!this.hasAsyncValidator) return this.error;

    this.isAsyncValidating = true;

    const v = this.value as any;

    if (this.isRequired && (v === null || v === "" || v === undefined)) {
      this.error = this.requiredMessage;
      this.isAsyncValidating = false;
      return this.error;
    }

    const error: string | null = yield this.asyncValidator(this.value as any, this.model);

    this.error = error;
    this.isAsyncValidating = false;

    return error;
  }

  @action
  public validateSync(): string | null {
    const v = this.value as any;

    if (this.isRequired && (v === null || v === "" || v === undefined)) {
      this.error = this.requiredMessage;
      return this.error;
    }

    let error: string | null = null;

    switch (this.type) {
      case FieldType.int: {
        const n = Number(v);
        if (Number.isNaN(n)) error = "expecting_number";
        else if (!Number.isInteger(n)) error = "expecting_integer";
        else if (this.min !== null && n < this.min) error = "error_min";
        else if (this.max !== null && n > this.max) error = "error_max";
        break;
      }
      case FieldType.float: {
        const n = Number(v);
        if (Number.isNaN(n)) error = "expecting_number";
        else if (this.min !== null && n < this.min) error = "error_min";
        else if (this.max !== null && n > this.max) error = "error_max";
        break;
      }
      default:
        break;
    }

    if (error === null) {
      const res = this.validator(this.value as any, this.model);
      error = res ?? null;
    }

    this.error = error;
    return error;
  }

  public get array(): unknown[] {
    if (this.type === FieldType.map) return Object.values(this.value as any);
    if (this.type === FieldType.set) return [...(this.value as any as Set<unknown>)];
    if (this.type === FieldType.collection) return [...(this.value as any as unknown[])];
    return [this.value];
  }

  /**
   * Decorator factory (TC39 / TypeScript 5+).
   *
   * Usage:
   *   class User extends BaseModel {
   *     @Field.string({ required: true })
   *     name!: Field<string, User>;
   *   }
   */
  public static define<TValue, TThis extends BaseModel = BaseModel>(
      options: FieldOptions<TThis, TValue> = {}
  ): FieldPropertyDecorator<TThis, TValue> {
    return (_unused: undefined, context: FieldDecoratorContext<TThis, TValue>) => {
      if (context.kind !== "field" && context.kind !== "accessor") {
        throw new Error(`@Field can only decorate a field/accessor (got: ${String(context.kind)})`);
      }

      const name = context.name;
      if (typeof name !== "string") {
        throw new Error("@Field does not support symbol property names.");
      }

      if (context.kind === "field") {
        return function (this: TThis, initialValue: unknown): Field<TValue, TThis> {
          if (this.__fields.includes(name)) {
            throw new Error(
                `Field decorator attempted to define "${name}", but that field is already registered.`
            );
          }

          const field = new Field<TValue, TThis>(this as any, name, options);

          if (initialValue !== undefined) {
            field.initValue(initialValue);
          }

          return field;
        };
      }

      context.addInitializer(function (this: TThis) {
        if (this.__fields.includes(name)) {
          throw new Error(
              `Field decorator attempted to define "${name}", but that field is already registered.`
          );
        }

        const preExisting = Object.prototype.hasOwnProperty.call(this, name)
            ? (this as any)[name]
            : undefined;

        const field = new Field<TValue, TThis>(this as any, name, options);

        Object.defineProperty(this, name, {
          configurable: true,
          enumerable: true,
          get(this: TThis) {
            return this.field(name) as Field<TValue, TThis>;
          },
        });

        if (preExisting !== undefined) {
          field.initValue(preExisting);
        }
      });
    };
  }

  // Convenience typed factories.
  public static string<TThis extends BaseModel = BaseModel>(
      options: Omit<FieldOptions<TThis, string>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, string> {
    return Field.define<string, TThis>({ ...(options as any), type: FieldType.string });
  }

  public static bool<TThis extends BaseModel = BaseModel>(
      options: Omit<FieldOptions<TThis, boolean>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, boolean> {
    return Field.define<boolean, TThis>({ ...(options as any), type: FieldType.bool });
  }

  public static int<TThis extends BaseModel = BaseModel>(
      options: Omit<FieldOptions<TThis, number>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, number> {
    return Field.define<number, TThis>({ ...(options as any), type: FieldType.int });
  }

  public static float<TThis extends BaseModel = BaseModel>(
      options: Omit<FieldOptions<TThis, number>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, number> {
    return Field.define<number, TThis>({ ...(options as any), type: FieldType.float });
  }

  public static date<TThis extends BaseModel = BaseModel>(
      options: Omit<FieldOptions<TThis, Date | string>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, Date | string> {
    return Field.define<Date | string, TThis>({ ...(options as any), type: FieldType.date });
  }

  public static json<TThis extends BaseModel = BaseModel, TValue = unknown>(
      options: Omit<FieldOptions<TThis, TValue>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, TValue> {
    return Field.define<TValue, TThis>({ ...(options as any), type: FieldType.json });
  }

  /**
   * Image bytes stored in DB (Uint8Array | null).
   */
  public static image<TThis extends BaseModel = BaseModel>(
      options: Omit<FieldOptions<TThis, Uint8Array | null>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, Uint8Array | null> {
    return Field.define<Uint8Array | null, TThis>({ ...(options as any), type: FieldType.image });
  }

  /**
   * Array field (TItem[]).
   */
  public static collection<TThis extends BaseModel = BaseModel, TItem = unknown>(
      options: Omit<FieldOptions<TThis, TItem[]>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, TItem[]> {
    return Field.define<TItem[], TThis>({ ...(options as any), type: FieldType.collection });
  }

  /**
   * Map field (Record<TKey, TValue>), stored as a plain object.
   * Note: keys are always strings at runtime.
   */
  public static map<TThis extends BaseModel = BaseModel, TValue = unknown>(
      options: Omit<FieldOptions<TThis, Record<string, TValue>>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, Record<string, TValue>> {
    return Field.define<Record<string, TValue>, TThis>({
      ...(options as any),
      type: FieldType.map,
    });
  }

  /**
   * Set field (Set<TItem>).
   */
  public static set<TThis extends BaseModel = BaseModel, TItem = unknown>(
      options: Omit<FieldOptions<TThis, Set<TItem>>, "type"> & { type?: never } = {}
  ): FieldPropertyDecorator<TThis, Set<TItem>> {
    return Field.define<Set<TItem>, TThis>({ ...(options as any), type: FieldType.set });
  }
}
/**
 * Lowercase decorator alias.
 *
 * Usage:
 *   class User extends BaseModel {
 *     @field.string({ required: true }) name!: Field<string, User>;
 *     @field.collection<User, string>() tags!: Field<string[], User>;
 *   }
 *
 * Access pattern:
 *   user.name.value
 *   user.name.error
 *   user.name.setValue("Alice")
 *
 * This is just Field.define, with the same typed convenience factories attached.
 */
export const field = Object.assign(Field.define, {
  define: Field.define,
  string: Field.string,
  bool: Field.bool,
  int: Field.int,
  float: Field.float,
  date: Field.date,
  json: Field.json,
  image: Field.image,
  collection: Field.collection,
  map: Field.map,
  set: Field.set,
}) as typeof Field.define & {
  define: typeof Field.define;
  string: typeof Field.string;
  bool: typeof Field.bool;
  int: typeof Field.int;
  float: typeof Field.float;
  date: typeof Field.date;
  json: typeof Field.json;
  image: typeof Field.image;
  collection: typeof Field.collection;
  map: typeof Field.map;
  set: typeof Field.set;
};