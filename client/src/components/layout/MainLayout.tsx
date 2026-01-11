import React from 'react';
import { Sidebar } from './Sidebar';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-background">
        <div className="fixed top-0 left-0 w-full z-50 bg-sidebar flex items-center justify-between px-4 h-14 border-b border-border shadow-sm">
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="shadow md:hidden"
                aria-label="Open sidebar menu"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="pl-0 p-0 w-64 max-w-full md:hidden"
              aria-labelledby="mobile-sidebar-title"
              aria-describedby="mobile-sidebar-description"
            >
              <div className="sr-only" id="mobile-sidebar-title">Navigation menu</div>
              <div className="sr-only" id="mobile-sidebar-description">Sidebar navigation links</div>
              <Sidebar showCloseButton />
            </SheetContent>
          </Sheet>
          <span className="font-bold text-lg text-foreground flex items-center gap-2 mx-auto absolute left-1/2 -translate-x-1/2">
            <span className="text-primary text-2xl">♔</span>
            <span>Chess<span className="text-primary">TSG</span></span>
          </span>
          {/* Dummy flex box for symmetry, can be hidden or used for spacing */}
          <div className="w-10 h-10" />
        </div>
        <main className="pt-16 md:pt-0">{children}</main>
      </div>
    );
  }

  // Desktop/tablet: show sidebar as before
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
