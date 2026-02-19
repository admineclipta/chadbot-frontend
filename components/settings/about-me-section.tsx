"use client"

import { useState } from "react"
import { Card, CardBody, CardHeader, Divider, Chip, Accordion, AccordionItem, Skeleton, User as HeroUser, Popover, PopoverTrigger, PopoverContent, Input, Button } from "@heroui/react"
import { Mail, Hash, Calendar, Shield, CheckCircle, XCircle, Info, Lock } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { apiService, ApiError } from "@/lib/api"
import { toast } from "sonner"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function AboutMeSection() {
  const { data: currentUser, loading, error } = useApi(
    () => apiService.getCurrentUser(),
    []
  )

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [passwordErrors, setPasswordErrors] = useState<{
    current?: string
    newPass?: string
    confirm?: string
    general?: string
  }>({})
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  if (loading) {
    return (
      <div className="py-6 space-y-4">
        <Card>
          <CardBody className="space-y-4">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </CardBody>
        </Card>
      </div>
    )
  }

  if (error || !currentUser) {
    return (
      <div className="py-6">
        <Card>
          <CardBody>
            <p className="text-danger">Error al cargar la información del usuario</p>
          </CardBody>
        </Card>
      </div>
    )
  }

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP 'a las' p", { locale: es })
    } catch {
      return dateString
    }
  }

  const validatePasswordForm = () => {
    const errors: { current?: string; newPass?: string; confirm?: string } = {}

    if (!currentPassword.trim()) {
      errors.current = "Ingresa tu contraseña actual"
    }

    if (!newPassword.trim()) {
      errors.newPass = "Ingresa tu nueva contraseña"
    } else if (newPassword.length < 8) {
      errors.newPass = "La nueva contraseña debe tener al menos 8 caracteres"
    } else if (newPassword === currentPassword) {
      errors.newPass = "La nueva contraseña debe ser diferente a la actual"
    }

    if (!confirmPassword.trim()) {
      errors.confirm = "Confirma tu nueva contraseña"
    } else if (confirmPassword !== newPassword) {
      errors.confirm = "Las contraseñas no coinciden"
    }

    setPasswordErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handlePasswordChange = async () => {
    if (!validatePasswordForm()) return

    try {
      setIsUpdatingPassword(true)
      setPasswordErrors({})

      await apiService.changePassword({
        currentPassword,
        newPassword,
      })

      toast.success("Contraseña actualizada correctamente")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error) {
      console.error("Error updating password:", error)
      const message =
        error instanceof ApiError
          ? error.message
          : "No se pudo actualizar la contraseña"

      setPasswordErrors((prev) => ({ ...prev, general: message }))
      toast.error(message)
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="py-4 md:py-6 space-y-4 md:space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader className="flex gap-3">
          <div className="flex flex-col w-full">
            <p className="text-md font-semibold">Información Personal</p>
            <p className="text-small text-default-500">Datos de tu cuenta</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Avatar and Name */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <HeroUser
              name={currentUser.name}
              description={currentUser.displayName}
              avatarProps={{
                size: "lg",
                name: currentUser.name,
                showFallback: true,
              }}
            />
            <Chip
              color={currentUser.active ? "success" : "danger"}
              variant="flat"
              startContent={currentUser.active ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            >
              {currentUser.active ? "Activo" : "Inactivo"}
            </Chip>
          </div>

          <Divider />

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-default-400 mt-0.5" />
              <div>
                <p className="text-sm text-default-500">Email</p>
                <p className="font-medium">{currentUser.email}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-default-400 mt-0.5" />
              <div>
                <p className="text-sm text-default-500">ID de Usuario</p>
                <p className="font-mono text-xs">{currentUser.id}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-default-400 mt-0.5" />
              <div>
                <p className="text-sm text-default-500">ID de Cliente</p>
                <p className="font-mono text-xs">{currentUser.clientId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-5 w-5 text-default-400 mt-0.5" />
              <div>
                <p className="text-sm text-default-500">ID de Agente</p>
                <p className="font-mono text-xs">{currentUser.agentId}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-default-400 mt-0.5" />
              <div>
                <p className="text-sm text-default-500">Fecha de Creación</p>
                <p className="text-sm">{formatDate(currentUser.createdAt)}</p>
              </div>
            </div>

            {currentUser.lastLoginAt && (
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-default-400 mt-0.5" />
                <div>
                  <p className="text-sm text-default-500">Último Acceso</p>
                  <p className="text-sm">{formatDate(currentUser.lastLoginAt)}</p>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* Security Card */}
      <Card>
        <CardHeader className="flex gap-3">
          <Lock className="h-5 w-5" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Seguridad</p>
            <p className="text-small text-default-500">Actualiza tu contraseña para mantener tu cuenta protegida</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="p-4 md:p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Contraseña actual"
              type="password"
              placeholder="Ingresa tu contraseña actual"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              isInvalid={!!passwordErrors.current}
              errorMessage={passwordErrors.current}
              isDisabled={isUpdatingPassword}
            />
            <Input
              label="Nueva contraseña"
              type="password"
              placeholder="Mínimo 8 caracteres"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              isInvalid={!!passwordErrors.newPass}
              errorMessage={passwordErrors.newPass}
              isDisabled={isUpdatingPassword}
            />
          </div>
          <Input
            label="Confirmar nueva contraseña"
            type="password"
            placeholder="Repite la nueva contraseña"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            isInvalid={!!passwordErrors.confirm}
            errorMessage={passwordErrors.confirm}
            isDisabled={isUpdatingPassword}
          />

          {passwordErrors.general && (
            <p className="text-sm text-danger">{passwordErrors.general}</p>
          )}

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3">
            <Button
              variant="flat"
              onPress={() => {
                setCurrentPassword("")
                setNewPassword("")
                setConfirmPassword("")
                setPasswordErrors({})
              }}
              isDisabled={isUpdatingPassword}
            >
              Limpiar
            </Button>
            <Button
              color="primary"
              onPress={handlePasswordChange}
              isLoading={isUpdatingPassword}
            >
              Cambiar contraseña
            </Button>
          </div>
        </CardBody>
      </Card>

      {/* Roles Card */}
      <Card>
        <CardHeader className="flex gap-3">
          <Shield className="h-5 w-5" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">Roles y Permisos</p>
            <p className="text-small text-default-500">Tus roles asignados y permisos asociados</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <Accordion variant="splitted">
            {currentUser.roles.map((role) => (
              <AccordionItem
                key={role.id}
                aria-label={role.name}
                title={
                  <div className="flex items-center gap-2">
                    <Chip color="primary" variant="flat" size="sm">
                      {role.code}
                    </Chip>
                    <span className="font-medium">{role.name}</span>
                    {role.description && (
                      <Popover placement="right" showArrow>
                        <PopoverTrigger>
                          <button
                            className="inline-flex items-center justify-center rounded-full hover:bg-default-200 dark:hover:bg-default-100 transition-colors"
                            style={{ width: '20px', height: '20px', minWidth: '20px' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Info className="w-4 h-4 text-default-400 hover:text-default-600 dark:hover:text-default-300" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent className="max-w-xs">
                          <div className="px-1 py-2">
                            <div className="text-small font-bold mb-1">Descripción</div>
                            <div className="text-tiny text-default-600 dark:text-default-300">{role.description}</div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                  </div>
                }
              >
                <div className="space-y-2 pb-2">
                  <p className="text-sm text-default-500 mb-3">
                    Permisos incluidos en este rol:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission) => (
                      <div key={permission.id} className="inline-flex">
                        {permission.description ? (
                          <Popover placement="top" showArrow>
                            <PopoverTrigger>
                              <div className="cursor-help">
                                <Chip
                                  variant="bordered"
                                  size="sm"
                                  classNames={{
                                    base: "border-default-200",
                                  }}
                                >
                                  {permission.name}
                                </Chip>
                              </div>
                            </PopoverTrigger>
                            <PopoverContent className="max-w-xs">
                              <div className="px-1 py-2">
                                <div className="text-small font-bold mb-1">Descripción</div>
                                <div className="text-tiny text-default-600 dark:text-default-300">{permission.description}</div>
                                <div className="text-[10px] text-default-400 mt-2">Código: {permission.code}</div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        ) : (
                          <Chip
                            variant="bordered"
                            size="sm"
                            classNames={{
                              base: "border-default-200",
                            }}
                          >
                            {permission.name}
                          </Chip>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </AccordionItem>
            ))}
          </Accordion>

          {currentUser.permissions && currentUser.permissions.length > 0 && (
            <>
              <Divider className="my-4" />
              <div>
                <p className="text-sm font-semibold mb-3">Permisos Adicionales (fuera de roles)</p>
                <div className="flex flex-wrap gap-2">
                  {currentUser.permissions.map((permission) => (
                    <div key={permission.id} className="inline-flex">
                      {permission.description ? (
                        <Popover placement="top" showArrow>
                          <PopoverTrigger>
                            <div className="cursor-help">
                              <Chip
                                color="secondary"
                                variant="flat"
                                size="sm"
                              >
                                {permission.name}
                              </Chip>
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="max-w-xs">
                            <div className="px-1 py-2">
                              <div className="text-small font-bold mb-1">Descripción</div>
                              <div className="text-tiny text-default-600 dark:text-default-300">{permission.description}</div>
                              {permission.code && (
                                <div className="text-[10px] text-default-400 mt-2">Código: {permission.code}</div>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : (
                        <Chip
                          color="secondary"
                          variant="flat"
                          size="sm"
                        >
                          {permission.name}
                        </Chip>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  )
}
