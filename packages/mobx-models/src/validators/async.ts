import type BaseModel from "../BaseModel/BaseModel";
import type { AsyncValidator } from "../BaseModel/Field";

export type ErrorCode = string;

export const asyncValidators = {
  /**
   * Generic uniqueness validator.
   *
   * - Optionally normalizes the candidate value before checking.
   * - If `fieldName` is provided, it will skip the check when the normalized value
   *   is unchanged from `model.initialData[fieldName]`.
   */
  unique<TValue, TModel extends BaseModel>(opts: {
    exists: (value: TValue, model: TModel) => Promise<boolean>;
    fieldName?: string;
    normalize?: (value: TValue) => TValue;
    allowBlank?: boolean;
    code?: ErrorCode;
  }): AsyncValidator<TValue, TModel> {
    const { exists, fieldName, normalize, allowBlank = true, code = "errors:notUnique" } = opts;

    return async (rawValue, model) => {
      const value = normalize ? normalize(rawValue) : rawValue;

      if (allowBlank) {
        if (value === null || value === undefined) return null;
        if (typeof value === "string" && value.trim() === "") return null;
      }

      if (fieldName && model.initialData && typeof model.initialData === "object") {
        const initialRaw = (model.initialData as any)[fieldName] as TValue;
        const initial = normalize ? normalize(initialRaw) : initialRaw;
        if (initial === value) return null;
      }

      const isTaken = await exists(value, model);
      return isTaken ? code : null;
    };
  },
} as const;