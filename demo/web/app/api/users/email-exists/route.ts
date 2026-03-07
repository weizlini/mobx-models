import { NextResponse } from "next/server";

import { emailExists } from "../../../../lib/userRepo";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);

    const email = String(searchParams.get("email") ?? "");

    const exists = emailExists(email);

    return NextResponse.json({
        exists,
    });
}