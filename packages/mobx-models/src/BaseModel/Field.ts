import { runInAction, toJS, observable, action, computed } from "mobx";
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
} as const;

export type FieldTypeKey = keyof typeof FieldType;
export type FieldTypeValue = (typeof FieldType)[FieldTypeKey];

function emptyForType(type: FieldTypeValue | FieldTypeKey | string): unknown {
  switch (type) {
    case FieldType.collection:
      return [];
    case FieldType.map:
      return {};
    case FieldType.set:
      return new Set();
    default:
      return "";
  }
}

export default class Field<TValue = unknown, TModel extends BaseModel = BaseModel> {
  public readonly isModel: false = false;
  public isModelCollection: boolean = false;

  public model: TModel;
  public fieldName: string;

  @observable public isPrimary: boolean = false;
  @observable public isPseudo: boolean = false;
  @observable public isReadonly: boolean = false;

  @observable public hasAsyncValidator: boolean = false;
  @observable public doAsyncValidationOnChange: boolean = false;

  @observable public min: number | null = null;
  @observable public max: number | null = null;

  @observable public initialValue: TValue = undefined as any;

  @observable public requiredMessage: string = "errors:requiredField";

  @observable public testId: string = "";
  @observable public help: string = "";
  @observable public ui: string = "";
  @observable public label: string = "";

  @observable public postAlias: string = "";

  @observable public type: FieldTypeValue | FieldTypeKey | string = FieldType.string;

  @observable public value: TValue = undefined as any;

  @observable public error: string | null = null;
  @observable public isAsyncValidating: boolean = false;

  public requiredFunction: (model: TModel) => boolean = () => false;

  public validator: SyncValidator<TValue, TModel> = () => null;
  public asyncValidator: AsyncValidator<TValue, TModel> = async () => null;

  public transform: Transformer<TValue, TModel> = (v) => v;
  public format: Formatter<TValue, TModel> = (v) => v;

  public onSet: (value: TValue, model: TModel) => void | Promise<void> = () => {};
  public onInit: (value: TValue, model: TModel) => void | Promise<void> = () => {};

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

      const produced =
          typeof options.value === "function"
              ? (options.value as (m: TModel) => TValue)(this.model)
              : (options.value as TValue);

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
        return (typeof v === "object" && v !== null && !Array.isArray(v) ? v : {}) as any;
      case FieldType.set:
        return (v instanceof Set ? v : new Set(v as any)) as any;
      default:
        return v as TValue;
    }
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

  @action
  public async validate(): Promise<string | null> {
    this.validateSync();

    if (!this.hasAsyncValidator) return this.error;

    this.isAsyncValidating = true;

    const v = this.value as any;

    if (this.isRequired && (v === null || v === "" || v === undefined)) {
      this.error = this.requiredMessage;
      this.isAsyncValidating = false;
      return this.error;
    }

    const error = await this.asyncValidator(this.value as any, this.model);

    runInAction(() => {
      this.error = error;
      this.isAsyncValidating = false;
    });

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
}