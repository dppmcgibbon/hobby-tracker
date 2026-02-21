import { BsfGameplayNav } from "@/components/game-progress/bsf-gameplay-nav";

export default function BsfGameplayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <BsfGameplayNav />
      {children}
    </>
  );
}
