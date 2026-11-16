import { HttpError } from './http';
import { ADMIN_EMAIL, type User } from './permissions';
import {
	authAudit,
	authenticatedResponse,
	nowSeconds,
	sessionInsert,
	sessionToken,
	sessionUser,
	tokenHash,
	USER_FIELDS
} from './authTokens';
import { hashPassword, passwordInput } from './passwords';
import { usernameInput } from './usernames';

/** First password only. The existing owner session or a private single-use link proves control. */
export async function initializeOwner(
	request: Request,
	env: ConsoleEnv,
	input: Record<string, unknown>
) {
	if (
		Object.keys(input).some(
			(key) => !['username', 'password', 'token'].includes(key)
		)
	)
		throw new HttpError(400, '初始化参数无效。');
	const owner = await env.DB.prepare(
		`SELECT ${USER_FIELDS},password_hash FROM users WHERE email=?1`
	)
		.bind(ADMIN_EMAIL)
		.first<
			User & { password_hash: string | null; credential_version: number }
		>();
	if (!owner || owner.password_hash)
		throw new HttpError(
			409,
			'站主账户已设置，请使用密码登录。',
			'OWNER_INITIALIZED'
		);
	const now = nowSeconds(),
		current = await sessionUser(env, request.headers.get('Cookie'));
	const ownerSession =
		current?.email === ADMIN_EMAIL
			? sessionToken(request.headers.get('Cookie'))
			: null;
	const proof =
		typeof input.token === 'string' && /^[a-f0-9]{64}$/.test(input.token)
			? await tokenHash(input.token)
			: null;
	if (!ownerSession && !proof)
		throw new HttpError(403, '请使用站主初始化链接。', 'OWNER_SETUP_REQUIRED');
	const sessionHash = ownerSession ? await tokenHash(ownerSession) : null;
	if (
		!ownerSession &&
		!(await env.DB.prepare(
			"SELECT id FROM owner_initialization WHERE id='owner' AND token_hash=?1 AND expires_at>?2 AND used_at IS NULL"
		)
			.bind(proof, now)
			.first())
	)
		throw new HttpError(
			403,
			'初始化链接无效或已过期。',
			'OWNER_SETUP_REQUIRED'
		);
	const username = usernameInput(input.username, ADMIN_EMAIL),
		password = passwordInput(input.password);
	const occupied = await env.DB.prepare(
		'SELECT id FROM users WHERE username=?1 AND id<>?2'
	)
		.bind(username, owner.id)
		.first();
	if (occupied)
		throw new HttpError(
			409,
			'这个用户名已被使用，请换一个。',
			'USERNAME_TAKEN',
			'username'
		);
	const hash = await hashPassword(password, env.AUTH_PEPPER),
		version = owner.credential_version + 1;
	const next = await sessionInsert(env, request, owner.id, version, null, hash);
	const results = await env.DB.batch([
		env.DB.prepare(
			`UPDATE users SET username=?1,password_hash=?2,credential_version=?3,updated_at=?4,email_verified_at=coalesce(email_verified_at,?4)
   WHERE id=?5 AND email=?6 AND password_hash IS NULL AND status='active' AND credential_version=?7
   AND NOT EXISTS(SELECT 1 FROM users WHERE username=?1 AND id<>?5)
   AND (EXISTS(SELECT 1 FROM sessions WHERE user_id=?5 AND token_hash=?8 AND expires_at>?4 AND credential_version=?7)
    OR EXISTS(SELECT 1 FROM owner_initialization WHERE id='owner' AND token_hash=?9 AND expires_at>?4 AND used_at IS NULL)) RETURNING id`
		).bind(
			username,
			hash,
			version,
			now,
			owner.id,
			ADMIN_EMAIL,
			owner.credential_version,
			sessionHash,
			proof
		),
		env.DB.prepare(
			"UPDATE owner_initialization SET used_at=?1 WHERE id='owner' AND EXISTS(SELECT 1 FROM users WHERE id=?2 AND password_hash=?3)"
		).bind(now, owner.id, hash),
		env.DB.prepare(
			'DELETE FROM sessions WHERE user_id=?1 AND EXISTS(SELECT 1 FROM users WHERE id=?1 AND password_hash=?2)'
		).bind(owner.id, hash),
		next.statement,
		authAudit(env, owner.id, 'auth.owner.initialize', {
			sessionHash: await tokenHash(next.token)
		})
	]);
	if (!results[0].results.length || results[3].meta.changes !== 1)
		throw new HttpError(409, '账户状态已改变，请重新登录。');
	const fresh = await env.DB.prepare(
		`SELECT ${USER_FIELDS},1 AS has_password FROM users WHERE id=?1`
	)
		.bind(owner.id)
		.first<User>();
	return authenticatedResponse(env, fresh!, next.token);
}
export async function ownerEntry(env: ConsoleEnv) {
	const row = await env.DB.prepare(
		'SELECT username,password_hash IS NOT NULL AS ready FROM users WHERE email=?1'
	)
		.bind(ADMIN_EMAIL)
		.first<{ username: string | null; ready: number }>();
	return {
		admin: true,
		email: ADMIN_EMAIL,
		username: row?.username || 'telysta',
		setupRequired: !row?.ready
	};
}
