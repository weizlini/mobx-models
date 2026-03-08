"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";

import type { UserRow } from "../../lib/userRepo";

type UsersTableRowProps = {
    user: UserRow;
    onEdit: (id: number) => void;
    editDisabled: boolean;
};

function UsersTableRowInner({ user, onEdit, editDisabled }: UsersTableRowProps) {
    return (
        <tr>
            <td style={tdStyleMono}>{user.id}</td>
            <td style={tdStyleMono}>{user.email}</td>
            <td style={tdStyleMono}>{user.password}</td>
            <td style={tdStyle}>{user.firstName}</td>
            <td style={tdStyle}>{user.lastName}</td>
            <td style={tdStyleMono}>{user.age}</td>
            <td style={tdStyleMono}>{user.birthday}</td>
            <td style={tdStyleActions}>
                <button
                    type="button"
                    onClick={() => onEdit(user.id)}
                    disabled={editDisabled}
                    style={editButtonStyle}
                >
                    Edit
                </button>
            </td>
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

const tdStyleActions: React.CSSProperties = {
    ...tdStyle,
    width: 96,
};

const editButtonStyle: React.CSSProperties = {
    height: 30,
    padding: "0 10px",
    borderRadius: 6,
    border: "1px solid #ccc",
    background: "#fff",
    cursor: "pointer",
};