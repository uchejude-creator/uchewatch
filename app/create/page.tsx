import Link from "next/link";
import { Clapperboard } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { CreateRoomForm } from "@/components/create-room-form";
export const metadata = { title: "Start a watch party" };
export default function CreatePage() {
  return (
    <div className="form-page">
      <Brand />
      <main id="main-content" className="form-card glass">
        <div className="form-icon">
          <Clapperboard size={25} />
        </div>
        <span className="overline">LET’S MAKE A NIGHT OF IT</span>
        <h1>What are we watching?</h1>
        <p>
          Pick something you love. Save a seat for someone you love watching
          with.
        </p>
        <CreateRoomForm />
      </main>
      <div className="form-foot">
        Already have a room code? <Link href="/join">Join your person</Link>
      </div>
    </div>
  );
}
