import { NextResponse } from "next/server";

import { getUserById, updateUser, type UpdateUserInput } from "../../../../lib/userRepo";

type RouteContext = {
    params: Promise<{ id: string }> | { id: string };
};

function parseId(rawId: string): number {
    const id = Number(rawId);

    if (!Number.isInteger(id) || id <= 0) {
        throw new Error(`Invalid user id: ${rawId}`);
    }

    return id;
}

export async function GET(_request: Request, context: RouteContext) {
    const { id: rawId } = await context.params;

    const id = parseId(rawId);

    const row = getUserById(id);

    return NextResponse.json(row);
}

export async function PUT(request: Request, context: RouteContext) {
    const { id: rawId } = await context.params;

    const id = parseId(rawId);

    const body = (await request.json()) as UpdateUserInput;

    updateUser({
        ...body,
        id,
    });

    return NextResponse.json({ ok: true });
}