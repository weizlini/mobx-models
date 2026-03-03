import type BaseModel from "../BaseModel/BaseModel";
import type Field from "../BaseModel/Field";
import type { SyncValidator } from "../BaseModel/Field";

export type ErrorCode = string;

export const validators = {
  // composition
  all<TValue, TModel extends BaseModel>(
    ...validators: Array<SyncValidator<TValue, TModel>>
  ): SyncValidator<TValue, TModel> {
    return (value, model) => {
      for (const fn of validators) {
        const res = fn(value, model);
        if (res) return res;
      }
      return null;
    };
  },

  any<TValue, TModel extends BaseModel>(
    ...validators: Array<SyncValidator<TValue, TModel>>
  ): SyncValidator<TValue, TModel> {
    return (value, model) => {
      let last: ErrorCode | null = null;
      for (const fn of validators) {
        const res = fn(value, model);
        if (!res) return null;
        last = (res ?? null) as any;
      }
      return last;
    };
  },

  when<TValue, TModel extends BaseModel>(
    predicate: (model: TModel) => boolean,
    validator: SyncValidator<TValue, TModel>
  ): SyncValidator<TValue, TModel> {
    return (value, model) => (predicate(model) ? validator(value, model) : null);
  },

  // generic
  notNull<TModel extends BaseModel>(
    code: ErrorCode = "errors:notNull"
  ): SyncValidator<unknown, TModel> {
    return (value) => (value === null ? code : null);
  },

  oneOf<TModel extends BaseModel, TValue>(
    allowed: ReadonlyArray<TValue>,
    code: ErrorCode = "errors:oneOf"
  ): SyncValidator<TValue, TModel> {
    return (value) => (allowed.includes(value) ? null : code);
  },

  /**
   * Validates that this field's value matches another Field on the same model.
   * Useful for password confirmation, email confirmation, etc.
   */
  matchesField<TModel extends BaseModel>(
    otherFieldName: string,
    code: ErrorCode = "errors:mustMatch"
  ): SyncValidator<string, TModel> {
    return (value, model) => {
      const other = (model as any).field(otherFieldName) as Field<string, TModel> | undefined;
      if (!other) return code;

      const a = value;
      const bRaw = (other as any).value;
      const b = typeof bRaw === "string" ? bRaw : String(bRaw ?? "");

      return a === b ? null : code;
    };
  },

  // string
  minLen<TModel extends BaseModel>(
    min: number,
    code: ErrorCode = "errors:minLen"
  ): SyncValidator<string, TModel> {
    return (value) => (value.length >= min ? null : code);
  },

  maxLen<TModel extends BaseModel>(
    max: number,
    code: ErrorCode = "errors:maxLen"
  ): SyncValidator<string, TModel> {
    return (value) => (value.length <= max ? null : code);
  },

  pattern<TModel extends BaseModel>(
    re: RegExp,
    code: ErrorCode = "errors:pattern"
  ): SyncValidator<string, TModel> {
    return (value) => (re.test(value) ? null : code);
  },

  email<TModel extends BaseModel>(code: ErrorCode = "errors:email"): SyncValidator<string, TModel> {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return (value) => (re.test(value) ? null : code);
  },

  // number
  min<TModel extends BaseModel>(
    min: number,
    code: ErrorCode = "errors:min"
  ): SyncValidator<number, TModel> {
    return (value) => (value >= min ? null : code);
  },

  max<TModel extends BaseModel>(
    max: number,
    code: ErrorCode = "errors:max"
  ): SyncValidator<number, TModel> {
    return (value) => (value <= max ? null : code);
  },

  integer<TModel extends BaseModel>(
    code: ErrorCode = "errors:integer"
  ): SyncValidator<number, TModel> {
    return (value) => (Number.isInteger(value) ? null : code);
  },

  // array
  minItems<TModel extends BaseModel>(
    min: number,
    code: ErrorCode = "errors:minItems"
  ): SyncValidator<unknown[], TModel> {
    return (value) => (value.length >= min ? null : code);
  },

  maxItems<TModel extends BaseModel>(
    max: number,
    code: ErrorCode = "errors:maxItems"
  ): SyncValidator<unknown[], TModel> {
    return (value) => (value.length <= max ? null : code);
  },

  // set
  setMin<TModel extends BaseModel>(
    min: number,
    code: ErrorCode = "errors:minItems"
  ): SyncValidator<Set<unknown>, TModel> {
    return (value) => (value.size >= min ? null : code);
  },

  setMax<TModel extends BaseModel>(
    max: number,
    code: ErrorCode = "errors:maxItems"
  ): SyncValidator<Set<unknown>, TModel> {
    return (value) => (value.size <= max ? null : code);
  },
} as const;
