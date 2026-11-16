import {
	bind,
	button,
	el,
	field,
	icon,
	locale,
	setLocale,
	word
} from './ui.js';
const copy = {
	zh: {
		login: '登录',
		register: '创建账户',
		reset: '找回密码',
		owner: '设置站主账户',
		identifier: '用户名或邮箱',
		username: '用户名',
		email: '邮箱',
		password: '密码',
		code: '六位验证码',
		send: '获取验证码',
		expiry: '5 分钟内有效',
		passwordHelp: '至少15个字符，可使用空格与中文。',
		usernameHelp: '以字母开头，3–24位字母、数字、下划线或短横线。',
		show: '显示密码',
		hide: '隐藏密码',
		registerSubmit: '验证邮箱并创建账户',
		resetSubmit: '重置密码',
		ownerSubmit: '保存并进入控制台',
		back: '返回登录',
		sent: '验证码已发送，五分钟内有效。',
		working: '正在处理…',
		sending: '正在发送…',
		resetDone: '密码已重置，请使用新密码登录。',
		checking: '正在检查用户名…',
		available: '用户名可用',
		unavailable: '这个用户名不可使用，请换一个。',
		failed: '操作未完成，请检查输入或稍后重试。',
		setupHint: '首次设置请使用专属初始化入口。',
		loading: '正在读取账户…',
		profile: '账户设置',
		displayName: '昵称',
		profileHint: '公开署名使用昵称或用户名，不公开邮箱。',
		saveProfile: '保存昵称',
		savedProfile: '昵称已保存。',
		currentPassword: '当前密码',
		newPassword: '新密码',
		changePassword: '修改密码',
		changedPassword: '密码已修改，其他设备已退出。'
	},
	en: {
		login: 'Sign in',
		register: 'Create account',
		reset: 'Reset password',
		owner: 'Set up owner account',
		identifier: 'Username or email',
		username: 'Username',
		email: 'Email',
		password: 'Password',
		code: 'Verification code',
		send: 'Send code',
		expiry: 'Valid for 5 minutes',
		passwordHelp: 'At least 15 characters. Spaces and Unicode are welcome.',
		usernameHelp:
			'3–24 letters, numbers, underscores or hyphens; start with a letter.',
		show: 'Show password',
		hide: 'Hide password',
		registerSubmit: 'Verify email and create account',
		resetSubmit: 'Reset password',
		ownerSubmit: 'Save and enter console',
		back: 'Back to sign in',
		sent: 'Code sent. It expires in five minutes.',
		working: 'Working…',
		sending: 'Sending…',
		resetDone: 'Password reset. Sign in with your new password.',
		checking: 'Checking username…',
		available: 'Username available',
		unavailable: 'This username is unavailable. Choose another.',
		failed:
			'Unable to complete this action. Check your details or try again later.',
		setupHint: 'Use your private initialization link for first-time setup.',
		loading: 'Loading your account…',
		profile: 'Account settings',
		displayName: 'Display name',
		profileHint:
			'Public credit uses your display name or username, never your email.',
		saveProfile: 'Save display name',
		savedProfile: 'Display name saved.',
		currentPassword: 'Current password',
		newPassword: 'New password',
		changePassword: 'Change password',
		changedPassword: 'Password changed. Other devices are signed out.'
	}
};
const errors = {
	USERNAME_INVALID:
		'Use 3–24 letters, numbers, underscores or hyphens, starting with a letter.',
	USERNAME_TAKEN: 'This username is unavailable. Choose another.',
	USERNAME_REQUIRED: 'Choose a username to complete account recovery.',
	PASSWORD_INVALID: 'Use no more than 128 characters and no null characters.',
	PASSWORD_WEAK: 'Use at least 15 characters and avoid common passwords.',
	EMAIL_INVALID: 'Enter a valid email address.',
	CODE_INVALID: 'This code is incorrect or expired. Request a new one.',
	LOGIN_INVALID: 'The username, email or password is incorrect.',
	CURRENT_PASSWORD_INVALID: 'Your current password is incorrect.',
	ACCOUNT_EXISTS:
		'This email already has an account. Sign in or reset its password.',
	OWNER_SETUP_REQUIRED:
		'Use your private initialization link to set up the owner account.',
	OWNER_INITIALIZED:
		'The owner account is already set up. Sign in with its password.',
	HTTP_400: 'Check the details you entered.',
	HTTP_401: 'Sign in again to continue.',
	HTTP_403: 'You do not have permission to do this.',
	HTTP_409: 'The account state changed. Check your details and try again.',
	HTTP_413: 'The request is too large.',
	HTTP_429: 'Too many attempts. Please wait and try again.',
	HTTP_503: 'The service is temporarily unavailable. Try again later.'
};
export const authError = (error) =>
	locale() === 'en'
		? errors[error.code] || copy.en.failed
		: error.message || copy.zh.failed;
