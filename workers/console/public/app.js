import { initAuthentication, authError } from '../client/auth.js';
import {
	el,
	button,
	bind,
	word,
	locale,
	setLocale,
	icon,
	field,
	ask
} from '../client/ui.js';
import { editDocument } from '../client/editor.js';
import { operations } from '../client/operations.js';
const $ = (selector) => document.querySelector(selector),
	adminEntry = location.pathname.startsWith('/telysta-console');
const names = {
	post: ['文章', 'Articles'],
	ebook: ['书室', 'Library'],
	gallery: ['画廊', 'Gallery'],
	score: ['简谱', 'Scores'],
	config: ['站点设置', 'Site settings'],
	profile: ['账户设置', 'Account'],
	sessions: ['登录设备', 'Login devices'],
	users: ['用户与权限', 'Users & access'],
	uploads: ['上传资料', 'Uploads'],
	audit: ['操作记录', 'Activity'],
	backup: ['数据备份', 'Backups']
};
const roleNames = {
	viewer: ['普通用户', 'Reader'],
	member: ['正式用户', 'Contributor'],
	superuser: ['超级用户', 'Moderator'],
	admin: ['超级管理员', 'Site owner']
};
let user = null,
	active = 'profile',
	dirty = false,
	generation = 0,
	optionsCache;
const workspace = $('#workspace'),
	notice = $('#notice');
