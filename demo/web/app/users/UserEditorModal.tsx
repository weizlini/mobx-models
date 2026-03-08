"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";

import type UserState from "../../state/UserState";
import type UserModel from "../../state/models/UserModel";

type EditorFieldProps = {
    label: string;
    value: string;
    onChange: (next: string) => void;
    error: string | null;
    type?: React.HTMLInputTypeAttribute;
    readOnly?: boolean;
};

function EditorField({
                         label,
                         value,
                         onChange,
                         error,
                         type = "text",
                         readOnly = false,
                     }: EditorFieldProps) {
    return (
        <label style={fieldWrapStyle}>
            <span style={labelStyle}>{label}</span>

            <input
                type={type}
                value={value}
                readOnly={readOnly}
                onChange={(event) => onChange(event.target.value)}
                style={{
                    ...inputStyle,
                    background: readOnly ? "#f7f7f7" : "#fff",
                    color: readOnly ? "#666" : "#111",
                }}
            />

            <div style={errorTextStyle}>{error ?? "\u00A0"}</div>
        </label>
    );
}

type UserEditorModalProps = {
    userState: UserState;
    model: UserModel;
};

const UserEditorModal = observer(function UserEditorModal({
                                                              userState,
                                                              model,
                                                          }: UserEditorModalProps) {
    const showErrors = model.validated;
    const isEditingExisting = Number(model.id.value ?? 0) > 0;

    async function onSave(): Promise<void> {
        await userState.saveUser();
    }

    function onCancel(): void {
        userState.cancel();
    }

    return (
        <div style={backdropStyle} onClick={onCancel}>
            <div
                role="dialog"
                aria-modal="true"
                aria-label={isEditingExisting ? "Edit user" : "New user"}
                style={modalStyle}
                onClick={(event) => event.stopPropagation()}
            >
                <div style={modalHeaderStyle}>
                    <div>
                        <h2 style={titleStyle}>{isEditingExisting ? "Edit User" : "New User"}</h2>
                        <div style={subtitleStyle}>
                            {isEditingExisting
                                ? `Editing user #${String(model.id.value ?? "")}`
                                : "Create a new user in the demo app."}
                        </div>
                    </div>
                </div>

                <div style={modalBodyStyle}>
                    <EditorField
                        label="Email"
                        value={String(model.email.value ?? "")}
                        onChange={(next) => model.email.setValue(next)}
                        error={showErrors ? model.email.error : null}
                        type="email"
                    />

                    <EditorField
                        label="Password"
                        value={String(model.password.value ?? "")}
                        onChange={(next) => model.password.setValue(next)}
                        error={showErrors ? model.password.error : null}
                        type="text"
                    />

                    <EditorField
                        label="Confirm password"
                        value={String(model.password2.value ?? "")}
                        onChange={(next) => model.password2.setValue(next)}
                        error={showErrors ? model.password2.error : null}
                        type="text"
                    />

                    <EditorField
                        label="First name"
                        value={String(model.firstName.value ?? "")}
                        onChange={(next) => model.firstName.setValue(next)}
                        error={showErrors ? model.firstName.error : null}
                    />

                    <EditorField
                        label="Last name"
                        value={String(model.lastName.value ?? "")}
                        onChange={(next) => model.lastName.setValue(next)}
                        error={showErrors ? model.lastName.error : null}
                    />

                    <EditorField
                        label="Birthday"
                        value={String(model.birthday.value ?? "")}
                        onChange={(next) => model.birthday.setValue(next)}
                        error={showErrors ? model.birthday.error : null}
                        type="date"
                    />

                    <EditorField
                        label="Age"
                        value={String(model.age.value ?? "")}
                        onChange={() => {}}
                        error={showErrors ? model.age.error : null}
                        readOnly={true}
                    />

                    <div style={statusRowStyle}>
                        {userState.busy ? <span>Saving…</span> : null}
                        {userState.loadingList ? <span>Refreshing list…</span> : null}
                        {model.email.isAsyncValidating ? <span>Checking email…</span> : null}
                    </div>
                </div>

                <div style={modalFooterStyle}>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={userState.busy || userState.loadingModel}
                        style={secondaryButtonStyle}
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={onSave}
                        disabled={userState.busy || userState.loadingModel}
                        style={primaryButtonStyle}
                    >
                        {userState.busy ? "Saving..." : "Save"}
                    </button>
                </div>
            </div>
        </div>
    );
});

export default UserEditorModal;

const backdropStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0, 0, 0, 0.35)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    zIndex: 1000,
};

const modalStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 620,
    maxHeight: "90vh",
    overflowY: "auto",
    background: "#fff",
    borderRadius: 12,
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)",
    border: "1px solid #ddd",
};

const modalHeaderStyle: React.CSSProperties = {
    padding: "18px 20px 12px",
    borderBottom: "1px solid #eee",
};

const titleStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 22,
    lineHeight: 1.2,
};

const subtitleStyle: React.CSSProperties = {
    marginTop: 6,
    fontSize: 13,
    opacity: 0.7,
};

const modalBodyStyle: React.CSSProperties = {
    padding: 20,
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 14,
};

const modalFooterStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    padding: "14px 20px 20px",
    borderTop: "1px solid #eee",
};

const fieldWrapStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 6,
};

const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
    width: "100%",
    height: 38,
    padding: "0 10px",
    border: "1px solid #ccc",
    borderRadius: 8,
    fontSize: 14,
    boxSizing: "border-box",
};

const errorTextStyle: React.CSSProperties = {
    minHeight: 18,
    fontSize: 12,
    color: "#b00020",
};

const statusRowStyle: React.CSSProperties = {
    gridColumn: "1 / -1",
    display: "flex",
    gap: 14,
    minHeight: 20,
    fontSize: 13,
    opacity: 0.8,
    alignItems: "center",
};

const primaryButtonStyle: React.CSSProperties = {
    height: 36,
    padding: "0 14px",
    borderRadius: 8,
    border: "1px solid #222",
    background: "#222",
    color: "#fff",
    cursor: "pointer",
};

const secondaryButtonStyle: React.CSSProperties = {
    height: 36,
    padding: "0 14px",
    borderRadius: 8,
    border: "1px solid #ccc",
    background: "#fff",
    color: "#111",
    cursor: "pointer",
};