import Link from "next/link";
import { redirect } from "next/navigation";
import { serverSupabase } from "@/lib/supabase/server";
import { Brand } from "@/components/ui/brand";
import { AccountForm } from "@/components/account-form";
export const metadata = { title: "Your profile" };
export default async function Account() {
  const supabase = await serverSupabase();
  if (!supabase) redirect("/sign-in?next=/account");
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in?next=/account");
  const { data } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  return (
    <div className="form-page">
      <Brand />
      <main id="main-content" className="form-card glass">
        <span className="overline">MAKE YOURSELF AT HOME</span>
        <h1>A familiar face.</h1>
        <p>A name your favorite people will recognize.</p>
        <AccountForm
          initialName={
            data?.display_name || user.user_metadata.display_name || "Guest"
          }
        />
        <Link
          className="text-button"
          style={{ display: "block" }}
          href="/create"
        >
          Start a watch party →
        </Link>
      </main>
    </div>
  );
}