function tell(message) {
	bind(notice, message);
	notice.hidden = !word(message);
}
async function api(path, options = {}) {
	const response = await fetch('./api/' + path, {
		credentials: 'same-origin',
		cache: 'no-store',
		...options,
		headers: {
			...(options.body ? { 'Content-Type': 'application/json' } : {}),
			...options.headers
		}
	});
	let data;
	try {
		data = await response.json();
	} catch {
		data = {};
	}
	if (!response.ok) {
		const error = new Error(data.error || '操作暂时不可用。');
		error.code = data.code || 'HTTP_' + response.status;
		error.field = data.field;
		error.status = response.status;
		if (response.status === 401 && user && !path.startsWith('auth/')) {
			user = null;
			dirty = false;
			generation++;
			display();
			authentication.show('login');
		}
		throw error;
	}
	return data;
}
function display() {
	$('#loading').hidden = true;
	$('#login').hidden = !!user;
	$('#account').hidden = !user;
	document.body.toggleAttribute('data-authenticated', !!user);
	if (!user) {
		closeMenu();
		bind($('#identity'), '');
		workspace.replaceChildren();
		$('#navigation').replaceChildren();
		return;
	}
	bind(
		$('#identity'),
		() =>
			`${user.displayName || user.username || ''} · ${word(roleNames[user.role])}`
	);
	const groups = [];
	if (user.role === 'admin')
		groups.push([
			['内容管理', 'Content'],
			[
				['post', 'file'],
				['ebook', 'book'],
				['gallery', 'image'],
				['score', 'file'],
				['uploads', 'upload']
			]
		]);
	else if (['member', 'superuser'].includes(user.role))
		groups.push([['内容', 'Content'], [['uploads', 'upload']]]);
	if (user.role === 'admin')
		groups.push([
			['站点管理', 'Site management'],
			[
				['config', 'settings'],
				['users', 'users'],
				['audit', 'history'],
				['backup', 'archive']
			]
		]);
	groups.push([
		['个人账户', 'Account'],
		[
			['profile', 'users'],
			['sessions', 'device']
		]
	]);
	$('#navigation').replaceChildren();
	for (const [title, links] of groups) {
		const group = el('div', '', 'nav-group');
		group.append(el('p', title, 'nav-group-title'));
		for (const [key, image] of links) {
			const link = el('a', '', 'nav-item');
			link.href = '#' + key;
			link.append(icon(image), el('span', names[key]));
			if (key === active) link.setAttribute('aria-current', 'page');
			link.addEventListener('click', (event) => {
				event.preventDefault();
				void navigate(key);
			});
			group.append(link);
		}
		$('#navigation').append(group);
	}
	bind($('#current-task'), names[active] || names.profile);
}
async function leave() {
	return (
		!dirty ||
		(await ask([
			'尚有未保存的修改，确定离开吗？',
			'Leave without saving your changes?'
		]))
	);
}
async function navigate(key, force = false) {
	if (!force && !(await leave())) return;
	dirty = false;
	active = names[key] ? key : 'profile';
	const version = ++generation;
	display();
	tell('');
	closeMenu();
	history.replaceState(null, '', '#' + active);
	workspace.setAttribute('aria-busy', 'true');
	workspace.replaceChildren(
		el('p', ['正在读取…', 'Loading…'], 'loading-state')
	);
	const current = () => version === generation && !!user;
	const context = {
		api,
		workspace,
		current,
		tell,
		user,
		dirty: (value) => {
			dirty = value;
		},
		navigate,
		authentication,
		names
	};
	try {
		if (['post', 'ebook', 'gallery', 'score', 'config'].includes(active))
			await documents(active, context);
		else {
			workspace.replaceChildren();
			const heading = el('h1', names[active]);
			workspace.append(heading);
			if (active === 'profile')
				await authentication.profile(
					workspace.appendChild(el('section', '', 'profile-panel')),
					user
				);
			else await operations(active, context);
		}
	} catch (error) {
		if (current()) {
			workspace.replaceChildren(
				el('p', authError(error), 'empty'),
				button(['重试', 'Retry'], () => navigate(active, true))
			);
			tell(authError(error));
		}
	} finally {
		if (current()) workspace.removeAttribute('aria-busy');
	}
}
async function editor(id, kind, section) {
	if (!(await leave())) return;
	dirty = false;
	const version = ++generation;
	workspace.setAttribute('aria-busy', 'true');
	tell('');
	try {
		optionsCache ||= await api('editor/options');
		if (version !== generation) return;
		await editDocument({
			id,
			section,
			api,
			workspace,
			options: optionsCache,
			current: () => version === generation && !!user,
			tell,
			dirty: (value) => {
				dirty = value;
			},
			back: () => navigate(kind)
		});
	} catch (error) {
		tell(authError(error));
	} finally {
		if (version === generation) workspace.removeAttribute('aria-busy');
	}
}
async function documents(kind, context) {
	let offset = 0,
		loading = 0;
	const heading = el('div', '', 'workspace-heading');
	heading.append(el('h1', names[kind]));
	const toolbar = el('form', '', 'list-toolbar');
	toolbar.method = 'get';
	const query = el('input');
	query.type = 'search';
	query.maxLength = 100;
	bind(query, ['搜索名称', 'Search by name'], 'placeholder');
	bind(query, ['搜索内容', 'Search content'], 'aria-label');
	const search = button(['搜索', 'Search'], () => {});
	search.type = 'submit';
	toolbar.append(query, search);
	const list = el('div', '', 'content-list'),
		pages = el('nav', '', 'pagination');
	bind(pages, ['内容分页', 'Content pages'], 'aria-label');
	const createPanel = el('section', '', 'create-panel');
	createPanel.hidden = true;
	if (kind === 'post') {
		heading.append(
			button(
				['新建文章', 'New article'],
				() => {
					createPanel.hidden = !createPanel.hidden;
					if (!createPanel.hidden) createPanel.querySelector('input').focus();
				},
				'primary'
			)
		);
		const form = el('form'),
			title = el('input');
		title.required = true;
		title.maxLength = 300;
		const submit = button(['创建草稿', 'Create draft'], () => {}, 'primary');
		submit.type = 'submit';
		form.append(
			field(['文章标题', 'Article title'], title),
			submit,
			button(['取消', 'Cancel'], () => {
				createPanel.hidden = true;
			})
		);
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			submit.disabled = true;
			try {
				const created = await api('documents', {
					method: 'POST',
					body: JSON.stringify({ kind: 'post', title: title.value })
				});
				if (context.current()) await editor(created.id, kind);
			} catch (error) {
				tell(authError(error));
			} finally {
				submit.disabled = false;
			}
		});
		createPanel.append(form);
	}
	workspace.replaceChildren(heading, toolbar, createPanel, list, pages);
	toolbar.addEventListener('submit', (event) => {
		event.preventDefault();
		offset = 0;
		void load();
	});
	async function load() {
		const ticket = ++loading;
		list.setAttribute('aria-busy', 'true');
		try {
			const data = await api(
				`documents?kind=${kind}&offset=${offset}&q=${encodeURIComponent(query.value)}`
			);
			if (!context.current() || ticket !== loading) return;
			list.replaceChildren();
			if (kind === 'config') renderSettingsList(data.records);
			else {
				const table = el('table'),
					caption = el('caption', names[kind], 'sr-only'),
					head = el('thead'),
					row = el('tr');
				for (const title of [
					['名称', 'Name'],
					['状态', 'Status'],
					['更新日期', 'Updated'],
					['操作', 'Actions']
				]) {
					const th = el('th', title);
					th.scope = 'col';
					row.append(th);
				}
				head.append(row);
				const tbody = el('tbody');
				for (const record of data.records) {
					const row = el('tr'),
						name = el('td'),
						open = button(
							record.title,
							() => editor(record.id, kind),
							'record-link'
						);
					name.append(open);
					const state = el(
						'td',
						record.state === 'draft'
							? ['未发布修改', 'Unpublished changes']
							: ['已导入', 'Imported']
					);
					state.append(
						el(
							'span',
							record.access === 'protected'
								? [' · 受保护', ' · Protected']
								: [' · 公开', ' · Public'],
							'small muted'
						)
					);
					const date = el(
							'td',
							new Date(record.updated_at * 1000).toLocaleDateString(),
							'record-date'
						),
						action = el('td');
					action.append(
						button(['编辑', 'Edit'], () => editor(record.id, kind))
					);
					row.append(name, state, date, action);
					tbody.append(row);
				}
				table.append(caption, head, tbody);
				list.append(table);
			}
			if (!data.records.length)
				list.append(
					el(
						'p',
						[
							'没有匹配的内容。可尝试其他名称。',
							'No matching content. Try another name.'
						],
						'empty'
					)
				);
			pages.replaceChildren();
			const prev = button(['上一页', 'Previous'], () => {
					offset -= 100;
					void load();
				}),
				next = button(['下一页', 'Next'], () => {
					offset += 100;
					void load();
				});
			prev.disabled = offset === 0;
			next.disabled = offset + data.records.length >= data.total.count;
			pages.append(
				prev,
				el(
					'span',
					`${Math.floor(offset / 100) + 1} / ${Math.max(1, Math.ceil(data.total.count / 100))}`
				),
				next
			);
		} catch (error) {
			if (context.current()) tell(authError(error));
		} finally {
			if (context.current() && ticket === loading)
				list.removeAttribute('aria-busy');
		}
	}
	function renderSettingsList(records) {
		const categories = {
			site: ['站点身份', 'Site identity'],
			home: ['首页', 'Home'],
			pages: ['页面与阅读', 'Pages & reading'],
			content: ['分类与内容', 'Categories & content'],
			appearance: ['视觉设置', 'Appearance'],
			advanced: ['高级设置', 'Advanced settings']
		};
		for (const [group, label] of Object.entries(categories)) {
			const items = records.flatMap((record) =>
				(record.settings || [])
					.filter((item) => item.group === group)
					.map((item) => ({ record, item }))
			);
			if (!items.length) continue;
			const section = el('section', '', 'settings-list');
			section.append(el('h2', label));
			const rows = el('ul', '', 'records');
			for (const { record, item } of items) {
				const li = el('li'),
					copy = el('div');
				copy.append(
					button(
						item.title,
						() => editor(record.id, kind, item.name),
						'record-link'
					),
					el('p', item.description, 'record-meta')
				);
				li.append(
					copy,
					button(['编辑', 'Edit'], () => editor(record.id, kind, item.name))
				);
				rows.append(li);
			}
			section.append(rows);
			list.append(section);
		}
	}
	await load();
}
const menu = $('#mobile-menu'),
	sidebar = $('#console-sidebar'),
	menuTrigger = $('#menu-trigger');
