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

function HeaderButton(props: {
  label: string;
  sortKey: SortKey;
  activeKey: SortKey;
  dir: SortDir;
  onClick: (key: SortKey) => void;
}) {
  const isActive = props.sortKey === props.activeKey;
  const arrow = isActive ? (props.dir === "asc" ? " ▲" : " ▼") : "";

  return (
    <button
      type="button"
      onClick={() => props.onClick(props.sortKey)}
      style={{
        background: "transparent",
        border: "none",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
        fontWeight: 600,
      }}
      aria-label={`Sort by ${props.label}${isActive ? ` (${props.dir})` : ""}`}
    >
      {props.label}
      {arrow}
    </button>
  );
}

export default function UsersTableClient({ initialRows }: { initialRows: UserRowPublic[] }) {
  const [sortKey, setSortKey] = React.useState<SortKey>("id");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");

  const rows = React.useMemo(
    () => sortRows(initialRows, sortKey, sortDir),
    [initialRows, sortKey, sortDir]
  );

  const onHeaderClick = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDir("asc");
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          borderCollapse: "collapse",
          width: "100%",
          minWidth: 900,
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>
              <HeaderButton
                label="ID"
                sortKey="id"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onHeaderClick}
              />
            </th>
            <th style={thStyle}>
              <HeaderButton
                label="Email"
                sortKey="email"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onHeaderClick}
              />
            </th>
            <th style={thStyle}>
              <HeaderButton
                label="First name"
                sortKey="firstName"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onHeaderClick}
              />
            </th>
            <th style={thStyle}>
              <HeaderButton
                label="Last name"
                sortKey="lastName"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onHeaderClick}
              />
            </th>
            <th style={thStyle}>
              <HeaderButton
                label="Age"
                sortKey="age"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onHeaderClick}
              />
            </th>
            <th style={thStyle}>
              <HeaderButton
                label="Birthday"
                sortKey="birthday"
                activeKey={sortKey}
                dir={sortDir}
                onClick={onHeaderClick}
              />
            </th>
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
        Tip: click a column header to sort; click again to toggle direction.
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  borderBottom: "1px solid #ddd",
  padding: "10px 8px",
  whiteSpace: "nowrap",
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
