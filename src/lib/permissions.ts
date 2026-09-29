/**
 * Everything a person can be allowed to do, as a fixed list in code. A role (created by an admin in the
 * admin panel and stored in the database) is a named selection of these. The list lives in code because
 * each entry is enforced by code somewhere: a new permission needs a new check.
 */
export const PERMISSIONS = [
  'panel.open',
  'panel.alerts',
  'panel.donors',
  'panel.requests',
  'panel.hospitals',
  'panel.fraud',
  'panel.logs',
  'roles.manage',
  'ops.command',
  'stock.own',
  'stock.all',
  'camps.create',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/** How the admin panel groups the permissions when it shows them as checkboxes. */
export const PERMISSION_GROUPS: { id: 'admin' | 'ops' | 'hospital'; permissions: Permission[] }[] = [
  {
    id: 'admin',
    permissions: ['panel.open', 'panel.alerts', 'panel.donors', 'panel.requests', 'panel.hospitals', 'panel.fraud', 'panel.logs', 'roles.manage'],
  },
  { id: 'ops', permissions: ['ops.command'] },
  { id: 'hospital', permissions: ['stock.own', 'stock.all', 'camps.create'] },
];

/** The full Admin role. */
export const ADMIN_PERMISSIONS: readonly Permission[] = PERMISSIONS;

/** The built-in Hospital staff role: their own hospital's stock, and camps. */
export const HOSPITAL_PERMISSIONS: readonly Permission[] = ['stock.own', 'camps.create'];

/** Permissions that only make sense inside the admin panel, so they also need `panel.open`. */
const NEEDS_PANEL: readonly Permission[] = ['panel.alerts', 'panel.donors', 'panel.requests', 'panel.hospitals', 'panel.fraud', 'panel.logs', 'roles.manage'];

/** Permissions the demo switch `NEXT_PUBLIC_ADMIN_OPEN` opens (the admin area, not hospital stock). */
export const ADMIN_AREA_PERMISSIONS: readonly Permission[] = ['panel.open', ...NEEDS_PANEL, 'ops.command'];

export function isPermission(value: unknown): value is Permission {
  return typeof value === 'string' && (PERMISSIONS as readonly string[]).includes(value);
}

/**
 * Cleans a list of permissions: keeps only real ones, removes repeats, adds `panel.open` when something
 * inside the panel is chosen (otherwise the role could never open the panel), and returns them in catalogue order.
 */
export function normalizePermissions(list: unknown): Permission[] {
  if (!Array.isArray(list)) return [];
  const chosen = new Set<Permission>(list.filter(isPermission));
  if (NEEDS_PANEL.some((permission) => chosen.has(permission))) chosen.add('panel.open');
  return PERMISSIONS.filter((permission) => chosen.has(permission));
}

/** A role that may change only its own hospital (not all of them) must be tied to one hospital when it is given to someone. */
export function needsHospital(permissions: readonly Permission[]): boolean {
  return permissions.includes('stock.own') && !permissions.includes('stock.all');
}
