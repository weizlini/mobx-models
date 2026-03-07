import { NextResponse } from "next/server";

import { createUser, listUsers, type UserInput } from "../../../lib/userRepo";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const limitParam = searchParams.get("limit");
    const offsetParam = searchParams.get("offset");

    const parsedLimit =
        limitParam !== null && limitParam.trim() !== "" ? Number(limitParam) : NaN;
    const parsedOffset =
        offsetParam !== null && offsetParam.trim() !== "" ? Number(offsetParam) : NaN;

    const limit = Number.isFinite(parsedLimit) ? parsedLimit : 200;
    const offset = Number.isFinite(parsedOffset) ? parsedOffset : 0;

    const rows = listUsers({ limit, offset });

    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    const body = (await request.json()) as UserInput;
    const id = createUser(body);

    return NextResponse.json({ id });
}