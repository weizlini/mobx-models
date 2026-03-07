import type { UpdateUserInput, UserInput, UserRow } from "./userRepo";

type ListUsersInput = {
    limit?: number;
    offset?: number;
};

type JsonInit = Omit<RequestInit, "body"> & {
    body?: unknown;
};

async function requestJson<T>(input: string, init?: JsonInit): Promise<T> {
    const headers = new Headers(init?.headers);

    if (init?.body !== undefined) {
        headers.set("Content-Type", "application/json");
    }

    const response = await fetch(input, {
        ...init,
        headers,
        body: init?.body !== undefined ? JSON.stringify(init.body) : undefined,
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(text || `Request failed: ${response.status}`);
    }

    return (await response.json()) as T;
}

export async function apiListUsers(input: ListUsersInput = {}): Promise<UserRow[]> {
    const params = new URLSearchParams();

    if (input.limit !== undefined) params.set("limit", String(input.limit));
    if (input.offset !== undefined) params.set("offset", String(input.offset));

    const query = params.toString();
    const url = query ? `/api/users?${query}` : "/api/users";

    return requestJson<UserRow[]>(url);
}

export async function apiGetUserById(id: number): Promise<UserRow | null> {
    return requestJson<UserRow | null>(`/api/users/${id}`);
}

export async function apiCreateUser(input: UserInput): Promise<number> {
    const result = await requestJson<{ id: number }>("/api/users", {
        method: "POST",
        body: input,
    });

    return result.id;
}

export async function apiUpdateUser(input: UpdateUserInput): Promise<void> {
    await requestJson<void>(`/api/users/${input.id}`, {
        method: "PUT",
        body: input,
    });
}

export async function apiEmailExists(email: string): Promise<boolean> {
    const params = new URLSearchParams({ email });
    const result = await requestJson<{ exists: boolean }>(`/api/users/email-exists?${params}`);

    return result.exists;
}