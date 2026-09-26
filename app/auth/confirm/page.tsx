import { Brand } from "@/components/ui/brand";
import { ConfirmSignIn } from "@/components/confirm-sign-in";
export const metadata = {
  title: "Confirm your sign-in",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function ConfirmPage() {
  return (
    <div className="form-page">
      <Brand />
      <main id="main-content" className="form-card glass">
        <span className="overline">YOUR SEAT IS WAITING</span>
        <h1>Let’s get you settled.</h1>
        <ConfirmSignIn />
      </main>
    </div>
  );
}