const label = (key) => () => copy[locale()][key];
function eye(toggle, input) {
	toggle.replaceChildren(icon(input.type === 'password' ? 'eye' : 'eyeOff'));
	toggle.setAttribute(
		'aria-label',
		copy[locale()][input.type === 'password' ? 'show' : 'hide']
	);
	toggle.setAttribute('aria-pressed', String(input.type !== 'password'));
}
export function initAuthentication({
	api,
	authenticated,
	profileUpdated,
	adminEntry
}) {
	const $ = (selector) => document.querySelector(selector),
		form = $('#login-form'),
		fieldNames = ['identifier', 'username', 'email', 'password', 'code'];
	let entry = {},
		mode = 'login',
		busy = false,
		needsUsername = false,
		timer,
		checkTimer,
		checkGeneration = 0;
	const fragment = new URLSearchParams(location.hash.slice(1));
	let setupToken = fragment.get('setup');
	if (setupToken) {
		const url = new URL(location.href);
		url.hash = '';
		history.replaceState({}, '', url.pathname + url.search);
	}
	const sentTimes = new Map(),
		text = () => copy[locale()],
		value = (name) => $('#' + name).value;
	function errorsOff() {
		for (const name of fieldNames) {
			$('#' + name).setCustomValidity('');
			$('#' + name).removeAttribute('aria-invalid');
			$('#' + name + '-error').textContent = '';
		}
		$('#login-status').textContent = '';
	}
	function cooldown() {
		const left = Math.max(
			0,
			Math.ceil(
				((sentTimes.get(value('email').trim().toLowerCase()) || 0) +
					60000 -
					Date.now()) /
					1000
			)
		);
		$('#send-code').disabled = busy || left > 0;
		$('#send-code').textContent = left
			? locale() === 'en'
				? `Resend in ${left}s`
				: `${left} 秒后重发`
			: text().send;
	}
	function render() {
		$('#loading').textContent = text().loading;
		$('#login-title').textContent = text()[mode];
		$('#auth-language').textContent = locale() === 'zh' ? 'English' : '中文';
		$('#auth-language').lang = locale() === 'zh' ? 'en' : 'zh-CN';
		const shown = {
			identifier: mode === 'login',
			username:
				mode === 'register' ||
				mode === 'owner' ||
				(mode === 'reset' && needsUsername),
			email: mode !== 'login',
			password: true,
			code: mode === 'register' || mode === 'reset'
		};
		for (const name of fieldNames) {
			$('#' + name + '-field').hidden = !shown[name];
			$('#' + name).disabled = !shown[name] || busy;
			$('#' + name).required = !!shown[name];
			document.querySelector(`label[for="${name}"]`).textContent = text()[name];
		}
		$('#email').readOnly = mode === 'owner' || adminEntry;
		$('#send-code').hidden = mode === 'owner';
		$('#username').readOnly = false;
		$('#password').autocomplete =
			mode === 'login' ? 'current-password' : 'new-password';
		$('#password-help').hidden = mode === 'login';
		$('#password-help').textContent = text().passwordHelp;
		$('#username-help').textContent = text().usernameHelp;
		$('#code-expiry').textContent = text().expiry;
		$('#sign-in').textContent =
			mode === 'login' ? text().login : text()[mode + 'Submit'];
		$('#sign-in').disabled = busy;
		$('#password-toggle').disabled = busy;
		eye($('#password-toggle'), $('#password'));
		form.setAttribute('aria-busy', String(busy));
		cooldown();
		const options = $('#auth-modes');
		options.replaceChildren();
		function link(key, next) {
			const a = el('a', text()[key], 'text-button');
			a.href = '?view=' + next;
			a.setAttribute('aria-disabled', String(busy));
			a.addEventListener('click', (event) => {
				if (
					event.button ||
					event.ctrlKey ||
					event.metaKey ||
					event.shiftKey ||
					event.altKey
				)
					return;
				event.preventDefault();
				if (!busy) show(next);
			});
			options.append(a);
		}
		if (mode === 'login') {
			if (!adminEntry) link('register', 'register');
			link('reset', 'reset');
			if (adminEntry && entry.setupRequired)
				options.append(el('p', text().setupHint, 'field-help'));
		} else link('back', 'login');
	}
	function setBusy(next) {
		busy = next;
		render();
	}
	function show(next, historyUpdate = true) {
		if (busy) return;
		mode = ['login', 'register', 'reset', 'owner'].includes(next)
			? next
			: 'login';
		if (adminEntry && mode === 'register') mode = 'login';
		checkGeneration++;
		clearTimeout(checkTimer);
		needsUsername = false;
		errorsOff();
		$('#password').value = '';
		$('#password').type = 'password';
		$('#code').value = '';
		$('#username-status').textContent = '';
		if (mode === 'owner') {
			$('#email').value = entry.email || 'weiser@telysta.com';
			$('#username').value = entry.username || 'telysta';
		}
		if (historyUpdate) {
			const url = new URL(location.href);
			url.searchParams.set('view', mode);
			history.pushState({}, '', url.pathname + url.search);
		}
		render();
	}
	function failure(error) {
		setBusy(false);
		$('#login-status').textContent = authError(error);
		if (error.code === 'USERNAME_REQUIRED') {
			needsUsername = true;
			render();
		}
		const input = fieldNames.includes(error.field)
			? $('#' + error.field)
			: null;
		if (input && !input.disabled) {
			input.setAttribute('aria-invalid', 'true');
			$('#' + error.field + '-error').textContent = authError(error);
			input.focus();
		}
	}
	async function accept(user) {
		$('#password').value = '';
		$('#code').value = '';
		if (user.role === 'admin' && user.needsSetup) {
			document.body.removeAttribute('data-authenticated');
			$('#account').hidden = true;
			$('#login').hidden = false;
			$('#loading').hidden = true;
			busy = false;
			show('owner', false);
			return;
		}
		await authenticated(user);
	}
	$('#auth-language').addEventListener('click', () =>
		setLocale(locale() === 'zh' ? 'en' : 'zh')
	);
	window.addEventListener('console-locale-change', () => {
		errorsOff();
		render();
	});
	$('#password-toggle').addEventListener('click', () => {
		$('#password').type =
			$('#password').type === 'password' ? 'text' : 'password';
		eye($('#password-toggle'), $('#password'));
	});
	for (const name of fieldNames)
		$('#' + name).addEventListener('input', () => {
			$('#' + name).setCustomValidity('');
			$('#' + name).removeAttribute('aria-invalid');
			$('#' + name + '-error').textContent = '';
			if (name === 'email') {
				$('#code').value = '';
				cooldown();
			}
		});
	$('#username').addEventListener('input', () => {
		const ticket = ++checkGeneration;
		clearTimeout(checkTimer);
		$('#username-status').textContent = '';
		const username = value('username');
		if (!/^[a-z][a-z0-9_-]{2,23}$/i.test(username)) return;
		checkTimer = setTimeout(async () => {
			$('#username-status').textContent = text().checking;
			try {
				const result = await api(
					'auth/username?value=' + encodeURIComponent(username)
				);
				if (ticket === checkGeneration)
					$('#username-status').textContent = result.available
						? text().available
						: text().unavailable;
			} catch {
				if (ticket === checkGeneration) $('#username-status').textContent = '';
			}
		}, 500);
	});
	$('#send-code').addEventListener('click', async () => {
		if (busy || !$('#email').reportValidity()) return;
		const email = value('email').trim().toLowerCase(),
			purpose = mode === 'reset' ? 'reset' : 'register';
		errorsOff();
		setBusy(true);
		$('#login-status').textContent = text().sending;
		let focus = false;
		try {
			await api('auth/code', {
				method: 'POST',
				body: JSON.stringify({ email, purpose })
			});
			sentTimes.set(email, Date.now());
			$('#login-status').textContent = text().sent;
			focus = true;
		} catch (error) {
			failure(error);
		} finally {
			setBusy(false);
			if (focus) $('#code').focus();
		}
	});
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (busy) return;
		errorsOff();
		if (
			mode !== 'login' &&
			([...value('password')].length < 15 ||
				[...value('password')].length > 128)
		) {
			$('#password').setCustomValidity(text().passwordHelp);
			$('#password').reportValidity();
			return;
		}
		if (!form.reportValidity()) return;
		const email = value('email').trim().toLowerCase(),
			password = value('password'),
			username = value('username');
		const path =
			mode === 'owner'
				? 'owner-setup'
				: mode === 'register'
					? 'register'
					: mode === 'reset'
						? 'reset'
						: 'login';
		const payload =
			mode === 'login'
				? { identifier: value('identifier'), password }
				: mode === 'owner'
					? { username, password, ...(setupToken ? { token: setupToken } : {}) }
					: {
							email,
							password,
							code: value('code'),
							...(mode === 'register' || needsUsername ? { username } : {})
						};
		setBusy(true);
		$('#login-status').textContent = text().working;
		try {
			const result = await api('auth/' + path, {
				method: 'POST',
				body: JSON.stringify(payload)
			});
			if (mode === 'reset') {
				setBusy(false);
				show('login');
				$('#identifier').value = email;
				$('#login-status').textContent = text().resetDone;
				$('#password').focus();
			} else {
				setupToken = null;
				await accept(result.user);
			}
		} catch (error) {
			failure(error);
		} finally {
			setBusy(false);
		}
	});
	const resumeTimer = () => {
		if (timer === undefined) timer = setInterval(cooldown, 1000);
		cooldown();
	};
	resumeTimer();
	window.addEventListener('pagehide', () => {
		clearInterval(timer);
		timer = undefined;
	});
	window.addEventListener('pageshow', resumeTimer);
	window.addEventListener('popstate', () =>
		show(new URL(location.href).searchParams.get('view') || 'login', false)
	);
	show(new URL(location.href).searchParams.get('view') || 'login', false);
	return {
		configure(next) {
			entry = next || {};
			if (adminEntry) {
				$('#email').value = entry.email || 'weiser@telysta.com';
				$('#identifier').value = entry.username || 'telysta';
				if (setupToken && entry.setupRequired) show('owner', false);
			}
			render();
		},
		resume: accept,
		show,
		unavailable() {
			$('#loading').hidden = true;
			$('#login').hidden = false;
			$('#login-status').textContent =
				locale() === 'en'
					? errors.HTTP_503
					: '暂时无法读取登录状态，请稍后刷新。';
		},
		async profile(container, user) {
			container.replaceChildren();
			const form = el('form');
			form.method = 'post';
			form.action = './api/profile';
			const name = el('input');
			name.value = user.displayName || user.username || '';
			name.maxLength = 40;
			name.required = true;
			const save = button(label('saveProfile'), () => {});
			save.type = 'submit';
			const status = el('p', '', 'form-status');
			status.setAttribute('role', 'status');
			const details = el('dl', '', 'account-details');
			for (const [key, value] of [
				['username', user.username || ''],
				['email', user.email]
			]) {
				details.append(el('dt', label(key)), el('dd', value));
			}
			form.append(
				field(label('displayName'), name, label('profileHint')),
				save
			);
			container.append(details, form, status);
			form.addEventListener('submit', async (event) => {
				event.preventDefault();
				save.disabled = true;
				try {
					const result = await api('profile', {
						method: 'PATCH',
						body: JSON.stringify({ displayName: name.value })
					});
					profileUpdated(result);
					bind(status, label('savedProfile'));
				} catch (error) {
					status.textContent = authError(error);
				} finally {
					save.disabled = false;
				}
			});
			if (user.needsSetup) {
				const reset = el('a', label('reset'));
				reset.href = '?view=reset';
				reset.addEventListener('click', (event) => {
					event.preventDefault();
					$('#account').hidden = true;
					$('#login').hidden = false;
					$('#email').value = user.email;
					show('reset');
				});
				container.append(reset);
				return;
			}
			const change = el('form', '', 'account-password-form');
			change.method = 'post';
			change.action = './api/auth/password';
			function passwordField(key) {
				const input = el('input');
				input.type = 'password';
				input.autocomplete =
					key === 'currentPassword' ? 'current-password' : 'new-password';
				input.required = true;
				input.maxLength = 512;
				const wrap = el('div', '', 'password-field'),
					toggle = button('', () => {
						input.type = input.type === 'password' ? 'text' : 'password';
						eye(toggle, input);
					});
				eye(toggle, input);
				bind(
					toggle,
					() => text()[input.type === 'password' ? 'show' : 'hide'],
					'aria-label'
				);
				wrap.append(input, toggle);
				const group = field(label(key), input);
				group.append(wrap);
				wrap.prepend(input);
				return { group, input };
			}
			const current = passwordField('currentPassword'),
				next = passwordField('newPassword'),
				submit = button(label('changePassword'), () => {});
			submit.type = 'submit';
			change.append(
				current.group,
				next.group,
				el('p', label('passwordHelp'), 'field-help'),
				submit
			);
			change.addEventListener('submit', async (event) => {
				event.preventDefault();
				if (
					[...next.input.value].length < 15 ||
					[...next.input.value].length > 128
				) {
					next.input.setCustomValidity(text().passwordHelp);
					next.input.reportValidity();
					return;
				}
				submit.disabled = true;
				try {
					const result = await api('auth/password', {
						method: 'POST',
						body: JSON.stringify({
							currentPassword: current.input.value,
							password: next.input.value
						})
					});
					current.input.value = '';
					next.input.value = '';
					profileUpdated(result.user);
					bind(status, label('changedPassword'));
				} catch (error) {
					status.textContent = authError(error);
				} finally {
					submit.disabled = false;
				}
			});
			next.input.addEventListener('input', () =>
				next.input.setCustomValidity('')
			);
			container.append(change);
		}
	};
}
