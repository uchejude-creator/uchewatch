import Link from "next/link";
import { Heart } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { AuthForm } from "@/components/auth-form";
import { safeNext } from "@/lib/watch/youtube-url";
export const metadata = { title: "Welcome back" };
export default async function SignIn({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  return (
    <div className="form-page">
      <Brand />
      <main id="main-content" className="form-card glass">
        <div className="form-icon">
          <Heart size={24} />
        </div>
        <span className="overline">YOUR SEAT IS WAITING</span>
        <h1>Good to have you here.</h1>
        <p>Sign in to make a little space for you and your favorite people.</p>
        <AuthForm
          next={safeNext(params.next || null)}
          callbackError={!!params.error}
        />
        <div className="form-foot">
          Have an invitation? <Link href="/join">Join as a guest</Link>
        </div>
      </main>
      <Link className="text-button form-foot" href="/">
        Back to the good stuff
      </Link>
    </div>
  );
}
