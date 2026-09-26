import Link from "next/link";
import { Brand } from "@/components/ui/brand";
export default function NotFound() {
  return (
    <div className="form-page">
      <Brand />
      <main id="main-content" className="form-card glass">
        <span className="overline">A LITTLE LOST?</span>
        <h1>This seat hasn’t been saved.</h1>
        <p className="muted">
          That page doesn’t exist. Let’s get you back to movie night.
        </p>
        <Link className="button button-primary" href="/">
          Back home
        </Link>
      </main>
    </div>
  );
}
