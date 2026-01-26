"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { Card, CardBody, Input, Button, CardHeader, CardFooter } from "@heroui/react"
import { Lock, CheckCircle, AlertTriangle, ArrowLeft } from "lucide-react"
import { apiService, ApiError } from "@/lib/api"
import { toast } from "sonner"

interface ResetPasswordClientProps {
  token: string
}

export default function ResetPasswordClient({ token }: ResetPasswordClientProps) {
  const router = useRouter()

  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [errors, setErrors] = useState<{ password?: string; confirm?: string; general?: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const resetUrl = useMemo(() => {
    if (!token) return ""
    if (typeof window === "undefined") return `/reset-password?h=${token}`
    return `${window.location.origin}/reset-password?h=${token}`
  }, [token])

  const validate = () => {
    const validation: { password?: string; confirm?: string } = {}
    if (!newPassword.trim()) {
      validation.password = "Ingresa tu nueva contraseña"
    } else if (newPassword.length < 8) {
      validation.password = "La contraseña debe tener al menos 8 caracteres"
    }

    if (!confirmPassword.trim()) {
      validation.confirm = "Confirma la contraseña"
    } else if (confirmPassword !== newPassword) {
      validation.confirm = "Las contraseñas no coinciden"
    }

    setErrors(validation)
    return Object.keys(validation).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) return
    if (!token) {
      setErrors({ general: "Token inválido" })
      return
    }

    try {
      setIsSubmitting(true)
      setErrors({})
      await apiService.resetPasswordWithToken(token, newPassword)
      toast.success("Contraseña restablecida correctamente")
      setIsSuccess(true)
    } catch (error) {
      console.error("Error resetting password", error)
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo restablecer la contraseña"
      setErrors({ general: message })
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 px-4 py-10">
      <div className="w-full max-w-lg">
        <Button
          variant="light"
          startContent={<ArrowLeft className="h-4 w-4" />}
          className="mb-4"
          onPress={() => router.push("/login")}
        >
          Volver al login
        </Button>

        <Card className="shadow-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <CardHeader className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-700">
            <div className="p-2 rounded-full bg-primary/10 text-primary">
              <Lock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900 dark:text-white">Restablecer contraseña</p>
              <p className="text-sm text-slate-500 dark:text-slate-300">Usa el enlace con ?h=HASH que recibiste para establecer tu nueva contraseña.</p>
            </div>
          </CardHeader>

          <CardBody className="space-y-4">
            {isSuccess ? (
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="p-3 rounded-full bg-success/10 text-success">
                  <CheckCircle className="h-6 w-6" />
                </div>
                <p className="text-base font-semibold">Contraseña actualizada</p>
                <p className="text-sm text-default-500">Ya puedes iniciar sesión con tu nueva contraseña.</p>
                <Button color="primary" onPress={() => router.push("/login")}>Ir al login</Button>
              </div>
            ) : (
              <>
                <Input
                  label="Nueva contraseña"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  isInvalid={!!errors.password}
                  errorMessage={errors.password}
                  isDisabled={isSubmitting}
                />

                <Input
                  label="Confirmar contraseña"
                  type="password"
                  placeholder="Repite tu nueva contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  isInvalid={!!errors.confirm}
                  errorMessage={errors.confirm}
                  isDisabled={isSubmitting}
                />

                {errors.general && (
                  <div className="flex items-center gap-2 text-danger text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>{errors.general}</span>
                  </div>
                )}
              </>
            )}
          </CardBody>

          {!isSuccess && (
            <CardFooter className="flex flex-col sm:flex-row sm:justify-between gap-3 border-t border-slate-200 dark:border-slate-700">
              <div className="text-xs text-default-500 break-all">
                Enlace (?h): {resetUrl || "No proporcionado"}
              </div>
              <Button color="primary" fullWidth={true} onPress={handleSubmit} isLoading={isSubmitting}>
                Restablecer contraseña
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  )
}
