import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/server";

export default async function BsfCurrentGamePage() {
  await requireAuth();
  redirect("/dashboard/game-progress/bsf/daithi");
}
