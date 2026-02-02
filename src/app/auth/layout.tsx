export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background warhammer-bg relative overflow-hidden">
      {/* Atmospheric vignette effect */}
      <div className="absolute inset-0 bg-gradient-radial from-transparent via-black/40 to-black/60 pointer-events-none" />
      
      {/* Decorative corner elements */}
      <div className="absolute top-0 left-0 w-32 h-32 border-l-2 border-t-2 border-primary/20" />
      <div className="absolute top-0 right-0 w-32 h-32 border-r-2 border-t-2 border-primary/20" />
      <div className="absolute bottom-0 left-0 w-32 h-32 border-l-2 border-b-2 border-primary/20" />
      <div className="absolute bottom-0 right-0 w-32 h-32 border-r-2 border-b-2 border-primary/20" />
      
      <div className="w-full max-w-md px-4 relative z-10">{children}</div>
    </div>
  );
}
