export const ADMIN_EMAIL = 'weiser@telysta.com';
// Stored role names remain stable: admin is the sole owner; superuser is a delegated review administrator.
export const ROLES = ['viewer', 'member', 'superuser', 'admin'] as const;
export type Role = typeof ROLES[number];
export type User = { id: string; email: string; role: Role; status: 'active' | 'suspended'; restricted_access?: number; display_name?: string | null; username?: string | null; email_verified_at?: number | null; credential_version?: number; has_password?: number };
export type Capability = 'restricted:read' | 'own:write' | 'content:review' | 'users:manage' | 'site:manage';
const capabilities: Record<Role, readonly Capability[]> = {
 viewer: [], member: ['own:write'],
 superuser: ['own:write', 'content:review'],
 admin: ['restricted:read', 'own:write', 'content:review', 'users:manage', 'site:manage'],
};
export function can(user: User | null, capability: Capability) {
 if (!user || user.status !== 'active') return false;
 if (capability === 'restricted:read') return user.role === 'admin' || user.restricted_access === 1;
 return capabilities[user.role].includes(capability);
}
export function publicDisplayName(user: Pick<User, 'id' | 'display_name' | 'username'>) { return user.display_name?.trim() || user.username || '读者 ' + user.id.replaceAll('-', '').slice(0, 6); }
export function normalizeEmail(value: unknown) {
 if (typeof value !== 'string') return null;
 const email = value.trim().toLowerCase();
 return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ? email : null;
}
