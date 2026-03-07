import { NextResponse } from "next/server";

import { createUser, listUsers, type UserInput } from "../../../lib/userRepo";

function parseNumberParam(value: string | null, fallback: number): number {
    const n = Number(value);
    if (!Number.isFinite(n)) return fallback;
    return n;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const limit = parseNumberParam(searchParams.get("limit"), 200);
    const offset = parseNumberParam(searchParams.get("offset"), 0);

    const rows = listUsers({ limit, offset });

    return NextResponse.json(rows);
}

export async function POST(request: Request) {
    const body = (await request.json()) as UserInput;

    const id = createUser(body);

    return NextResponse.json({ id });
}