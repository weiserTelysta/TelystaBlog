import { ADMIN_EMAIL } from './permissions';
import { HttpError } from './http';

const reserved = new Set(['admin','administrator','root','api','console','login','register','system','support','telysta','weiser']);
export function usernameInput(value: unknown, email?: string): string {
 if (typeof value !== 'string') throw new HttpError(400, '请输入用户名。', 'USERNAME_INVALID', 'username');
 const username = value.trim().toLowerCase();
 if (!/^[a-z][a-z0-9_-]{2,23}$/.test(username)) throw new HttpError(400, '用户名须以字母开头，使用3–24位字母、数字、下划线或短横线。', 'USERNAME_INVALID', 'username');
 if (reserved.has(username) && !(email === ADMIN_EMAIL && username === 'weiser')) throw new HttpError(409, '这个用户名不可使用，请换一个。', 'USERNAME_TAKEN', 'username');
 return username;
}
export function displayNameInput(value: unknown): string {
 if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > 40 || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/.test(value)) throw new HttpError(400, '昵称应为1–40个可见字符。');
 return value.trim();
}
