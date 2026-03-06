import { observable, computed, action, toJS, flow } from "mobx";

import type Field from "./Field";

/**
 * BaseModel
 *
 * Generic form / view model base class.
 * Handles:
 * - field registration
 * - validation orchestration
 * - serialization (toJS / toJSON)
 * - parent / child model relationships
 */

export default class BaseModel {
  public readonly isModel: true = true;

  public parent: BaseModel | null | undefined;
  public children: BaseModel[] = [];

  @observable accessor primaryKey: string = "";
  @observable accessor busy: boolean = false;
  @observable accessor validated: boolean = false;
  @observable accessor initialized: boolean = false;
  @observable accessor initialData: Record<string, unknown> | null = null;
  @observable accessor saveError: unknown = null;

  /**
   * Optional alias used when serializing nested models.
   */
  @observable accessor postAlias: string | null = null;

  /**
   * Field registry
   */
  @observable accessor __fields: string[] = [];

  /**
   * Submittable fields
   */
  @observable accessor __submittable: string[] = [];

  /**
   * Internal lookup map
   */
  @observable.shallow
  private accessor __fieldByName: Map<string, Field<any, any>> = new Map();

  constructor(parent?: BaseModel | null) {
    this.parent = parent;
    if (parent) parent.addModel(this);
  }

  /**
   * Register child model
   */
  @action
  public addModel(child: BaseModel): void {
    this.children.push(child);
  }

  /**
   * Internal field registration
   */
  @action
  public __registerField(fieldName: string, field: Field<any, any>, submittable: boolean): void {
    if (!this.__fields.includes(fieldName)) this.__fields.push(fieldName);
    if (submittable && !this.__submittable.includes(fieldName)) this.__submittable.push(fieldName);
    this.__fieldByName.set(fieldName, field);
  }

  /**
   * Lookup field
   */
  public field<T = unknown>(name: string): Field<T, any> {
    const f = this.__fieldByName.get(name);
    if (!f) throw new Error(`Unknown field "${name}". Did you forget to construct it?`);
    return f as Field<T, any>;
  }

  public fields(): string[] {
    return this.__fields;
  }

  /**
   * Model is new if no initialData
   */
  @computed
  public get isNew(): boolean {
    return (
        this.initialData === null ||
        (typeof this.initialData === "object" && Object.keys(this.initialData).length === 0)
    );
  }

  /**
   * Full validation state
   */
  @computed
  public get isValid(): boolean {
    for (const k of this.fields()) {
      if (!this.field(k).isValid) return false;
    }
    for (const m of this.children) {
      if (!m.isValid) return false;
    }
    return true;
  }

  /**
   * Dirty state
   */
  @computed
  public get isDirty(): boolean {
    for (const k of this.fields()) {
      if (this.field(k).isDirty) return true;
    }
    for (const m of this.children) {
      if (m.isDirty) return true;
    }
    return false;
  }

  @computed
  public get isPristine(): boolean {
    return !this.isDirty;
  }

  /**
   * Partial validation
   */
  public partialValidity(fields: string[]): boolean {
    for (const k of fields) {
      if (!this.field(k).isValid) return false;
    }
    return true;
  }

  /**
   * Export all fields including non-submittable ones
   */
  public toJsAll<T extends Record<string, unknown> = Record<string, unknown>>(): T {
    return this.toJS<T>(false, false);
  }

  /**
   * Convert model to plain JS object
   */
  public toJS<T extends Record<string, unknown> = Record<string, unknown>>(
      excludePrimary: boolean = false,
      excludePseudo: boolean = true
  ): T {
    const js = this.__extractValuesFromFields(
        excludePrimary,
        excludePseudo ? this.__submittable : this.__fields
    );

    for (const child of this.children) {
      const key = child.postAlias ?? this.__inferChildKey(child);
      if (key) js[key] = child.toJS();
    }

    /**
     * Allow subclasses to post-process serialized data
     */
    return this.exportData(js as T);
  }

  /**
   * JSON serialization (usually for server)
   */
  public toJSON<T extends Record<string, unknown> = Record<string, unknown>>(
      excludePrimary: boolean = false
  ): T {
    const js = this.__extractValuesFromFields(excludePrimary, this.__submittable);

    for (const child of this.children) {
      const key = child.postAlias ?? this.__inferChildKey(child);
      if (key) js[key] = child.toJSON();
    }

    return this.exportData(js as T);
  }

  /**
   * Child key inference hook
   */
  protected __inferChildKey(_child: BaseModel): string | null {
    return null;
  }

  /**
   * Extract values from fields
   */
  private __extractValuesFromFields(excludePrimary: boolean, fields: string[]): Record<string, unknown> {
    const js: Record<string, unknown> = {};

    for (const k of fields) {
      if (excludePrimary && k === this.primaryKey) continue;

      const f = this.field(k);

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

  /**
   * Reset model to initial state
   */
  @action
  public reset(): void {
    for (const k of this.fields()) this.field(k).reset();
    for (const child of this.children) child.reset();
    this.validated = false;
  }

  /**
   * Initialize model
   */
  @action
  public init(obj: Record<string, unknown> | null = null): void {
    this.initialized = false;
    this.initialData = obj;

    if (obj) {
      const imported = this.importData(obj);
      this.initValue(imported);
    }

    for (const child of this.children) child.init();

    this.initialized = true;
    this.validated = false;
  }

  /**
   * Initialize field values
   */
  @action
  public initValue(obj: Record<string, unknown>): void {
    for (const k of this.fields()) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        this.field(k).initValue((obj as Record<string, unknown>)[k]);
      }
    }
  }

  /**
   * Set field value
   */
  @action
  public setValue(key: string, value: unknown): void {
    this.field(key).setValue(value);
  }

  /**
   * Set multiple fields
   */
  @action
  public setFields(model: Record<string, { value: unknown }>): void {
    for (const fieldName of this.fields()) {
      const maybe = model[fieldName];
      if (maybe && Object.prototype.hasOwnProperty.call(maybe, "value")) {
        this.field(fieldName).setValue(maybe.value);
      }
    }
  }

  /**
   * Sync validation pass
   */
  @action
  public validateSync(): void {
    if (!this.initialized) return;

    this.__recomputeReadonlyFieldsDeep();
    this.__validateSyncOnlyDeep();
  }

  @action
  private __recomputeReadonlyFieldsDeep(): void {
    for (const k of this.fields()) (this.field(k) as any).__recomputeReadonlyValue?.();
    for (const child of this.children) (child as any).__recomputeReadonlyFieldsDeep();
  }

  @action
  private __validateSyncOnlyDeep(): void {
    for (const k of this.fields()) this.field(k).validateSync();
    for (const child of this.children) (child as any).__validateSyncOnlyDeep();
  }

  /**
   * Async validation
   */
  @flow
  public *validate(): unknown {
    const fieldResults: Array<string | null> = yield Promise.all(
        this.fields().map((k) => this.field(k).validate())
    );

    const childResults: boolean[] = yield Promise.all(this.children.map((m) => m.validate()));

    const all = [...fieldResults, ...childResults] as Array<unknown>;
    const failure = all.reduce<boolean>((prev, current) => prev || Boolean(current), false);

    this.validated = true;
    return !failure;
  }

  /**
   * Hook for subclasses to modify outgoing data
   */
  public exportData<T extends Record<string, unknown>>(data: T): T {
    return data;
  }

  /**
   * Hook for subclasses to modify incoming data
   */
  public importData<T extends Record<string, unknown>>(data: T): T {
    return data;
  }
}