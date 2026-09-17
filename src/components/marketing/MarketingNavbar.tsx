"use client"

import Link from "next/link"
import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { Menu } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { ThemeToggle } from "@/components/theme-toggle"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import Image from "next/image"

export function MarketingNavbar() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg leading-none">S</span>
            </div>
            <span className="font-bold text-lg tracking-tight hidden sm:inline-block">
              SYNCORA
            </span>
          </Link>
        </div>

        <NavigationMenu className="hidden md:flex">
          <NavigationMenuList>
            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="#features" />} className={navigationMenuTriggerStyle()}>
                Features
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="#how-it-works" />} className={navigationMenuTriggerStyle()}>
                How it works
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuTrigger>Solutions</NavigationMenuTrigger>
              <NavigationMenuContent>
                <div className="w-[800px] p-6 grid grid-cols-3 gap-6">
                  {/* Column 1: By Department */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold tracking-wider text-muted-foreground mb-2 uppercase">By Department</h4>
                    <Link href="/solutions/engineering" className="text-sm font-medium hover:text-primary transition-colors py-1">Engineering</Link>
                    <Link href="/solutions/it" className="text-sm font-medium hover:text-primary transition-colors py-1">IT</Link>
                    <Link href="/solutions/customer-service" className="text-sm font-medium hover:text-primary transition-colors py-1">Customer service</Link>
                    <Link href="/solutions/sales" className="text-sm font-medium hover:text-primary transition-colors py-1">Sales</Link>
                    <Link href="/solutions/project-management" className="text-sm font-medium hover:text-primary transition-colors py-1">Project management</Link>
                    <Link href="/solutions/marketing" className="text-sm font-medium hover:text-primary transition-colors py-1">Marketing</Link>
                    <Link href="/solutions/human-resources" className="text-sm font-medium hover:text-primary transition-colors py-1">Human Resources</Link>
                    <Link href="/solutions/security" className="text-sm font-medium hover:text-primary transition-colors py-1">Security</Link>
                  </div>

                  {/* Column 2: By Industry */}
                  <div className="flex flex-col gap-2">
                    <h4 className="text-xs font-bold tracking-wider text-muted-foreground mb-2 uppercase">By Industry</h4>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Manufacturing, auto and energy</Link>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Technology</Link>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Media</Link>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Small business</Link>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Financial services</Link>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Retail</Link>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Education</Link>
                    <Link href="#" className="text-sm font-medium hover:text-primary transition-colors py-1">Health and life sciences</Link>

                    <div className="mt-auto pt-6 text-sm font-medium">
                      <Link href="#" className="hover:underline">See all solutions</Link>
                    </div>
                  </div>

                  {/* Column 3: Template Gallery */}
                  <div className="flex flex-col rounded-lg bg-muted/50 p-4 border border-border/50">
                    <h4 className="text-xs font-bold tracking-wider mb-3 uppercase">Template Gallery</h4>
                    <div className="aspect-video w-full rounded-md bg-gradient-to-br from-violet-100 to-fuchsia-100 dark:from-violet-900/30 dark:to-fuchsia-900/30 flex items-center justify-center mb-4 overflow-hidden border">
                      <div className="flex gap-2 p-2">
                        <div className="h-16 w-20 bg-background rounded shadow-sm border opacity-80" />
                        <div className="flex flex-col gap-2">
                          <div className="h-6 w-24 bg-background rounded shadow-sm border opacity-80" />
                          <div className="h-8 w-24 bg-background rounded shadow-sm border opacity-80" />
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      Start work faster with pre-made templates for every task.
                    </p>
                    <Link href="#" className="text-sm font-semibold text-primary hover:underline mb-6 flex items-center gap-1">
                      See all templates &rarr;
                    </Link>

                    <div className="mt-auto flex flex-col gap-3 pt-4 border-t">
                      <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Task management</Link>
                      <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Scale</Link>
                      <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Engagement</Link>
                      <Link href="#" className="text-sm font-medium hover:text-primary transition-colors">Trust</Link>
                    </div>
                  </div>
                </div>
              </NavigationMenuContent>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="#enterprise" />} className={navigationMenuTriggerStyle()}>
                Enterprise
              </NavigationMenuLink>
            </NavigationMenuItem>

            <NavigationMenuItem>
              <NavigationMenuLink render={<Link href="#pricing" />} className={navigationMenuTriggerStyle()}>
                Pricing
              </NavigationMenuLink>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        <div className="hidden md:flex items-center gap-4">
          <ThemeToggle />
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className={buttonVariants({ size: "sm", className: "rounded-full px-6 font-semibold shadow-sm" })}>
            Get Started
          </Link>
        </div>

        {/* Mobile Menu */}
        <div className="md:hidden flex items-center gap-2">
          <ThemeToggle />
          <Sheet>
            <SheetTrigger aria-label="Open Mobile Menu" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "md:hidden")}>
              <Menu className="size-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] sm:w-[400px]">
              <SheetHeader className="text-left mb-8">
                <SheetTitle className="flex items-center space-x-2">
                  <div className="size-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg leading-none">S</span>
                  </div>
                  <span className="font-bold text-lg tracking-tight">SYNCORA</span>
                </SheetTitle>
              </SheetHeader>

              <div className="flex flex-col gap-6">
                <nav className="flex flex-col gap-4 text-base font-medium">
                  <Link href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
                    Features
                  </Link>
                  <Link href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
                    How it works
                  </Link>
                  <Link href="#solutions" className="text-muted-foreground hover:text-foreground transition-colors">
                    Solutions
                  </Link>
                  <Link href="#enterprise" className="text-muted-foreground hover:text-foreground transition-colors">
                    Enterprise
                  </Link>
                  <Link href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                  </Link>
                </nav>

                <div className="flex flex-col gap-3 mt-4 pt-6 border-t border-border">
                  <Link href="/login" className={buttonVariants({ variant: "outline", className: "w-full justify-center" })}>
                    Sign In
                  </Link>
                  <Link href="/signup" className={buttonVariants({ className: "w-full justify-center rounded-full font-semibold" })}>
                    Get Started
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
