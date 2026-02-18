import { requireAuth, getProfile } from "@/lib/auth/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogoutButton } from "@/components/shared/logout-button";
import { Home, Package, Palette, User, FolderOpen, Settings } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  const profile = await getProfile();

  const initials = profile?.display_name
    ? profile.display_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
    : user.email?.substring(0, 2).toUpperCase() || "U";

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Warhammer Gothic Style */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-primary/30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 shadow-lg shadow-black/50">
        <div className="container flex h-16 items-center">
          <div className="mr-8 flex">
            <Link href="/dashboard" className="flex items-center group">
              <span className="font-black text-xl tracking-wider uppercase gold-glow text-primary">
                Hobby Tracker
              </span>
            </Link>
          </div>

          <nav className="flex items-center space-x-1 text-xs font-bold flex-1 uppercase tracking-wide">
            <Link
              href="/dashboard"
              className="px-3 py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30"
            >
              <Home className="h-4 w-4 inline-block mr-1.5" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/miniatures"
              className="px-3 py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30"
            >
              <Package className="h-4 w-4 inline-block mr-1.5" />
              Miniatures
            </Link>
            <Link
              href="/dashboard/shortcuts"
              className="px-3 py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30"
            >
              <Package className="h-4 w-4 inline-block mr-1.5" />
              Shortcuts
            </Link>
            <Link
              href="/dashboard/collections"
              className="px-3 py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30"
            >
              <FolderOpen className="h-4 w-4 inline-block mr-1.5" />
              Collections
            </Link>
            <Link
              href="/dashboard/paints"
              className="px-3 py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30"
            >
              <Palette className="h-4 w-4 inline-block mr-1.5" />
              Paints
            </Link>
            <Link
              href="/dashboard/admin"
              className="px-3 py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30"
            >
              <Settings className="h-4 w-4 inline-block mr-1.5" />
              Admin
            </Link>
          </nav>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-sm border border-primary/20 hover:border-primary hover:bg-primary/10 transition-all">
                <Avatar className="h-9 w-9 rounded-sm">
                  <AvatarFallback className="rounded-sm bg-gradient-to-br from-primary to-primary/70 text-black font-black">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-card border-primary/30" align="end" forceMount>
              <DropdownMenuLabel className="font-bold uppercase text-xs tracking-wide text-primary">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-bold leading-none">
                    {profile?.display_name || "User"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground normal-case">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-primary/20" />
              <DropdownMenuItem asChild className="font-semibold uppercase text-xs tracking-wide cursor-pointer">
                <Link href="/dashboard/profile">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-primary/20" />
              <LogoutButton />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 py-8 mx-auto max-w-[1600px]">
        {children}
      </main>
    </div>
  );
}
