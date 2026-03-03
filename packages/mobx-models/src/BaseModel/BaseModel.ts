import { runInAction, toJS, makeObservable, observable, computed, action } from "mobx";
import type Field from "./Field";

export type JsonRecord = Record<string, unknown>;

export type SaveFn<TModel extends BaseModel = BaseModel> =
    | ((payload: JsonRecord, model: TModel) => Promise<unknown>)
    | null;

export interface BaseModelConfig<TModel extends BaseModel = BaseModel> {
  create: SaveFn<TModel>;
  modify: SaveFn<TModel>;
}

/**
 * BaseModel is an observable class that contains methods and properties
 * to help with UI forms and with saving to the server.
 */
export default class BaseModel {
  /**
   * NOTE:
   * We deliberately avoid `[key: string]: any` because it destroys type safety.
   * Fields are accessed via the typed helpers below.
   */

  public readonly isModel: true = true;

  public parent: BaseModel | null | undefined;
  public children: BaseModel[] = [];

  /**
   * The field name which is the primary key of the form.
   * Set by a Field with option `{ primary: true }`.
   */
  public primaryKey: string = "";

  public config: BaseModelConfig = {
    create: null,
    modify: null,
  };

  /**
   * Used when a child model's submit property is different than GET property.
   */
  public postAlias: string | null = null;

  /**
   * Registered field names (order matters for UI iteration).
   */
  public __fields: string[] = [];

  /**
   * Submittable field names (excludes pseudos).
   */
  public __submittable: string[] = [];

  /**
   * Busy flag (save/submit flows).
   */
  public busy: boolean = false;

  public validated: boolean = false;
  public initialized: boolean = false;

  public initialData: Record<string, unknown> | null = null;

  /**
   * Optional error storage for save/submit flows.
   * (You had `saveError` in makeObservable but didn't define it in the class.)
   */
  public saveError: unknown = null;

  /**
   * Internal registry to avoid indexing into `this[k]`.
   * Field constructor calls `__registerField`.
   */
  private readonly __fieldByName: Map<string, Field<any, any>> = new Map();

  constructor(parent?: BaseModel | null) {
    makeObservable<this, "__fieldByName">(this, {
      primaryKey: observable,
      validated: observable,
      initialized: observable,
      busy: observable,
      saveError: observable,

      isNew: computed,
      isValid: computed,
      isDirty: computed,
      isPristine: computed,

      reset: action,
      init: action,
      initValue: action,
      setValue: action,
      setFields: action,
      validate: action,
      validateSync: action,
      __registerField: action,
    });

    this.parent = parent;
    if (parent) {
      parent.addModel(this);
    }
  }

  public addModel(child: BaseModel): void {
    this.children.push(child);
  }

  /**
   * Field registration entry point (called by Field constructor).
   * Also supports models that create fields lazily.
   */
  public __registerField(fieldName: string, field: Field<any, any>, submittable: boolean): void {
    if (!this.__fields.includes(fieldName)) this.__fields.push(fieldName);
    if (submittable && !this.__submittable.includes(fieldName)) this.__submittable.push(fieldName);
    this.__fieldByName.set(fieldName, field);
  }

  /**
   * Typed field accessor
   */
  public field<T = unknown>(name: string): Field<T, any> {
    const f = this.__fieldByName.get(name);
    if (!f) throw new Error(`Unknown field "${name}". Did you forget to construct it?`);
    return f as Field<T, any>;
  }

  /**
   * Returns the list of field names (useful for iterating in components).
   */
  public fields(): string[] {
    return this.__fields;
  }

  /**
   * Determines if the model is new based on whether init() received initial values.
   */
  public get isNew(): boolean {
    return (
        this.initialData === null ||
        (typeof this.initialData === "object" && Object.keys(this.initialData).length === 0)
    );
  }

  public get isValid(): boolean {
    for (const k of this.fields()) {
      if (!this.field(k).isValid) return false;
    }
    for (const m of this.children) {
      if (!m.isValid) return false;
    }
    return true;
  }

  public get isDirty(): boolean {
    for (const k of this.fields()) {
      if (this.field(k).isDirty) return true;
    }
    for (const m of this.children) {
      if (m.isDirty) return true;
    }
    return false;
  }

