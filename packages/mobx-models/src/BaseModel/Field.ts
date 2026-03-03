import { runInAction, toJS, makeObservable, observable, action, computed } from "mobx";
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

export type Transformer<TValue, TModel extends BaseModel> = (value: TValue, model: TModel) => unknown;
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

  value?: ValueProducer<TValue, TModel>; // readonly only
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

export default class Field<TValue = unknown, TModel extends BaseModel = BaseModel> {
  public readonly isModel: false = false;
  public isModelCollection: boolean = false;

  public model: TModel;
  public fieldName: string;

  public isPrimary: boolean = false;
  public isPseudo: boolean = false;
  public isReadonly: boolean = false;

  public hasAsyncValidator: boolean = false;
  public doAsyncValidationOnChange: boolean = false;

  public min: number | null = null;
  public max: number | null = null;

  public initialValue: TValue | "" = "" as any;

  public requiredMessage: string = "errors:requiredField";

  public testId: string = "";
  public help: string = "";
  public ui: string = "";
  public label: string = "";

  public postAlias: string = "";

  public type: FieldTypeValue | FieldTypeKey | string = FieldType.string;

  public value: TValue | "" = "" as any;

  public error: string | null = null;
  public isAsyncValidating: boolean = false;

  public requiredFunction: (model: TModel) => boolean = () => false;

  public validator: SyncValidator<TValue, TModel> = () => null;

  public asyncValidator: AsyncValidator<TValue, TModel> = async () => null;

  public transform: Transformer<TValue, TModel> = (v) => v;

  public format: Formatter<TValue, TModel> = (v) => v;

  public onSet: (value: TValue, model: TModel) => void | Promise<void> = () => {};
  public onInit: (value: TValue, model: TModel) => void | Promise<void> = () => {};

  public get isRequired(): boolean {
    return this.requiredFunction(this.model);
  }

  public get isValid(): boolean {
    return !this.error;
  }

  public get isDirty(): boolean {
    return toJS(this.value as any) !== toJS(this.initialValue as any);
  }

  constructor(model: TModel, fieldName: string, options: FieldOptions<TModel, TValue> = {}) {
    makeObservable(this, {
      isPrimary: observable,
      isPseudo: observable,
      isReadonly: observable,

      isAsyncValidating: observable,
      hasAsyncValidator: observable,
      doAsyncValidationOnChange: observable,

      min: observable,
      max: observable,

      initialValue: observable,
      requiredMessage: observable,

      fieldName: observable,
      testId: observable,
      ui: observable,
      help: observable,
      label: observable,
      postAlias: observable,

      value: observable,
      type: observable,

      error: observable,

      isDirty: computed,
      isValid: computed,

      initValue: action,
      setValue: action,
      asyncSetValue: action,
      setError: action,

      setItem: action,
      clearItems: action,
      push: action,
      add: action,
      remove: action,
      removeItem: action,
      reset: action,

      validate: action,
      validateSync: action,
    });

    this.model = model;
    this.fieldName = fieldName;

    // Apply options in a typed way
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
      switch (options.type) {
        case FieldType.map:
          this.initValue({} as any);
          break;
        case FieldType.collection:
          this.initValue([] as any);
          break;
        case FieldType.set:
          this.initValue(new Set() as any);
          break;
        default:
          break;
      }
    }

    // readonly value support
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
    }

    if (options.default !== undefined) {
      if (this.isReadonly) throw new Error("default cannot be used with readonly fields");
      this.initValue(options.default);
    }

    // Register with model (single source of truth)
    this.model.__registerField(fieldName, this as any, !this.isPseudo);
  }

  public initValue(v: unknown): void {
    let value = (v ?? "") as any;

    if (!value) {
      switch (this.type) {
        case FieldType.collection:
          value = [];
          break;
        case FieldType.map:
          value = {};
          break;
        case FieldType.set:
          value = new Set();
          break;
        default:
          break;
      }
    }

    void this.onInit(value, this.model);
    this.setValue(value, true);
    this.initialValue = toJS(this.value as any) as any;
  }

  public setValue(newValue: unknown, setReadOnlyField: boolean = false): void {
    const v = (newValue ?? "") as any;
    if (this.isReadonly && !setReadOnlyField) return;

    runInAction(() => {
      switch (this.type) {
        case FieldType.set:
          this.value = new Set(v) as any;
          break;
        default:
          this.value = this.format(v, this.model) as any;
      }
    });

    void this.onSet(this.value as any, this.model);

    // Validate from top-most model downward
    let modelToValidate: BaseModel = this.model;
    while (modelToValidate.parent) modelToValidate = modelToValidate.parent;
    modelToValidate.validateSync();

    if (this.doAsyncValidationOnChange && this.hasAsyncValidator) {
      void this.validate();
    }
  }

  public setError(error: string | null): void {
    this.error = error;
  }

  public async asyncSetValue(newValue: unknown, setReadOnlyField: boolean = false): Promise<void> {
    const v = (newValue ?? "") as any;
    if (this.isReadonly && !setReadOnlyField) return;

    const formatted = await Promise.resolve(this.format(v, this.model) as any);

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

  public push(value: unknown): void {
    if (this.type !== FieldType.collection) {
      throw new Error("Field.push can only be used by fields of type collection");
    }
    (this.value as any[]).push(value);
    this.validateSync();
  }

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
        throw new Error("Field.add(item) can only be used with type collection or set");
    }
  }

  public remove(item: unknown): void {
    switch (this.type) {
      case FieldType.collection: {
        const arr = this.value as any[];
        const index = arr.indexOf(item);
        if (index === -1) return;
        const next = toJS(arr) as any[];
        next.splice(index, 1);
        this.setValue(next as any);
        break;
      }
      case FieldType.set:
        (this.value as Set<unknown>).delete(item);
        this.validateSync();
        break;
      default:
        throw new Error("Field.remove(item) can only be used with type collection or set");
    }
  }

  public removeItem(key: string): void {
    if (this.type !== FieldType.map) {
      throw new Error("Field.removeItem can only be used by fields of type map");
    }
    const next = toJS(this.value as any) as Record<string, unknown>;
    delete next[key];
    this.setValue(next as any);
  }

  public reset(): void {
    this.value = this.initialValue as any;
    this.error = null;
  }

  public async validate(): Promise<null | string> {
    const localError = this.validateSync();
    if (localError) return localError;

    if (!this.error && this.hasAsyncValidator) {
      runInAction(() => {
        this.isAsyncValidating = true;
      });

      const error = await this.asyncValidator(this.value as any, this.model);

      runInAction(() => {
        this.isAsyncValidating = false;
        this.error = error;
      });

      return error;
    }

    return null;
  }

  public validateSync(): null | string {
    this.error = null;

    const v = this.value as any;

    if (!this.isRequired && !v) return null;

    const isCollectionLike =
        this.type === FieldType.collection ||
        this.type === FieldType.modelCollection ||
        this.type === FieldType.set ||
        this.type === FieldType.map ||
        this.type === FieldType.modelMap;

    if (this.isRequired && isCollectionLike) {
      const arr = this.array;
      if (!arr.length) this.error = this.requiredMessage;
      return this.error;
    }

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