function closeMenu() {
	if (menu.open) {
		menu.close();
		$('#account').prepend(sidebar);
		menuTrigger.setAttribute('aria-expanded', 'false');
		menuTrigger.focus({ preventScroll: true });
	}
}
menuTrigger.append(icon('menu'));
menuTrigger.addEventListener('click', () => {
	menu.append(sidebar);
	menu.showModal();
	menuTrigger.setAttribute('aria-expanded', 'true');
	$('#menu-close').focus();
});
$('#menu-close').append(icon('close'));
$('#menu-close').addEventListener('click', closeMenu);
menu.addEventListener('cancel', (event) => {
	event.preventDefault();
	closeMenu();
});
menu.addEventListener('click', (event) => {
	const box = menu.getBoundingClientRect();
	if (
		event.target === menu &&
		(event.clientX < box.left ||
			event.clientX > box.right ||
			event.clientY < box.top ||
			event.clientY > box.bottom)
	)
		closeMenu();
});
matchMedia('(min-width: 861px)').addEventListener('change', (event) => {
	if (event.matches) closeMenu();
});
$('#console-language').addEventListener('click', () =>
	setLocale(locale() === 'zh' ? 'en' : 'zh')
);
bind($('#console-language'), () => (locale() === 'zh' ? 'English' : '中文'));
bind($('#logout'), ['退出登录', 'Sign out']);
bind(menuTrigger, ['打开导航', 'Open navigation'], 'aria-label');
bind($('#menu-close'), ['关闭导航', 'Close navigation'], 'aria-label');
window.addEventListener('console-locale-change', () => {
	if (user) display();
});
function changed() {
	try {
		localStorage.setItem('telysta.account.event', String(Date.now()));
	} catch {}
}
const authentication = initAuthentication({
	api,
	adminEntry,
	async authenticated(next) {
		user = next;
		if (user.role === 'admin' && !adminEntry) {
			location.replace('/telysta-console/');
			return;
		}
		if (user.role !== 'admin' && adminEntry) {
			location.replace('/console/');
			return;
		}
		changed();
		display();
		const allowed =
			user.role === 'admin'
				? Object.keys(names)
				: [
						'profile',
						'sessions',
						...(['member', 'superuser'].includes(user.role) ? ['uploads'] : [])
					];
		const requested = location.hash.slice(1);
		await navigate(
			allowed.includes(requested)
				? requested
				: user.role === 'admin'
					? 'post'
					: 'profile',
			true
		);
	},
	profileUpdated(next) {
		user = { ...user, ...next };
		display();
	}
});
$('#logout').addEventListener('click', async () => {
	if (!(await leave())) return;
	try {
		await api('auth/logout', { method: 'POST', body: '{}' });
		dirty = false;
		user = null;
		generation++;
		changed();
		display();
		authentication.show('login');
	} catch (error) {
		tell(authError(error));
	}
});
window.addEventListener('beforeunload', (event) => {
	if (dirty) {
		event.preventDefault();
		event.returnValue = '';
	}
});
try {
	const data = await api('auth/session');
	authentication.configure(data.entry);
	user = data.user;
	display();
	if (user) await authentication.resume(user);
} catch {
	authentication.unavailable();
}
setInterval(async () => {
	if (!user || document.hidden) return;
	try {
		const data = await api('auth/session');
		if (!data.user) {
			dirty = false;
			user = null;
			generation++;
			display();
			authentication.show('login');
		} else if (data.user.role !== user.role) {
			user = data.user;
			await navigate('profile', true);
		}
	} catch {}
}, 30000);
