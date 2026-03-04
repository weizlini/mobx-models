import { listUsers, type UserRow } from "../../lib/userRepo";
import UsersTableClient from "./UsersTableClient";

export type UserRowPublic = Omit<UserRow, "password">;

export default async function UsersTableSection() {
  // Even though better-sqlite3 is sync, this component can be async to fit the pattern.
  const rows = listUsers({ limit: 200, offset: 0 }).map((r) => {
    const { password: _password, ...rest } = r;
    return rest;
  });

  return <UsersTableClient initialRows={rows as UserRowPublic[]} />;
}
