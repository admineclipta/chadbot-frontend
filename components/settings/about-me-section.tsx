"use client"

import { Card, CardBody, CardHeader, Divider, Chip, Accordion, AccordionItem, Skeleton, User as HeroUser } from "@heroui/react"
import { Mail, Hash, Calendar, Shield, CheckCircle, XCircle } from "lucide-react"
import { useApi } from "@/hooks/use-api"
import { apiService } from "@/lib/api"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default function AboutMeSection() {
  const { data: currentUser, loading, error } = useApi(
    () => apiService.getCurrentUser(),
    []
  )

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

  return (
    <div className="py-6 space-y-6">
      {/* User Info Card */}
      <Card>
        <CardHeader className="flex gap-3">
          <div className="flex flex-col w-full">
            <p className="text-md font-semibold">Información Personal</p>
            <p className="text-small text-default-500">Datos de tu cuenta</p>
          </div>
        </CardHeader>
        <Divider />
        <CardBody className="space-y-6">
          {/* Avatar and Name */}
          <div className="flex items-center gap-4">
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
                  </div>
                }
              >
                <div className="space-y-2 pb-2">
                  <p className="text-sm text-default-500 mb-3">
                    Permisos incluidos en este rol:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {role.permissions.map((permission) => (
                      <Chip
                        key={permission.id}
                        variant="bordered"
                        size="sm"
                        classNames={{
                          base: "border-default-200",
                        }}
                      >
                        <div className="flex flex-col items-start py-1">
                          <span className="font-medium text-xs">{permission.name}</span>
                          <span className="text-[10px] text-default-400">{permission.code}</span>
                        </div>
                      </Chip>
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
                    <Chip
                      key={permission.id}
                      color="secondary"
                      variant="flat"
                      size="sm"
                    >
                      <div className="flex flex-col items-start py-1">
                        <span className="font-medium text-xs">{permission.name}</span>
                        <span className="text-[10px]">{permission.description}</span>
                      </div>
                    </Chip>
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
