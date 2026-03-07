"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";

import type { UserRow } from "../../lib/userRepo";

type UsersTableRowProps = {
    user: UserRow;
};

function UsersTableRowInner({ user }: UsersTableRowProps) {
    return (
        <tr>
            <td style={tdStyleMono}>{user.id}</td>
            <td style={tdStyleMono}>{user.email}</td>
            <td style={tdStyleMono}>{user.password}</td>
            <td style={tdStyle}>{user.firstName}</td>
            <td style={tdStyle}>{user.lastName}</td>
            <td style={tdStyleMono}>{user.age}</td>
            <td style={tdStyleMono}>{user.birthday}</td>
        </tr>
    );
}

const UsersTableRow = observer(UsersTableRowInner);

export default UsersTableRow;

const tdStyle: React.CSSProperties = {
    borderBottom: "1px solid #eee",
    padding: "8px",
    whiteSpace: "nowrap",
};

const tdStyleMono: React.CSSProperties = {
    ...tdStyle,
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
};