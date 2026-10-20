import Link from "next/link";

export default function HomePage() {
  return (
    <main className="auth-shell">
      <Link className="brand" href="/">TurnUp</Link>
      <section className="auth-card">
        <p className="eyebrow">Your campus, connected</p>
        <h1>Find events worth showing up for.</h1>
        <p className="muted">A place for people to come together around the things happening nearby.</p>
        <Link className="primary action-link" href="/signup">Create an account</Link>
        <p className="account-link">Already have an account? <Link href="/login">Log in</Link></p>
      </section>
    </main>
  );
}
