import { useState, useCallback, useRef, useEffect } from "react";
import { apiService } from "@/lib/api";
import type {
  UserDto,
  UserRequest,
  UserUpdateRequest,
  UserListResponse,
} from "@/lib/api-types";
import { toast } from "sonner";

export interface UseUserManagementOptions {
  onSuccess?: (action: "create" | "update" | "delete", user?: UserDto) => void;
  onError?: (
    action: "create" | "update" | "delete" | "fetch",
    error: Error
  ) => void;
}

export function useUserManagement(options: UseUserManagementOptions = {}) {
  const [users, setUsers] = useState<UserDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Usar useRef para evitar recrear las funciones cuando options cambia
  const optionsRef = useRef(options);

  // Actualizar la referencia cuando options cambia
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Cargar lista de usuarios
  const loadUsers = useCallback(async (page: number = 0, size: number = 20) => {
    try {
      setLoading(true);

      const response = await apiService.getUsers(page, size);

      // Validar que la respuesta tenga la estructura esperada
      if (!response || !response.content) {
        console.error("Invalid response structure:", response);
        throw new Error("La respuesta no contiene usuarios");
      }

      if (!Array.isArray(response.content)) {
        console.error(
          "content is not an array:",
          typeof response.content,
          response.content
        );
        throw new Error("La estructura de usuarios no es válida");
      }

      setUsers(response.content);
      setTotalCount(response.totalElements);
      return response;
    } catch (error) {
      console.error("Error in loadUsers:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al cargar usuarios: ${errorMessage}`);
      optionsRef.current.onError?.("fetch", error as Error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obtener un usuario específico
  const getUser = useCallback(async (id: string): Promise<UserDto> => {
    try {
      const userDto = await apiService.getUserById(id);
      return userDto;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al obtener usuario: ${errorMessage}`);
      optionsRef.current.onError?.("fetch", error as Error);
      throw error;
    }
  }, []);

  // Crear usuario
  const createUser = useCallback(async (userData: UserRequest) => {
    try {
      const newUser = await apiService.createUser(userData);

      setUsers((prev) => [...prev, newUser]);
      setTotalCount((prev) => prev + 1);
      toast.success("Usuario creado exitosamente");
      optionsRef.current.onSuccess?.("create", newUser);
      return newUser;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al crear usuario: ${errorMessage}`);
      optionsRef.current.onError?.("create", error as Error);
      throw error;
    }
  }, []);

  // Actualizar usuario
  const updateUser = useCallback(
    async (id: string, userData: UserUpdateRequest) => {
      try {
        const updatedUser = await apiService.updateUser(id, userData);

        setUsers((prev) => {
          const updatedUsers = prev.map((user) =>
            user.id === id ? updatedUser : user
          );
          return [...updatedUsers]; // Crear un nuevo array para forzar re-render
        });
        toast.success("Usuario actualizado exitosamente");
        optionsRef.current.onSuccess?.("update", updatedUser);
        return updatedUser;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        toast.error(`Error al actualizar usuario: ${errorMessage}`);
        optionsRef.current.onError?.("update", error as Error);
        throw error;
      }
    },
    []
  );

  // Eliminar usuario
  const deleteUser = useCallback(async (id: string) => {
    try {
      await apiService.deleteUser(id);
      setUsers((prev) => prev.filter((user) => user.id !== id));
      setTotalCount((prev) => Math.max(0, prev - 1));
      toast.success("Usuario eliminado exitosamente");
      optionsRef.current.onSuccess?.("delete");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Error desconocido";
      toast.error(`Error al eliminar usuario: ${errorMessage}`);
      optionsRef.current.onError?.("delete", error as Error);
      throw error;
    }
  }, []);

  // Activar/desactivar usuario
  const toggleUserStatus = useCallback(
    async (user: UserDto) => {
      const updatedData: UserUpdateRequest = {
        IsActive: !user.active,
      };
      return updateUser(user.id, updatedData);
    },
    [updateUser]
  );

  return {
    users,
    loading,
    totalCount,
    loadUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    toggleUserStatus,
  };
}
