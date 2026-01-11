"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import TeamManagement from "@/components/team-management"
import { apiService } from "@/lib/api"

export default function TeamsPage() {
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = apiService.getToken()
    if (!token) {
      router.push("/login")
      return
    }
    setIsAuthenticated(true)
    setIsLoading(false)
  }, [router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="h-full">
      <TeamManagement />
    </div>
  )
}
