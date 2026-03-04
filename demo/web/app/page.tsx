import Link from "next/link";

export default function Page() {
    return (
        <main>
            <h1>mobx-models demo</h1>

            <div style={{ marginTop: 16 }}>
                <Link href="/users">View users (SQLite demo)</Link>
            </div>
        </main>
    );
}