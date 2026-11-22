import { comments } from './comments.js';
import { el, button, field, word, ask } from './ui.js';
import { authError } from './auth.js';
const roles = {
	viewer: ['普通用户', 'Reader'],
	member: ['正式用户', 'Contributor'],
	superuser: ['超级用户', 'Moderator'],
	admin: ['超级管理员', 'Site owner']
};
export async function operations(key, c) {
	if (key === 'comments') return comments(c);
	if (key === 'users') return users(c);
	if (key === 'sessions') return devices(c);
	if (key === 'uploads') return uploads(c);
	if (key === 'audit') return activity(c);
	if (key === 'backup') return backups(c);
}
async function run(c, task, refresh) {
	try {
		await task();
		if (c.current() && refresh) await c.navigate(refresh, true);
	} catch (error) {
		c.tell(authError(error));
	}
}
async function users(c) {
	const data = await c.api('users');
	if (!c.current()) return;
	const list = el('ul', '', 'records user-list');
	for (const user of data.records) {
		const row = el('li'),
			copy = el('div');
		copy.append(
			el(
				'span',
				user.displayName || user.username || user.email,
				'record-title'
			),
			el('span', user.email, 'record-meta')
		);
		row.append(copy);
		if (user.role === 'admin')
			row.append(el('span', roles.admin, 'small muted'));
		else {
			const form = el('form', '', 'record-actions'),
				role = el('select'),
				status = el('select'),
				grant = el('input');
			grant.type = 'checkbox';
			grant.checked = user.restrictedAccess === true;
			for (const [value, label] of Object.entries(roles)) {
				if (value === 'admin') continue;
				const option = el('option', label);
				option.value = value;
				role.append(option);
			}
			role.value = user.role;
			for (const [value, label] of [
				['active', ['正常', 'Active']],
				['suspended', ['停用', 'Suspended']]
			]) {
				const option = el('option', label);
				option.value = value;
				status.append(option);
			}
			status.value = user.status;
			const save = button(['保存权限', 'Save access'], () => {});
			save.type = 'submit';
			form.append(
				field(['角色', 'Role'], role),
				field(['状态', 'Status'], status),
				field(['允许访问限制内容', 'Allow restricted content'], grant),
				button(['登录设备', 'Login devices'], () => {
					c.workspace.replaceChildren(el('h1', ['登录设备', 'Login devices']));
					void devices(c, user.id);
				}),
				save
			);
			form.addEventListener('submit', async (event) => {
				event.preventDefault();
				if (
					!(await ask([
						'更新权限并退出该用户的现有登录？',
						'Update access and sign this user out of all devices?'
					]))
				)
					return;
				save.disabled = true;
				await run(
					c,
					() =>
						c.api('users/' + user.id, {
							method: 'PATCH',
							body: JSON.stringify({
								role: role.value,
								status: status.value,
								restrictedAccess: grant.checked
							})
						}),
					'users'
				);
				save.disabled = false;
			});
			row.append(form);
		}
		list.append(row);
	}
	c.workspace.append(list);
}
async function devices(c, target) {
	const records = await c.api(
		target ? 'users/' + target + '/sessions' : 'sessions'
	);
	if (!c.current()) return;
	if (target)
		c.workspace.append(
			button(['返回用户列表', 'Back to users'], () => c.navigate('users')),
			button(['退出该用户全部登录', 'Sign out all devices'], async () => {
				if (
					await ask([
						'确定退出该用户的全部登录？',
						'Sign this user out of every device?'
					])
				)
					await run(
						c,
						() => c.api('users/' + target + '/sessions', { method: 'DELETE' }),
						'users'
					);
			})
		);
	const list = el('ul', '', 'records');
	for (const record of records) {
		const row = el('li'),
			copy = el('div');
		copy.append(
			el(
				'span',
				record.current
					? ['当前设备', 'This device']
					: ['其他设备', 'Other device'],
				'record-title'
			),
			el(
				'span',
				`${record.user_agent || ''} · ${new Date(record.created_at * 1000).toLocaleString()}`,
				'record-meta'
			)
		);
		row.append(
			copy,
			button(['退出此登录', 'Sign out device'], async () => {
				if (!(await ask(['确定退出这台设备的登录？', 'Sign out this device?'])))
					return;
				await run(
					c,
					async () => {
						await c.api('sessions/' + record.id, { method: 'DELETE' });
						if (record.current) location.reload();
					},
					target ? 'users' : 'sessions'
				);
			})
		);
		list.append(row);
	}
	if (!records.length)
		list.append(el('li', ['没有活动登录。', 'No active devices.'], 'empty'));
	c.workspace.append(list);
}
async function uploads(c) {
	const records = await c.api('uploads');
	if (!c.current()) return;
	const file = el('input');
	file.type = 'file';
	file.accept = '.epub,.pdf,.mobi,.azw3,.png,.jpg,.jpeg,.webp';
	const form = el('form', '', 'upload-form'),
		send = button(['上传文件', 'Upload file'], () => {}, 'primary');
	send.type = 'submit';
	form.append(
		field(['选择电子书或图片', 'Choose a book or image'], file, [
			'电子书最大90 MB，图片最大16 MB。上传先进入私人待审核区。',
			'Books up to 90 MB; images up to 16 MB. Uploads enter private review first.'
		]),
		send
	);
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		if (!file.files?.[0]) {
			file.focus();
			return;
		}
		send.disabled = true;
		await run(
			c,
			async () => {
				const selected = file.files[0],
					response = await fetch(
						'./api/uploads?filename=' + encodeURIComponent(selected.name),
						{
							method: 'PUT',
							credentials: 'same-origin',
							headers: {
								'Content-Type': selected.type || 'application/octet-stream'
							},
							body: selected
						}
					);
				if (!response.ok) {
					const error = new Error((await response.json()).error);
					error.code = 'HTTP_' + response.status;
					throw error;
				}
			},
			'uploads'
		);
		send.disabled = false;
	});
	c.workspace.append(form);
	const states = {
			pending: ['待审核', 'Awaiting review'],
			approved: ['已通过', 'Approved'],
			rejected: ['已退回', 'Returned']
		},
		list = el('ul', '', 'records');
	for (const record of records) {
		const row = el('li'),
			copy = el('div');
		let metadata = {};
		try {
			metadata = JSON.parse(record.metadata || '{}');
		} catch {}
		copy.append(
			el('span', metadata.title || record.filename, 'record-title'),
			el(
				'span',
				() =>
					`${(record.bytes / 1048576).toFixed(1)} MB · ${word(states[record.review_state] || states.pending)}`,
				'record-meta'
			)
		);
		const controls = el('div', '', 'record-actions'),
			download = el('a', ['下载', 'Download']);
		download.href = './api/uploads/' + record.id + '/content';
		controls.append(download);
		if (record.owner_id === c.user.id || c.user.role === 'admin')
			controls.append(
				button(['编辑资料', 'Edit details'], () =>
					editUpload(c, record, metadata)
				)
			);
		if (
			c.user.role === 'admin' ||
			(c.user.role === 'superuser' && record.owner_id !== c.user.id)
		)
			for (const [state, label] of [
				['approved', ['通过', 'Approve']],
				['rejected', ['退回', 'Return']]
			])
				controls.append(
					button(label, async () => {
						const self = record.owner_id === c.user.id;
						if (
							!(await ask(
								self
									? [
											'确认审核自己的上传？此操作会单独记录。',
											'Review your own upload? This action is recorded separately.'
										]
									: [
											'更新审核结果？通过不会直接公开文件。',
											'Update the review result? Approval does not publish the file.'
										]
							))
						)
							return;
						await run(
							c,
							() =>
								c.api('uploads/' + record.id, {
									method: 'PATCH',
									body: JSON.stringify({
										review: state,
										overrideSelfReview: self
									})
								}),
							'uploads'
						);
					})
				);
		row.append(copy, controls);
		list.append(row);
	}
	if (!records.length)
		list.append(
			el(
				'li',
				[
					'还没有上传资料。请选择文件开始。',
					'No uploads yet. Choose a file to begin.'
				],
				'empty'
			)
		);
	c.workspace.append(list);
}
function editUpload(c, record, metadata) {
	c.workspace.replaceChildren(el('h1', ['上传资料', 'Upload details']));
	const form = el('form', '', 'upload-details'),
		title = el('input'),
		authors = el('input'),
		description = el('textarea');
	title.value = metadata.title || record.filename;
	title.required = true;
	title.maxLength = 300;
	authors.value = (metadata.authors || []).join('、');
	description.value = metadata.description || '';
	description.maxLength = 4000;
	for (const [label, node] of [
		[['标题', 'Title'], title],
		[['作者，用顿号分隔', 'Authors, separated by 、'], authors],
		[['简介', 'Description'], description]
	]) {
		node.addEventListener('input', () => c.dirty(true));
		form.append(field(label, node));
	}
	const save = button(['保存资料', 'Save details'], () => {}, 'primary');
	save.type = 'submit';
	form.append(
		save,
		button(['返回列表', 'Back to uploads'], () => c.navigate('uploads'))
	);
	form.addEventListener('submit', async (event) => {
		event.preventDefault();
		save.disabled = true;
		await run(
			c,
			async () => {
				await c.api('uploads/' + record.id, {
					method: 'PATCH',
					body: JSON.stringify({
						metadata: {
							title: title.value,
							authors: authors.value
								.split('、')
								.map((value) => value.trim())
								.filter(Boolean),
							description: description.value
						}
					})
				});
				c.dirty(false);
			},
			'uploads'
		);
		save.disabled = false;
	});
	c.workspace.append(form);
}
async function activity(c) {
	const records = await c.api('audit');
	if (!c.current()) return;
	const names = {
		'documents.save': ['保存内容草稿', 'Content draft saved'],
		'documents.create': ['新建文章', 'Article created'],
		'auth.owner.initialize': ['完成站主设置', 'Owner setup completed'],
		'auth.login': ['登录账户', 'Signed in'],
		'auth.logout': ['退出登录', 'Signed out'],
		'users.update': ['更新用户权限', 'User access updated']
	};
	const list = el('ul', '', 'records');
	for (const record of records) {
		const row = el('li'),
			copy = el('div');
		copy.append(
			el(
				'span',
				names[record.action] || ['管理操作', 'Management action'],
				'record-title'
			),
			el(
				'span',
				new Date(record.created_at * 1000).toLocaleString(),
				'record-meta'
			)
		);
		const details = el('details'),
			summary = el('summary', ['查看详情', 'Details']);
		details.append(
			summary,
			el('p', `${record.action} · ${record.target_id || ''}`, 'record-meta')
		);
		row.append(copy, details);
		list.append(row);
	}
	if (!records.length)
		list.append(el('li', ['还没有操作记录。', 'No activity yet.'], 'empty'));
	c.workspace.append(list);
}
function backups(c) {
	c.workspace.append(
		el(
			'p',
			[
				'下载所选类型的内容、历史版本及清单。电子书与图片原文件需从对象存储另行备份；请将下载的数据保存在私人位置。',
				'Download content, history and manifests by type. Back up original book and image files separately from storage. Keep downloaded data private.'
			],
			'backup-help'
		)
	);
	const list = el('ul', '', 'records');
	for (const [type, label] of [
		['all', ['全部管理数据', 'All management data']],
		['post', ['文章与版本', 'Articles & versions']],
		['ebook', ['藏书目录', 'Library catalog']],
		['gallery', ['画廊资料', 'Gallery entries']],
		['score', ['简谱', 'Scores']],
		['config', ['站点设置', 'Site settings']],
		['comments', ['评论与回复', 'Comments & replies']],
		['users', ['账户与权限', 'Accounts & access']],
		['uploads', ['上传资料清单', 'Upload manifests']],
		['audit', ['操作记录', 'Activity']]
	]) {
		const row = el('li'),
			link = el('a', ['下载备份', 'Download backup']);
		link.href = './api/export?type=' + type;
		row.append(el('span', label), link);
		list.append(row);
	}
	c.workspace.append(list);
}
