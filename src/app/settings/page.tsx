"use client"

import { useState, useEffect } from "react"
import { SidebarNav } from "@/components/nav-main"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useUser, useAccount } from "@/appwrite"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { UserService, type UserDocument } from "@/appwrite/database"

export default function SettingsPage() {
  const { user, isUserLoading } = useUser()
  const account = useAccount()
  const router = useRouter()

  const [profile, setProfile] = useState<UserDocument | null>(null)
  const [isProfileLoading, setIsProfileLoading] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push("/login")
    }
  }, [user, isUserLoading, router])

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return
      setIsProfileLoading(true)
      try {
        const userProfile = await UserService.getUserById(user.$id)
        setProfile(userProfile)
      } catch (error) {
        console.error('Failed to fetch profile:', error)
      } finally {
        setIsProfileLoading(false)
      }
    }

    fetchProfile()
  }, [user])


  if (isUserLoading || isProfileLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-background pb-20 md:pb-0">
      <SidebarNav />

      <main className="flex-1 md:mr-16 md:ml-16 p-3 md:p-8 mt-16 md:mt-0">
        <div className="max-w-6xl mx-auto space-y-4 md:space-y-6 w-full px-3 md:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
              <p className="text-muted-foreground">Manage your account and preferences.</p>
            </div>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <div className="p-2 bg-muted rounded-md">
                    {profile?.name || user?.name || 'Not set'}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <div className="p-2 bg-muted rounded-md">
                    {user?.email || 'Unknown'}
                  </div>
                  <p className="text-xs text-muted-foreground italic">Note: Email address cannot be changed.</p>
                </div>
              </CardContent>
            </Card>


          </div>
        </div>
      </main>
    </div>
  )
}