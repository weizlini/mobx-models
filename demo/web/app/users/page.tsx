import { listUsers } from "../../lib/userRepo";
import UsersTableClient from "./UsersTableClient";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
    const initialRows = listUsers({ limit: 200, offset: 0 });

    return <UsersTableClient initialRows={initialRows} />;
}
