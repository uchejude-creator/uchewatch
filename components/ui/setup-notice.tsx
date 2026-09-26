import { Settings2 } from "lucide-react";
export function SetupNotice() {
  return (
    <div className="notice" role="status">
      <Settings2 size={20} />
      <div>
        <strong>Your cinema is almost ready.</strong>
        <p>
          Connect a Supabase project to enable accounts and live rooms. Add the
          project URL and publishable key to <code>.env.local</code>, then
          follow the setup in the README.
        </p>
      </div>
    </div>
  );
}
