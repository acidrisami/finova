"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Settings,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Home,
  Wallet,
  PiggyBank,
  FileText
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useUser, useAccount } from "@/appwrite"
import { AuthService } from "@/appwrite/auth"
import { useToast } from "@/hooks/use-toast"
import { Separator } from "@/components/ui/separator"

const navItems = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Income", href: "/income", icon: Wallet },
  { name: "Budgets", href: "/budgets", icon: PiggyBank },
  { name: "Records", href: "/transactions", icon: FileText },
]

export function SidebarNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()
  const { user } = useUser()
  const account = useAccount()
  const router = useRouter()
  const { toast } = useToast()

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebarCollapsed')
    if (saved) setIsCollapsed(saved === 'true')
  }, [])

  // Save collapsed state
  const toggleSidebar = () => {
    const newState = !isCollapsed
    setIsCollapsed(newState)
    localStorage.setItem('sidebarCollapsed', String(newState))
  }

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      toast({ title: "Logged Out", description: "Redirecting to login page..." })
      // Force a hard refresh to ensure auth state is cleared
      setTimeout(() => {
        window.location.href = "/login"
      }, 1000)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred during logout"
      })
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 bg-background border rounded-md shadow-md"
      >
        {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 bg-card border-r shadow-sm transform transition-all duration-300 ease-in-out flex flex-col",
        isCollapsed ? "w-16" : "w-64",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        "md:translate-x-0 md:static md:inset-0"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 border-b flex items-center justify-between">
            {!isCollapsed && <h1 className="text-xl font-bold tracking-tight text-primary">Finova</h1>}
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="md:hidden p-1 rounded-md hover:bg-accent"
            >
              <X className="h-5 w-5" />
            </button>
            <button
              onClick={toggleSidebar}
              className="hidden md:flex p-1 rounded-md hover:bg-accent ml-auto"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
            </button>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 text-sm font-semibold rounded-md transition-all duration-200",
                    pathname === item.href
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    isCollapsed && "justify-center"
                  )}
                  title={isCollapsed ? item.name : undefined}
                >
                  {isCollapsed ? (
                    <Icon className="h-5 w-5" />
                  ) : (
                    <>
                      <Icon className="h-4 w-4" />
                      {item.name}
                    </>
                  )}
                </Link>
              )
            })}
          </nav>

          <div className="mt-auto p-3 space-y-4">
            <Separator className="bg-border/60" />

            <div className="flex flex-col gap-1">
              <Link
                href="/settings"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200",
                  pathname === "/settings"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? "Settings" : undefined}
              >
                <Settings className="h-4 w-4" />
                {!isCollapsed && "Settings"}
              </Link>

              <button
                onClick={handleLogout}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 text-destructive hover:bg-destructive/10",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? "Log out" : undefined}
              >
                <LogOut className="h-4 w-4" />
                {!isCollapsed && "Log out"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  )
}

export function BottomNav() {
  const pathname = usePathname()
  const router = useRouter()
  const { toast } = useToast()

  const handleLogout = async () => {
    try {
      await AuthService.logout()
      toast({ title: "Logged Out", description: "Redirecting to login page..." })
      // Force a hard refresh to ensure auth state is cleared
      setTimeout(() => {
        window.location.href = "/login"
      }, 1000)
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Logout failed",
        description: error instanceof Error ? error.message : "An error occurred during logout"
      })
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-md border-t flex justify-around items-center h-16 md:hidden z-50 px-4">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex flex-col items-center justify-center transition-colors flex-1",
            pathname === item.href ? "text-primary" : "text-muted-foreground hover:text-primary"
          )}
        >
          <span className="text-[11px] font-bold uppercase tracking-wider">{item.name}</span>
        </Link>
      ))}
      <Link
        href="/settings"
        className={cn(
          "flex flex-col items-center justify-center transition-colors flex-1",
          pathname === "/settings" ? "text-primary" : "text-muted-foreground hover:text-primary"
        )}
      >
        <Settings className={cn("h-5 w-5", pathname === "/settings" && "scale-110")} />
      </Link>
      <button
        onClick={handleLogout}
        className="flex flex-col items-center justify-center transition-colors flex-1 text-destructive hover:text-destructive/80"
      >
        <LogOut className="h-5 w-5" />
      </button>
    </nav>
  )
}