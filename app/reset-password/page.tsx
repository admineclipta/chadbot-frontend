"use client"

import { Suspense, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import ResetPasswordClient from "./ResetPasswordClient"

function ResetPasswordPageContent() {
  const searchParams = useSearchParams()

  const token = useMemo(() => {
    const value = searchParams.get("h")
    return value ?? ""
  }, [searchParams])

  return <ResetPasswordClient token={token} />
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordClient token="" />}>
      <ResetPasswordPageContent />
    </Suspense>
  )
}
