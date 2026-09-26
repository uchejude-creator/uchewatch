import { Heart } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { JoinRoomForm } from "@/components/join-room-form";
export const metadata = { title: "Join a watch party" };
export default function JoinPage() {
  return (
    <div className="form-page">
      <Brand />
      <main id="main-content" className="form-card glass">
        <div className="form-icon">
          <Heart size={25} />
        </div>
        <span className="overline">THE BEST SEAT IS NEXT TO THEM</span>
        <h1>
          You’re invited to
          <br />
          watch together.
        </h1>
        <p>
          Someone saved you a seat. Enter your room code and make yourself at
          home.
        </p>
        <JoinRoomForm />
      </main>
    </div>
  );
}
