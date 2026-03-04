import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  onMenuClick?: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  return (
    <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="h-full flex items-center justify-between px-3 sm:px-4 md:px-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={onMenuClick}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-foreground truncate">{title}</h1>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          {/* Static app badge (no auth) */}
          <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-background/60 border border-border/60 shadow-sm">
            <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border border-primary/30">
              <AvatarImage src="" alt="QX Monitor" />
              <AvatarFallback className="bg-primary/10 text-primary text-xs sm:text-sm font-medium">
                QX
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-xs font-medium text-foreground">QX Monitor</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
