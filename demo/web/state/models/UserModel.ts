import { BaseModel, asyncValidators, field, validators } from "mobx-models";

import { emailExists } from "../../lib/userRepo";

type IsoDateOnly = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;

function isIsoDateOnly(v: string): v is IsoDateOnly {
    return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

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
    public id!: number;

    @field.string({
        required: true,
        validation: validators.email(),
        asyncValidation: asyncValidators.unique<string, UserModel>({
            fieldName: "email",
            normalize: (v) => String(v ?? "").trim().toLowerCase(),
            exists: async (email) => emailExists(String(email ?? "")),
            code: "errors:emailTaken",
        }),
    })
    public email!: string;

    @field.string({ required: true })
    public password!: string;

    @field.string({
        required: true,
        pseudo: true,
        validation: validators.matchesField<UserModel>("password"),
    })
    public password2!: string;

    @field.string({ required: true })
    public firstName!: string;

    @field.string({ required: true })
    public lastName!: string;

    @field.int({
        required: true,
        default: 0,
        validation: validators.all(
            validators.integer<UserModel>(),
            validators.min<UserModel>(0),
            validators.max<UserModel>(150)
        ),
    })
    public age!: number;

    @field.string({
        required: true,
        validation: validators.pattern(/^(\d{4})-(\d{2})-(\d{2})$/, "errors:date"),
    })
    public birthday!: string;

    public setAgeFromBirthday(today: Date = new Date()): void {
        const next = calculateAgeFromBirthdayIso(String(this.birthday ?? ""), today);
        if (!Number.isFinite(next)) return;
        this.field<number>("age").setValue(next);
    }
}