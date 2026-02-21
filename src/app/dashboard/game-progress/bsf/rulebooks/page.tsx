import { requireAuth } from "@/lib/auth/server";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const RULEBOOKS = [
  { num: 1, title: "Background", href: "/game-progress/bsf/pdfs/bsf_background.pdf" },
  { num: 2, title: "Rules", href: "/game-progress/bsf/pdfs/bsf_rules.pdf" },
  { num: 3, title: "Combat", href: "/game-progress/bsf/pdfs/bsf_combat.pdf" },
  { num: 4, title: "Precipice", href: "/game-progress/bsf/pdfs/bsf_precipice.pdf" },
] as const;

export default async function BsfRulebooksPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <h2 className="text-xl font-bold uppercase tracking-wide text-primary">
          Rulebooks
        </h2>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="w-16 text-center">#</TableHead>
              <TableHead>PDF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {RULEBOOKS.map(({ num, title, href }) => (
              <TableRow key={num} className="border-primary/10">
                <TableCell className="text-center font-mono">{num}.</TableCell>
                <TableCell>
                  <Link
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline font-medium"
                  >
                    {title}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
