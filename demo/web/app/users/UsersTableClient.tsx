"use client";

import * as React from "react";
import type { UserRowPublic } from "./UsersTableSection";

type SortKey = keyof UserRowPublic;
type SortDir = "asc" | "desc";

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  const as = String(a ?? "");
  const bs = String(b ?? "");
  return as.localeCompare(bs);
}

function sortRows(rows: UserRowPublic[], key: SortKey, dir: SortDir): UserRowPublic[] {
  return [...rows].sort((ra, rb) => {
    const cmp = compareValues(ra[key], rb[key]);
    return dir === "asc" ? cmp : -cmp;
  });
}

export default function UsersTableClient({ initialRows }: { initialRows: UserRowPublic[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>("id");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = React.useRef<number | null>(null);

  const rows = React.useMemo(
    () => sortRows(initialRows, sortKey, sortDir),
    [initialRows, sortKey, sortDir]
  );

  React.useLayoutEffect(() => {
    if (pendingScrollTopRef.current === null) return;
    if (!scrollRef.current) return;

    scrollRef.current.scrollTop = pendingScrollTopRef.current;
    pendingScrollTopRef.current = null;
  }, [sortKey, sortDir]);

  const onHeaderClick = (key: SortKey) => {
    if (scrollRef.current) {
      pendingScrollTopRef.current = scrollRef.current.scrollTop;
    }

    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(key);
    setSortDir("asc");
  };

  function renderHeader(label: string, key: SortKey) {
    const isActive = key === sortKey;
    const arrow = isActive ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕";

    return (
      <th key={String(key)} onClick={() => onHeaderClick(key)} style={thStyle}>
        <span style={{ fontWeight: 600 }}>
          {label}
          {arrow}
        </span>
      </th>
    );
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
        <thead>
          <tr>
            {renderHeader("ID", "id")}
            {renderHeader("Email", "email")}
            {renderHeader("First name", "firstName")}
            {renderHeader("Last name", "lastName")}
            {renderHeader("Age", "age")}
            {renderHeader("Birthday", "birthday")}
          </tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id}>
              <td style={tdStyleMono}>{u.id}</td>
              <td style={tdStyleMono}>{u.email}</td>
              <td style={tdStyle}>{u.firstName}</td>
              <td style={tdStyle}>{u.lastName}</td>
              <td style={tdStyleMono}>{u.age}</td>
              <td style={tdStyleMono}>{u.birthday}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>
        Click any column header to sort. ↕ indicates sortable. Header is sticky while scrolling.
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
  whiteSpace: "nowrap",
  cursor: "pointer",
  userSelect: "none",

  position: "sticky",
  top: 0,
  zIndex: 2,
  background: "#fff",
};

const tdStyle: React.CSSProperties = {
  borderBottom: "1px solid #eee",
  padding: "8px",
  whiteSpace: "nowrap",
};

const tdStyleMono: React.CSSProperties = {
  ...tdStyle,
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};
