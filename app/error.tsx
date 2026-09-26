"use client";
import { useEffect } from "react";
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error", error);
  }, [error]);
  return (
    <main id="main-content" className="form-page">
      <div className="form-card glass">
        <h1>A brief intermission.</h1>
        <p>Something went wrong loading this page. Please try again.</p>
        <button className="button button-primary" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
