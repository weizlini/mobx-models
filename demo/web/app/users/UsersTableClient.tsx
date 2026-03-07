"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";

import type { UserRow } from "../../lib/userRepo";
import { useStorePath } from "../../state";
import type UserState from "../../state/UserState";
import UsersTableHeader from "./UsersTableHeader";
import UsersTableRow from "./UsersTableRow";

type UsersTableClientProps = {
  initialRows: UserRow[];
};

type SortKey = keyof UserRow;
type SortDir = "asc" | "desc";

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;

  const as = String(a ?? "");
  const bs = String(b ?? "");

  return as.localeCompare(bs);
}

function sortRows(rows: UserRow[], key: SortKey, dir: SortDir): UserRow[] {
  return [...rows].sort((ra, rb) => {
    const cmp = compareValues(ra[key], rb[key]);
    return dir === "asc" ? cmp : -cmp;
  });
}

const UsersTableClient = observer(function UsersTableClient({ initialRows }: UsersTableClientProps) {
  const userState = useStorePath("user") as UserState;

  const [sortKey, setSortKey] = React.useState<SortKey>("id");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    userState.initializeUsers(initialRows);
  }, [initialRows, userState]);

  const rows = sortRows(userState.list, sortKey, sortDir);

  React.useLayoutEffect(() => {
    if (pendingScrollTopRef.current === null) return;
    if (!scrollRef.current) return;

    scrollRef.current.scrollTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;
  }, [sortKey, sortDir]);

  function onHeaderClick(key: SortKey): void {
    if (scrollRef.current) {
      pendingScrollTopRef.current = scrollRef.current.scrollTop;
    }

    if (key === sortKey) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir("asc");
  }

  return (
      <div ref={scrollRef} style={{ overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
        <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: 900,
            }}
        >
          <UsersTableHeader sortKey={sortKey} sortDir={sortDir} onHeaderClick={onHeaderClick} />

          <tbody>
          {rows.map((user) => (
              <UsersTableRow key={user.id} user={user} />
          ))}
          </tbody>
        </table>

        <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
          Click any column header to sort. ↕ indicates sortable. Header is sticky while scrolling.
        </div>
      </div>
  );
});
export default UsersTableClient;