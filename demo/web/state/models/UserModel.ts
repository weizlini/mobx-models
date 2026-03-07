import { BaseModel, Field, asyncValidators, field, validators } from "mobx-models";

import { apiEmailExists } from "../../lib/userApi";

type IsoDateOnly = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

function isIsoDateOnly(v: string): v is IsoDateOnly {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

const emailUniqueValidation = asyncValidators.unique({
  fieldName: "email",
  normalize: (v: string) =>
      String(v ?? "")
          .trim()
          .toLowerCase(),
  exists: async (email: string) => apiEmailExists(String(email ?? "")),
  code: "errors:emailTaken",
});

const passwordMatchesValidation = validators.matchesField("password");

export function calculateAgeFromBirthdayIso(birthdayIso: string, today: Date = new Date()): number {
  if (!isIsoDateOnly(birthdayIso)) return NaN;

  const [yyyyStr, mmStr, ddStr] = birthdayIso.split("-");
  const yyyy = Number(yyyyStr);
  const mm = Number(mmStr);
  const dd = Number(ddStr);

  if (!Number.isFinite(yyyy) || !Number.isFinite(mm) || !Number.isFinite(dd)) return NaN;
  if (mm < 1 || mm > 12) return NaN;
  if (dd < 1 || dd > 31) return NaN;

  const bday = new Date(yyyy, mm - 1, dd);
  if (Number.isNaN(bday.getTime())) return NaN;

  let age = today.getFullYear() - bday.getFullYear();
  const m = today.getMonth() - bday.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bday.getDate())) age -= 1;

  return age;
}

export default class UserModel extends BaseModel {
  @field.int({
    primary: true,
    required: true,
    default: 0,
  })
  public id: Field<number> = undefined as any;

  @field.string({
    required: true,
    validation: validators.email,
    asyncValidation: emailUniqueValidation,
  })
  public email: Field<string> = undefined as any;

  @field.string({ required: true })
  public password: Field<string> = undefined as any;

  @field.string({
    required: true,
    pseudo: true,
    validation: passwordMatchesValidation,
  })
  public password2: Field<string> = undefined as any;

  @field.string({ required: true })
  public firstName: Field<string> = undefined as any;

  @field.string({ required: true })
  public lastName: Field<string> = undefined as any;

  @field.string({
    required: true,
    validation: validators.pattern(/^\d{4}-\d{2}-\d{2}$/, "errors:date"),
  })
  public birthday: Field<string> = undefined as any;

  @field.int({
    readonly: true,
    value: (m) => {
      const next = calculateAgeFromBirthdayIso(String(m.birthday.value ?? ""));
      return Number.isFinite(next) ? next : 0;
    },
    validation: validators.all(validators.integer, validators.min(0), validators.max(150)),
  })
  public age: Field<number> = undefined as any;
}