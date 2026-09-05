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
import {
  Home,
  Package,
  Gamepad2,
  Palette,
  User,
  FolderOpen,
  Settings,
  Layers,
  Trophy,
  Shield,
  ChevronDown,
  LayoutGrid,
} from "lucide-react";

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

  const isDaithi =
    (profile?.display_name?.toLowerCase().includes("daithi") ||
      user.email?.toLowerCase().includes("daithi")) ??
    false;

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Warhammer Gothic Style */}
      <header className="sticky top-0 z-50 w-full border-b-2 border-primary/30 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/90 shadow-lg shadow-black/50">
        <div className="container flex h-16 items-center justify-between gap-2">
          <div className="mr-3 sm:mr-8 flex shrink-0">
            <Link href="/dashboard/shortcuts" className="flex items-center group">
              <span className="font-black text-lg sm:text-xl tracking-wider uppercase gold-glow text-primary whitespace-nowrap">
                Hobby Tracker
              </span>
            </Link>
          </div>

          <nav className="flex items-center space-x-1 text-xs font-bold flex-1 min-w-0 uppercase tracking-wide overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden py-1">
            <Link
              href="/dashboard/games"
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30 whitespace-nowrap"
            >
              <Gamepad2 className="h-4 w-4 inline-block mr-1.5" />
              Games
            </Link>
            <Link
              href="/dashboard/miniatures"
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30 whitespace-nowrap"
            >
              <Package className="h-4 w-4 inline-block mr-1.5" />
              Miniatures
            </Link>

            {isDaithi && (
              <Link
                href="/dashboard/admin"
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30 whitespace-nowrap"
              >
                <Settings className="h-4 w-4 inline-block mr-1.5" />
                Admin
              </Link>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center text-xs font-bold uppercase tracking-wide px-2.5 py-1.5 sm:px-3 sm:py-2 transition-all hover:text-primary hover:bg-primary/10 rounded border border-transparent hover:border-primary/30 outline-none cursor-pointer data-[state=open]:text-primary data-[state=open]:bg-primary/10 data-[state=open]:border-primary/30 whitespace-nowrap [&_svg:last-child]:transition-transform [&_svg:last-child]:duration-200 data-[state=open]:[&_svg:last-child]:rotate-180"
                >
                  <LayoutGrid className="h-4 w-4 inline-block mr-1.5" />
                  <span>OTHER</span>
                  <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 bg-card border-primary/30 shadow-lg shadow-black/50"
                align="end"
              >
                <DropdownMenuItem
                  asChild
                  className="font-semibold uppercase text-xs tracking-wide cursor-pointer hover:text-primary hover:bg-primary/10 focus:text-primary focus:bg-primary/10"
                >
                  <Link href="/dashboard" className="flex items-center w-full">
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="font-semibold uppercase text-xs tracking-wide cursor-pointer hover:text-primary hover:bg-primary/10 focus:text-primary focus:bg-primary/10"
                >
                  <Link href="/dashboard/legions" className="flex items-center w-full">
                    <Shield className="mr-2 h-4 w-4" />
                    Legions
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem
                  asChild
                  className="font-semibold uppercase text-xs tracking-wide cursor-pointer hover:text-primary hover:bg-primary/10 focus:text-primary focus:bg-primary/10"
                >
                  <Link href="/dashboard/shortcuts" className="flex items-center w-full">
                    <Package className="mr-2 h-4 w-4" />
                    Shortcuts
                  </Link>
                </DropdownMenuItem>
                {isDaithi && (
                  <DropdownMenuItem
                    asChild
                    className="font-semibold uppercase text-xs tracking-wide cursor-pointer hover:text-primary hover:bg-primary/10 focus:text-primary focus:bg-primary/10"
                  >
                    <Link href="/dashboard/collections" className="flex items-center w-full">
                      <FolderOpen className="mr-2 h-4 w-4" />
                      Collections
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem
                  asChild
                  className="font-semibold uppercase text-xs tracking-wide cursor-pointer hover:text-primary hover:bg-primary/10 focus:text-primary focus:bg-primary/10"
                >
                  <Link href="/dashboard/paints" className="flex items-center w-full">
                    <Palette className="mr-2 h-4 w-4" />
                    Paints
                  </Link>
                </DropdownMenuItem>
                {isDaithi && (
                  <DropdownMenuItem
                    asChild
                    className="font-semibold uppercase text-xs tracking-wide cursor-pointer hover:text-primary hover:bg-primary/10 focus:text-primary focus:bg-primary/10"
                  >
                    <Link href="/dashboard/collect-apps" className="flex items-center w-full">
                      <Layers className="mr-2 h-4 w-4" />
                      Collect
                    </Link>
                  </DropdownMenuItem>
                )}
                {isDaithi && (
                  <DropdownMenuItem
                    asChild
                    className="font-semibold uppercase text-xs tracking-wide cursor-pointer hover:text-primary hover:bg-primary/10 focus:text-primary focus:bg-primary/10"
                  >
                    <Link href="/dashboard/game-progress" className="flex items-center w-full">
                      <Trophy className="mr-2 h-4 w-4" />
                      Game Progress
                    </Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          <div className="flex items-center shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-sm border border-primary/20 hover:border-primary hover:bg-primary/10 transition-all"
                >
                  <Avatar className="h-9 w-9 rounded-sm">
                    <AvatarFallback className="rounded-sm bg-gradient-to-br from-primary to-primary/70 text-black font-black">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 bg-card border-primary/30"
                align="end"
                forceMount
              >
                <DropdownMenuLabel className="font-bold uppercase text-xs tracking-wide text-primary">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-bold leading-none">
                      {profile?.display_name || "User"}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground normal-case">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-primary/20" />
                <DropdownMenuItem
                  asChild
                  className="font-semibold uppercase text-xs tracking-wide cursor-pointer"
                >
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
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 py-8 mx-auto max-w-[1920px]">
        {children}
      </main>
    </div>
  );
}