  public get isPristine(): boolean {
    return !this.isDirty;
  }

  public partialValidity(fields: string[]): boolean {
    for (const k of fields) {
      if (!this.field(k).isValid) return false;
    }
    return true;
  }

  public toJsAll(): JsonRecord {
    return this.toJS(false, false);
  }

  /**
   * Extract an object with field values.
   * By default excludes pseudos (uses __submittable).
   */
  public toJS(excludePrimary: boolean = false, excludePseudo: boolean = true): JsonRecord {
    const js = this.__extractValuesFromFields(
        excludePrimary,
        excludePseudo ? this.__submittable : this.__fields
    );

    // Children serialize via explicit `children` list (no Object.keys(this) scanning).
    for (const child of this.children) {
      const key = child.postAlias ?? this.__inferChildKey(child);
      if (key) js[key] = child.toJS();
    }

    return js;
  }

  public toJSON(excludePrimary: boolean = false): JsonRecord {
    const js = this.__extractValuesFromFields(excludePrimary, this.__submittable);

    for (const child of this.children) {
      const key = child.postAlias ?? this.__inferChildKey(child);
      if (key) js[key] = child.toJSON();
    }

    return js;
  }

  /**
   * Best-effort child key inference.
   * If you need stable keys, override this in subclasses.
   */
  protected __inferChildKey(_child: BaseModel): string | null {
    return null;
  }

  private __extractValuesFromFields(excludePrimary: boolean, fields: string[]): JsonRecord {
    const js: JsonRecord = {};

    for (const k of fields) {
      if (excludePrimary && k === this.primaryKey) continue;

      const f = this.field(k);

      // ModelCollection support (duck-typed).
      if ((f as any).isModelCollection && typeof (f as any).toJS === "function") {
        js[k] = (f as any).toJS();
        continue;
      }

      const transformed = f.transform(f.value, this);
      const value = toJS(transformed as any) as unknown;

      if (f.postAlias) js[f.postAlias] = value;
      else js[k] = value;
    }

    return js;
  }

  // ------------------------------------------
  // ACTIONS
  // ------------------------------------------

  public reset(): void {
    for (const k of this.fields()) {
      this.field(k).reset();
    }
    for (const child of this.children) {
      child.reset();
    }
    this.validated = false;
  }

  public init(obj: Record<string, unknown> | null = null): void {
    this.initialized = false;
    this.initialData = obj;

    if (obj) {
      const imported = this.importData(obj);
      this.initValue(imported);
    }

    for (const child of this.children) {
      // If the caller provides nested objects, subclasses can route them.
      child.init();
    }

    this.initialized = true;
    this.validated = false;
  }

  public initValue(obj: Record<string, unknown>): void {
    for (const k of this.fields()) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        this.field(k).initValue((obj as Record<string, unknown>)[k]);
      }
    }
  }

  public setValue(key: string, value: unknown): void {
    this.field(key).setValue(value);
  }

  public setFields(model: Record<string, { value: unknown }>): void {
    for (const fieldName of this.fields()) {
      const maybe = model[fieldName];
      if (maybe && Object.prototype.hasOwnProperty.call(maybe, "value")) {
        this.field(fieldName).setValue(maybe.value);
      }
    }
  }

  public async validate(): Promise<boolean> {
    const fieldResults = await Promise.all(this.fields().map((k) => this.field(k).validate()));
    const childResults = await Promise.all(this.children.map((m) => m.validate()));

    // Field.validate() returns null|string in your Field, so treat "truthy" as failure.
    const all = [...fieldResults, ...childResults] as Array<unknown>;
    const failure = all.reduce<boolean>((prev, current) => prev || Boolean(current), false);

    runInAction(() => {
      this.validated = true;
    });

    return !failure;
  }

  public validateSync(): void {
    if (!this.initialized) return;

    for (const k of this.fields()) {
      this.field(k).validateSync();
    }

    for (const m of this.children) {
      m.validateSync();
    }
  }

  /**
   * Override this function to change output format.
   */
  public exportData<T extends unknown>(data: T): T {
    return data;
  }

  /**
   * Override to change import mapping.
   */
  public importData<T extends Record<string, unknown>>(data: T): T {
    return data;
  }
}