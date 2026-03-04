import { Suspense } from "react";
import UserModel from "../../state/models/UserModel";
import UsersTableSection from "./UsersTableSection";

export default function UsersPage() {
  return (
    <main>
      <h1>Users</h1>
      <div style={{ marginTop: 16 }}>
        <Suspense fallback={<div>Loading users…</div>}>
          <UsersTableSection />
        </Suspense>
      </div>
    </main>
  );
}
