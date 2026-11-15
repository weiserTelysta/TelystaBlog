export const ADMIN_EMAIL = 'weiser@telysta.com';
// Stored role names remain stable: admin is the sole owner; superuser is a delegated review administrator.
export const ROLES = ['viewer', 'member', 'superuser', 'admin'] as const;
export type Role = typeof ROLES[number];
export type User = { id: string; email: string; role: Role; status: 'active' | 'suspended' };
export type Capability = 'restricted:read' | 'own:write' | 'content:review' | 'users:manage' | 'site:manage';
const capabilities: Record<Role, readonly Capability[]> = {
 viewer: [], member: ['restricted:read', 'own:write'],
 superuser: ['restricted:read', 'own:write', 'content:review'],
 admin: ['restricted:read', 'own:write', 'content:review', 'users:manage', 'site:manage'],
};
export function can(user: User | null, capability: Capability) { return !!user && user.status === 'active' && capabilities[user.role].includes(capability); }
export function normalizeEmail(value: unknown) {
 if (typeof value !== 'string') return null;
 const email = value.trim().toLowerCase();
 return email.length <= 254 && /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(email) ? email : null;
}
