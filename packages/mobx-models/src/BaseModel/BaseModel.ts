import { observable, computed, action, toJS, flow } from "mobx";
import type Field from "./Field";

export type JsonRecord = Record<string, unknown>;

export default class BaseModel {
  public readonly isModel: true = true;

  public parent: BaseModel | null | undefined;
  public children: BaseModel[] = [];

  @observable public primaryKey: string = "";
  @observable public busy: boolean = false;
  @observable public validated: boolean = false;
  @observable public initialized: boolean = false;
  @observable public initialData: Record<string, unknown> | null = null;
  @observable public saveError: unknown = null;

  /**
   * Used when a child model's submit property is different than GET property.
   */
  @observable public postAlias: string | null = null;

  /**
   * Registered field names (order matters for UI iteration).
   */
  @observable public __fields: string[] = [];

  /**
   * Submittable field names (excludes pseudos).
   */
  @observable public __submittable: string[] = [];

  /**
   * Internal registry to avoid indexing into `this[k]`.
   *
   * We keep this observable (shallow) so UI that iterates can react to field creation.
   */
  @observable.shallow
  private readonly __fieldByName: Map<string, Field<any, any>> = new Map();

  constructor(parent?: BaseModel | null) {
    this.parent = parent;
    if (parent) parent.addModel(this);
  }

  @action
  public addModel(child: BaseModel): void {
    this.children.push(child);
  }

  /**
   * Field registration entry point (called by Field constructor).
   */
  @action
  public __registerField(fieldName: string, field: Field<any, any>, submittable: boolean): void {
    if (!this.__fields.includes(fieldName)) this.__fields.push(fieldName);
    if (submittable && !this.__submittable.includes(fieldName)) this.__submittable.push(fieldName);
    this.__fieldByName.set(fieldName, field);
  }

  /**
   * Typed field accessor.
   */
  public field<T = unknown>(name: string): Field<T, any> {
    const f = this.__fieldByName.get(name);
    if (!f) throw new Error(`Unknown field "${name}". Did you forget to construct it?`);
    return f as Field<T, any>;
  }

  public fields(): string[] {
    return this.__fields;
  }

  @computed
  public get isNew(): boolean {
    return (
      this.initialData === null ||
      (typeof this.initialData === "object" && Object.keys(this.initialData).length === 0)
    );
  }

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

  public partialValidity(fields: string[]): boolean {
    for (const k of fields) {
      if (!this.field(k).isValid) return false;
    }
    return true;
  }

  public toJsAll(): JsonRecord {
    return this.toJS(false, false);
  }

  public toJS(excludePrimary: boolean = false, excludePseudo: boolean = true): JsonRecord {
    const js = this.__extractValuesFromFields(
      excludePrimary,
      excludePseudo ? this.__submittable : this.__fields
    );

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

  protected __inferChildKey(_child: BaseModel): string | null {
    return null;
  }

  private __extractValuesFromFields(excludePrimary: boolean, fields: string[]): JsonRecord {
    const js: JsonRecord = {};

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

  @action
  public reset(): void {
    for (const k of this.fields()) this.field(k).reset();
    for (const child of this.children) child.reset();
    this.validated = false;
  }

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

  @action
  public initValue(obj: Record<string, unknown>): void {
    for (const k of this.fields()) {
      if (Object.prototype.hasOwnProperty.call(obj, k)) {
        this.field(k).initValue((obj as Record<string, unknown>)[k]);
      }
    }
  }

  @action
  public setValue(key: string, value: unknown): void {
    this.field(key).setValue(value);
  }

  @action
  public setFields(model: Record<string, { value: unknown }>): void {
    for (const fieldName of this.fields()) {
      const maybe = model[fieldName];
      if (maybe && Object.prototype.hasOwnProperty.call(maybe, "value")) {
        this.field(fieldName).setValue(maybe.value);
      }
    }
  }

  @action
  public validateSync(): void {
    if (!this.initialized) return;

    for (const k of this.fields()) this.field(k).validateSync();
    for (const m of this.children) m.validateSync();
  }

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

  public exportData<T extends unknown>(data: T): T {
    return data;
  }

  public importData<T extends Record<string, unknown>>(data: T): T {
    return data;
  }
}
