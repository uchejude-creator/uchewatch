import { notFound } from "next/navigation";
import { RoomGate } from "@/components/watch/room-gate";
export const metadata = {
  title: "Your private cinema",
  robots: { index: false, follow: false },
};
export default async function RoomPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  )
    notFound();
  return <RoomGate id={id} />;
}
