"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";

import type { UserRow } from "../../lib/userRepo";

type SortKey = keyof UserRow;
type SortDir = "asc" | "desc";

type UsersTableHeaderProps = {
    sortKey: SortKey;
    sortDir: SortDir;
    onHeaderClick: (key: SortKey) => void;
};

function UsersTableHeaderInner({ sortKey, sortDir, onHeaderClick }: UsersTableHeaderProps) {
    function renderHeader(label: string, key: SortKey) {
        const isActive = key === sortKey;
        const arrow = isActive ? (sortDir === "asc" ? " ▲" : " ▼") : " ↕";

        function handleClick() {
            onHeaderClick(key);
        }

        return (
            <th key={String(key)} onClick={handleClick} style={thStyle}>
        <span style={{ fontWeight: 600 }}>
          {label}
            {arrow}
        </span>
            </th>
        );
    }

    return (
        <thead>
        <tr>
            {renderHeader("ID", "id")}
            {renderHeader("Email", "email")}
            {renderHeader("Password", "password")}
            {renderHeader("First name", "firstName")}
            {renderHeader("Last name", "lastName")}
            {renderHeader("Age", "age")}
            {renderHeader("Birthday", "birthday")}
        </tr>
        </thead>
    );
}

const UsersTableHeader = observer(UsersTableHeaderInner);

export default UsersTableHeader;

const thStyle: React.CSSProperties = {
    textAlign: "left",
    borderBottom: "1px solid #ddd",
    padding: "10px 8px",
    whiteSpace: "nowrap",
    cursor: "row-resize",
    userSelect: "none",
    position: "sticky",
    top: 0,
    zIndex: 2,
    background: "#fff",
};