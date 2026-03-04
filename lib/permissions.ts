import type { User } from "./types";

function normalizeRoleCode(code?: string): string {
  return (code || "").trim().toLowerCase();
}

function hasRoleCode(user: User | null, predicate: (code: string) => boolean): boolean {
  if (!user?.roles || !Array.isArray(user.roles)) return false;
  return user.roles.some((role) => predicate(normalizeRoleCode(role.code)));
}

function isExplicitSuperAdmin(user: User | null): boolean {
  return hasRoleCode(
    user,
    (code) => code === "super_admin" || code === "superadmin",
  );
}

export function isOwnerOrAdmin(user: User | null): boolean {
  if (!user) return false;
  if (isExplicitSuperAdmin(user)) return false;

  return hasRoleCode(
    user,
    (code) =>
      code.includes("admin") || code.includes("administrador") || code === "owner",
  );
}

export function canManageMembershipBilling(user: User | null): boolean {
  return isOwnerOrAdmin(user);
}

export function canViewBilling(user: User | null): boolean {
  return isOwnerOrAdmin(user);
}

export function canViewMembership(user: User | null): boolean {
  return Boolean(user);
}

