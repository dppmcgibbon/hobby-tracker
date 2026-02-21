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

const APPS = [
  { num: 1, title: "Hostiles", href: "https://mcchew.github.io/blackstone" },
  { num: 2, title: "Unofficial", href: "https://dire.github.io/blackstone/" },
  { num: 3, title: "Base Generator", href: "https://blackstonebases.netlify.app/" },
] as const;

export default async function BsfAppsPage() {
  await requireAuth();

  return (
    <Card className="warhammer-card border-primary/30">
      <CardHeader>
        <h2 className="text-xl font-bold uppercase tracking-wide text-primary">
          Apps
        </h2>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow className="border-primary/20">
              <TableHead className="w-16 text-center">#</TableHead>
              <TableHead>App</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {APPS.map(({ num, title, href }) => (
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
