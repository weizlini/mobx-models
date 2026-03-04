import { Suspense } from "react";

import UsersTableSection from "./UsersTableSection";

export default function UsersPage() {
  return (
    <main>
      <h1>Users</h1>
      <p style={{ marginTop: 8, opacity: 0.8 }}>
        Sorted columns (client-side). Initial data loaded on the server.
      </p>

      <div style={{ marginTop: 16 }}>
        <Suspense fallback={<div>Loading users…</div>}>
          <UsersTableSection />
        </Suspense>
      </div>
    </main>
  );
}
