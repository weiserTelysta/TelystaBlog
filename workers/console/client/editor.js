import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { ask, bind, button, el, field, locale, word } from './ui.js';
import { authError } from './auth.js';
import { renderSettings } from './settings.js';
const labels = {
	title: ['标题', 'Title'],
	titleEn: ['英文标题', 'English title'],
	description: ['摘要或介绍', 'Description'],
	descriptionEn: ['英文摘要', 'English description'],
	publishedAt: ['首次发表日期', 'Published date'],
	updatedAt: ['更新日期', 'Updated date'],
	category: ['文章分类', 'Category'],
	tags: ['标签', 'Tags'],
	series: ['文章系列', 'Series'],
	seriesOrder: ['系列顺序', 'Order in series'],
	draft: ['暂不发布', 'Keep unpublished'],
	cover: ['封面图片', 'Cover image'],
	authors: ['作者／编者', 'Authors / editors'],
	translator: ['译者', 'Translator'],
	publisher: ['出版社', 'Publisher'],
	publicationYear: ['出版年份', 'Publication year'],
	language: ['语言', 'Language'],
	clcCode: ['中图类号', 'CLC code'],
	clcName: ['分类名称', 'Classification name'],
	categoryOnly: ['仅在分类中发现', 'Discover through categories only'],
	notes: ['编目备注', 'Catalog notes'],
	authorStatus: ['作者核对状态', 'Author verification'],
	summary: ['作品简介', 'Summary'],
	type: ['作品类型', 'Work type'],
	status: ['展示状态', 'Availability'],
	image: ['主图', 'Main image'],
	preview: ['预览图', 'Preview image'],
	license: ['使用许可', 'License'],
	formats: ['文件格式', 'Formats'],
	subtitle: ['副标题', 'Subtitle'],
	poet: ['作词', 'Lyricist'],
	composer: ['作曲', 'Composer'],
	copyright: ['版权说明', 'Copyright'],
	body: ['正文', 'Content'],
	access: ['访问范围', 'Access'],
	files: ['书籍文件', 'Book files'],
	gallery: ['作品图片', 'Work images'],
	credits: ['创作者署名', 'Credits'],
	actions: ['相关链接', 'Related links']
};
const nested = {
	format: ['格式', 'Format'],
	href: ['链接', 'URL'],
	bytes: ['字节数', 'Bytes'],
	src: ['图片', 'Image'],
	alt: ['图片说明', 'Alternative text'],
	label: ['名称', 'Label'],
	name: ['姓名', 'Name'],
	type: ['用途', 'Purpose'],
	primary: ['主要操作', 'Primary action'],
	disabled: ['暂不启用', 'Disabled'],
	provider: ['平台', 'Provider'],
	code: ['提取码', 'Access code'],
	note: ['备注', 'Note']
};
const hints = {
	authors: [
		'每行一位作者，译者请填在译者栏。',
		'One author per line. Put translators in the translator field.'
	],
	tags: ['每行一个标签。', 'One tag per line.'],
	formats: ['每行一种格式。', 'One format per line.'],
	clcCode: [
		'分类修改保留原文件和固定书籍编号。',
		'Classification changes preserve the original file and permanent book ID.'
	],
	draft: [
		'保存不会直接发布；此标记用于之后的发布校验。',
		'Saving does not publish. This flag is checked during publication.'
	],
	categoryOnly: [
		'受保护书籍仍需独立的账户访问权限。',
		'Protected books still require a separate account access grant.'
	],
	cover: [
		'选择已有图片，或填写本站已归档的图片地址。',
		'Choose an existing image or enter an archived image URL.'
	]
};
const optionsFor = {
	access: [
		['public', ['公开', 'Public']],
		['protected', ['限制访问', 'Restricted']]
	],
	authorStatus: [
		['unreviewed', ['待核对', 'Unreviewed']],
		['verified', ['已核对', 'Verified']],
		['anonymous', ['佚名', 'Anonymous']],
		[
			'partial-collection',
			['多人合集，署名不全', 'Collection with partial credits']
		]
	],
	status: [
		['available', ['可展示', 'Available']],
		['draft', ['草稿', 'Draft']],
		['unavailable', ['暂不可用', 'Unavailable']]
	],
	format: ['PDF', 'EPUB', 'MOBI', 'AZW3'].map((v) => [v, v]),
	actionType: ['download', 'external', 'preview', 'source', 'mirror'].map(
		(v, i) => [
			v,
			[
				['下载', 'Download'],
				['外部链接', 'External link'],
				['预览', 'Preview'],
				['来源', 'Source'],
				['镜像', 'Mirror']
			][i]
		]
	)
};
function select(options, value) {
	const input = el('select');
	for (const [id, label] of options) {
		const option = el('option', label);
		option.value = id;
		input.append(option);
	}
	input.value = value ?? '';
	return input;
}
export async function editDocument({
	id,
	api,
	workspace,
	options,
	current,
	tell,
	dirty,
	back,
	section
}) {
	let { record, editor } = await api(
		'documents/' + encodeURIComponent(id) + '/editor'
	);
	if (!current()) return;
	if (record.kind === 'config') {
		return renderSettings({
			record,
			editor,
			api,
			workspace,
			current,
			tell,
			dirty,
			back,
			section
		});
	}
	let restoring,
		rawMode = false,
		busy = false,
		hasUnsavedChanges = false,
		fields = structuredClone(editor.fields || {}),
		body = editor.body || '',
		raw = record.source;
	const getters = new Map(),
		controls = new Map(),
		container = el('div', '', 'document-editor');
	workspace.replaceChildren(container);
	const markDirty = (changed) => {
		hasUnsavedChanges = changed;
		dirty(changed);
	};
	const stateLabel = () => record.kind === 'post' && record.state === 'published'
		? ['已上线', 'Live'] : ['云端草稿', 'Cloud draft'];
	function render() {
		container.replaceChildren();
		getters.clear();
		controls.clear();
		const head = el('div', '', 'task-heading'),
			title = el('h1', fields.title || record.title),
			state = el('span', stateLabel, 'status-label');
		head.append(title, state);
		const actions = el('div', '', 'editor-actions'),
			save = button(['保存草稿', 'Save draft'], saveRecord, 'primary');
		actions.append(
			button(['返回列表', 'Back to list'], back, 'quiet-button'),
			button(['版本记录', 'Version history'], showHistory, 'quiet-button'),
			save
		);
		container.append(head, actions);
		const form = el('form', '', 'document-form');
		form.method = 'post';
		form.action = './api/documents/' + encodeURIComponent(id) + '/editor';
		form.addEventListener('submit', (event) => {
			event.preventDefault();
			void saveRecord();
		});
		const panels = el('div', '', 'editor-panels'),
			tabs = el('div', '', 'editor-tabs');
		tabs.setAttribute('role', 'tablist');
		bind(tabs, ['编辑区域', 'Editor sections'], 'aria-label');
		const section = (key, label) => {
			const panel = el('section', '', 'editor-panel');
			panel.id = 'editor-panel-' + key;
			panel.setAttribute('role', 'tabpanel');
			const tab = button(label, () => activate(key));
			tab.id = 'editor-tab-' + key;
			tab.setAttribute('role', 'tab');
			tab.setAttribute('aria-controls', panel.id);
			panel.setAttribute('aria-labelledby', tab.id);
			tabs.append(tab);
			panels.append(panel);
			return panel;
		};
		const meta = section('details', ['基本信息', 'Details']),
			content =
				record.kind === 'post' ||
				record.kind === 'gallery' ||
				record.kind === 'score'
					? section('content', ['正文', 'Content'])
					: null;
		const resources = ['ebook', 'gallery'].includes(record.kind)
			? section('resources', ['图片与文件', 'Images & files'])
			: null;
		const publish = section('visibility', [
			'分类与访问',
			'Classification & access'
		]);
		if (record.kind === 'post') {
			const publication = section('publication', ['发布', 'Publication']);
			publication.append(
				el('p', ['下载已保存版本，供 Git 构建发布。', 'Download the saved revision for a Git build.'], 'field-help'),
				button(['下载发布快照', 'Download publication snapshot'], downloadPublication, 'quiet-button'),
				button(['核对线上版本', 'Check live revision'], checkPublication, 'quiet-button')
			);
		}
		function activate(key) {
			for (const tab of tabs.children) {
				const on = tab.id === 'editor-tab-' + key;
				tab.setAttribute('aria-selected', String(on));
				tab.tabIndex = on ? 0 : -1;
			}
			for (const panel of panels.children)
				panel.hidden = panel.id !== 'editor-panel-' + key;
		}
		tabs.addEventListener('keydown', (event) => {
			if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key))
				return;
			event.preventDefault();
			const all = Array.from(tabs.children),
				index = all.indexOf(document.activeElement),
				next =
					event.key === 'Home'
						? 0
						: event.key === 'End'
							? all.length - 1
							: (index + (event.key === 'ArrowLeft' ? -1 : 1) + all.length) %
								all.length;
			all[next].click();
			all[next].focus();
		});
		function inputFor(key, value) {
			let input, read;
			if (['draft', 'categoryOnly'].includes(key)) {
				input = el('input');
				input.type = 'checkbox';
				input.checked = !!value;
				read = () => input.checked;
			} else if (key === 'category') {
				input = select(
					options.categories.map((v) => [
						v.id,
						() => (locale() === 'en' ? v.titleEn : v.title)
					]),
					value || 'notes'
				);
				read = () => input.value;
			} else if (key === 'series') {
				input = select(
					[
						['', ['无系列', 'No series']],
						...options.series.filter(v => v.category === fields.category || v.id === value).map((v) => [
							v.id,
							() => (locale() === 'en' ? v.titleEn : v.title)
						])
					],
					value
				);
				read = () => input.value || null;
			} else if (key === 'type') {
				input = select(
					options.resourceTypes.map((v) => [
						v.id,
						[
							{
								illustration: '插画',
								image: '图像',
								music: '音乐',
								video: '视频',
								project: '项目',
								other: '其他'
							}[v.id] || v.title,
							v.title
						]
					]),
					value || 'illustration'
				);
				read = () => input.value;
			} else if (optionsFor[key]) {
				input = select(optionsFor[key], value || optionsFor[key][0][0]);
				read = () => input.value;
			} else if (['seriesOrder', 'publicationYear'].includes(key)) {
				input = el('input');
				input.type = 'number';
				input.min = '1';
				input.max = '100000';
				input.step = '1';
				input.value = value ?? '';
				read = () => (input.value ? Number(input.value) : null);
			} else if (['publishedAt', 'updatedAt'].includes(key)) {
				input = el('input');
				input.type = 'date';
				input.value = String(value || '').slice(0, 10);
				read = () => input.value || null;
			} else if (['tags', 'authors', 'formats'].includes(key)) {
				input = el('textarea');
				input.rows = 3;
				input.value = Array.isArray(value) ? value.join('\n') : '';
				read = () =>
					input.value
						.split('\n')
						.map((v) => v.trim())
						.filter(Boolean);
			} else {
				input = el(
					[
						'description',
						'descriptionEn',
						'summary',
						'license',
						'notes'
					].includes(key)
						? 'textarea'
						: 'input'
				);
				if (input.tagName === 'TEXTAREA') input.rows = 3;
				input.value = value ?? '';
				input.maxLength = ['title', 'titleEn'].includes(key) ? 300 : 40000;
				read = () => input.value;
			}
			input.dataset.field = key;
			controls.set(key, input);
			getters.set(key, read);
			if (key === 'title') input.required = true;
			input.addEventListener('input', () => {
				fields[key] = read();
				input.removeAttribute('aria-invalid');
				markDirty(true);
				if (key === 'title') title.textContent = input.value;
			});
			const wrapper = field(labels[key] || [key, key], input, hints[key]);
			if (
				['cover', 'image', 'preview'].includes(key) &&
				record.kind === 'gallery'
			) {
				const list = el('datalist');
				list.id = input.id + '-assets';
				for (const asset of options.assets) {
					const row = el('option');
					row.value = asset.value;
					row.label = asset.label;
					list.append(row);
				}
				input.setAttribute('list', list.id);
				wrapper.append(list);
			}
			return wrapper;
		}
		const keys =
			record.kind === 'post'
				? ['title', 'titleEn', 'description', 'descriptionEn']
				: record.kind === 'ebook'
					? [
							'title',
							'authors',
							'authorStatus',
							'translator',
							'publisher',
							'publicationYear',
							'language',
							'description',
							'notes'
						]
					: record.kind === 'gallery'
						? ['title', 'summary', 'type', 'status', 'license']
						: ['title', 'subtitle', 'poet', 'composer', 'copyright'];
		for (const key of keys) meta.append(inputFor(key, fields[key]));
		if (content) {
			const text = el('textarea', '', 'markdown-editor');
			text.rows = 22;
			text.value = body;
			text.spellcheck = false;
			controls.set('body', text);
			const preview = el('div', '', 'content-preview');
			preview.hidden = true;
			const previewButton = button(['预览正文', 'Preview content'], () => {
				preview.hidden = !preview.hidden;
				if (!preview.hidden) renderPreview(text.value, preview);
			});
			const toolbar = el('div', '', 'markdown-tools');
			for (const [label, token] of [
				[['加粗', 'Bold'], '**'],
				[['斜体', 'Italic'], '*'],
				[['代码', 'Code'], '`']
			])
				toolbar.append(
					button(label, () => {
						const start = text.selectionStart,
							end = text.selectionEnd,
							selection =
								text.value.slice(start, end) || word(['文字', 'Text']);
						text.setRangeText(token + selection + token, start, end, 'select');
						text.dispatchEvent(new Event('input', { bubbles: true }));
						text.focus();
					})
				);
			toolbar.append(previewButton);
			text.addEventListener('input', () => {
				body = text.value;
				markDirty(true);
				if (!preview.hidden) renderPreview(body, preview);
			});
			content.append(
				toolbar,
				field(
					record.kind === 'score'
						? ['简谱正文', 'Score notation']
						: ['正文（Markdown）', 'Content (Markdown)'],
					text
				),
				preview
			);
		}
		if (record.kind === 'post') {
			for (const key of [
				'category',
				'tags',
				'series',
				'seriesOrder',
				'publishedAt',
				'updatedAt',
				'draft',
				'cover'
			])
				publish.append(inputFor(key, fields[key]));
			const category = controls.get('category');
			const series = controls.get('series');
			const order = controls.get('seriesOrder');
			const syncOrder = () => {
				order.disabled = !series.value;
				order.required = Boolean(series.value);
				if (order.disabled) order.value = '';
			};
			category.addEventListener('change', () => {
				const previous = series.value;
				const available = options.series.filter(value => value.category === category.value);
				const replacement = select([
					['', ['无系列', 'No series']],
					...available.map(value => [value.id, () => locale() === 'en' ? value.titleEn : value.title]),
				], previous);
				series.replaceChildren(...replacement.children);
				series.value = available.some(value => value.id === previous) ? previous : '';
				fields.series = series.value || null;
				syncOrder();
			});
			series.addEventListener('change', syncOrder);
			syncOrder();
		} else if (record.kind === 'ebook')
			for (const key of ['clcCode', 'clcName', 'categoryOnly', 'draft'])
				publish.append(inputFor(key, fields[key]));
		else if (record.kind === 'gallery')
			for (const key of ['publishedAt', 'updatedAt', 'formats'])
				publish.append(inputFor(key, fields[key]));
		publish.append(inputFor('access', record.access));
		getters.delete('access');
		if (resources) {
			if (editor.preview) {
				const image = el('img', '', 'editor-preview-image');
				image.src = editor.preview;
				image.alt = fields.title || record.title;
				resources.append(image);
			}
			for (const key of record.kind === 'ebook'
				? ['cover']
				: ['image', 'cover', 'preview'])
				resources.append(inputFor(key, fields[key]));
			for (const key of record.kind === 'ebook'
				? ['files']
				: ['gallery', 'credits', 'actions'])
				resources.append(rows(key, fields[key] || []));
		}
		const advanced = el('details', '', 'advanced-editor'),
			summary = el('summary', [
				'高级：原文与恢复',
				'Advanced: source & recovery'
			]),
			source = el('textarea');
		source.value = raw;
		source.readOnly = true;
		source.rows = 12;
		bind(source, ['内容原文', 'Source text'], 'aria-label');
		const enable = el('input');
		enable.type = 'checkbox';
		enable.addEventListener('change', async () => {
			if (
				enable.checked &&
				(await ask([
					'使用原文编辑将以原文内容保存，请先确认字段表单中的改动已经保存。',
					'Source editing saves the source text. Save field changes first.'
				]))
			) {
				rawMode = true;
				source.readOnly = false;
				form.hidden = true;
			} else {
				enable.checked = false;
				rawMode = false;
				source.readOnly = true;
				form.hidden = false;
			}
		});
		source.addEventListener('input', () => {
			raw = source.value;
			markDirty(true);
		});
		advanced.append(
			summary,
			field(['启用原文恢复编辑', 'Enable source recovery editing'], enable),
			field(['内容原文', 'Source text'], source)
		);
		if (record.source_path)
			advanced.append(el('p', record.source_path, 'record-meta'));
		form.append(tabs, panels);
		container.append(form, advanced);
		activate('details');
		function rows(key, data) {
			const box = el('section', '', 'attachment-fields');
			box.append(el('h2', labels[key]));
			const list = el('div');
			box.append(list);
			let value = structuredClone(data);
			getters.set(key, () => value);
			const columns =
				key === 'files'
					? ['format', 'href', 'bytes']
					: key === 'gallery'
						? ['src', 'label', 'alt']
						: key === 'credits'
							? ['label', 'name', 'href']
							: [
									'type',
									'label',
									'href',
									'disabled',
									'primary',
									'format',
									'provider',
									'code',
									'note'
								];
			function draw() {
				list.replaceChildren();
				for (const [index, item] of value.entries()) {
					const row = el('fieldset', '', 'attachment-row');
					row.append(el('legend', () => word(labels[key]) + ' ' + (index + 1)));
					for (const name of columns) {
						let input;
						if (['disabled', 'primary'].includes(name)) {
							input = el('input');
							input.type = 'checkbox';
							input.checked = !!item[name];
						} else if (name === 'format' && key === 'files')
							input = select(optionsFor.format, item[name] || 'EPUB');
						else if (name === 'type' && key === 'actions')
							input = select(optionsFor.actionType, item[name] || 'external');
						else {
							input = el('input');
							input.value = item[name] ?? '';
							if (name === 'bytes') {
								input.type = 'number';
								input.min = '1';
								input.step = '1';
							}
						}
						input.dataset.field = key + '.' + index + '.' + name;
						controls.set(input.dataset.field, input);
						input.addEventListener('input', () => {
							if (input.type === 'checkbox') item[name] = input.checked;
							else if (name === 'bytes') {
								if (input.value) item[name] = Number(input.value);
								else delete item[name];
							} else if (input.value) item[name] = input.value;
							else delete item[name];
							fields[key] = value;
							markDirty(true);
						});
						row.append(field(nested[name] || name, input));
					}
					row.append(
						button(
							['移除此条', 'Remove entry'],
							() => {
								value.splice(index, 1);
								fields[key] = value;
								markDirty(true);
								draw();
							},
							'quiet-button'
						)
					);
					list.append(row);
				}
			}
			const add = button(['添加条目', 'Add entry'], () => {
				value.push(
					key === 'files'
						? { format: 'EPUB', href: '' }
						: key === 'gallery'
							? { src: '', alt: '' }
							: key === 'credits'
								? { label: '', name: '' }
								: { type: 'external', label: '', href: '' }
				);
				fields[key] = value;
				markDirty(true);
				draw();
			});
			box.append(add);
			draw();
			return box;
		}
		async function saveRecord() {
			if (busy || !current()) return;
			if (!rawMode) {
				const invalid = form.querySelector(':invalid');
				if (invalid) {
					const panel = invalid.closest('[role=tabpanel]');
					if (panel) activate(panel.id.replace('editor-panel-', ''));
					invalid.reportValidity();
					return;
				}
			}
			busy = true;
			save.disabled = true;
			tell(['正在保存…', 'Saving…']);
			for (const control of controls.values())
				control.removeAttribute('aria-invalid');
			try {
				let result;
				if (rawMode)
					result = await api('documents/' + encodeURIComponent(id), {
						method: 'PUT',
						body: JSON.stringify({
							source: raw,
							title: fields.title || record.title,
							access: controls.get('access')?.value || record.access,
							revision: record.revision
						})
					});
				else {
					const patch = Object.fromEntries(
						[...getters].map(([key, get]) => [key, get()])
					);
					result = await api(
						'documents/' + encodeURIComponent(id) + '/editor',
						{
							method: 'PATCH',
							body: JSON.stringify({
								fields: patch,
								body,
								access: controls.get('access')?.value || record.access,
								revision: record.revision,
								...(restoring ? { restoreRevision: restoring } : {})
							})
						}
					);
				}
				if (!current()) return;
				record.revision = result.revision;
				restoring = undefined;
				markDirty(false);
				if (result.record) {
					record = result.record;
					raw = record.source;
					editor = result.editor;
					fields = structuredClone(editor.fields || fields);
				} else {
					const fresh = await api(
						'documents/' + encodeURIComponent(id) + '/editor'
					);
					record = fresh.record;
					editor = fresh.editor;
					fields = structuredClone(editor.fields || {});
					body = editor.body || '';
				}
				rawMode = false;
				render();
				tell([
					'草稿已保存，公开网站尚未更新。',
					'Draft saved. The public site has not changed.'
				]);
			} catch (error) {
				if (!current()) return;
				tell(
					error.code === 'VERSION_CONFLICT'
						? [
								'版本已更新，你的输入仍保留。请在另一窗口对照最新内容后再合并。',
								'A newer version exists. Your input is preserved. Compare it in another window before merging.'
							]
						: authError(error)
				);
				const input = controls.get(error.field);
				if (input) {
					input.setAttribute('aria-invalid', 'true');
					input.closest('[role=tabpanel]')?.id &&
						activate(
							input.closest('[role=tabpanel]').id.replace('editor-panel-', '')
						);
					input.focus();
				}
			} finally {
				busy = false;
				if (current()) save.disabled = false;
			}
		}
	}
	async function downloadPublication(event) {
		if (hasUnsavedChanges) {
			tell(['请先保存当前修改。', 'Save your changes first.']);
			return;
		}
		const control = event.currentTarget;
		control.disabled = true;
		try {
			const snapshot = await api('documents/' + encodeURIComponent(id) + '/publication', {
				method: 'POST',
				body: JSON.stringify({ revision: record.revision })
			});
			if (!current()) return;
			const url = URL.createObjectURL(new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' }));
			const link = el('a');
			link.href = url;
			link.download = `${snapshot.documentId}-r${snapshot.revision}.json`;
			link.click();
			setTimeout(() => URL.revokeObjectURL(url), 1_000);
			tell(['快照已下载，等待 Git 构建。', 'Snapshot downloaded. Awaiting a Git build.']);
		} catch (error) {
			if (current()) tell(authError(error));
		} finally {
			if (current()) control.disabled = false;
		}
	}

	async function checkPublication(event) {
		const control = event.currentTarget;
		control.disabled = true;
		tell(['正在核对线上版本…', 'Checking the live revision…']);
		try {
			const result = await api('documents/' + encodeURIComponent(id) + '/publication/check', { method: 'POST' });
			if (!current()) return;
			if (result.status === 'live') {
				if (record.revision === result.currentRevision) {
					record.state = result.currentState;
					bind(container.querySelector('.status-label'), stateLabel);
				}
				tell(result.currentState === 'published' ?
					[`第 ${result.revision} 版已上线。`, `Revision ${result.revision} is live.`] :
					[`线上为第 ${result.revision} 版。第 ${result.currentRevision} 版仍是草稿。`, `Revision ${result.revision} is live. Revision ${result.currentRevision} is still a draft.`]);
			} else if (result.status === 'awaiting') tell([
				`线上尚未显示第 ${result.latestPrepared} 版。请检查 Git 和 Pages 构建状态。`,
				`Revision ${result.latestPrepared} is not live yet. Check Git and the Pages build status.`]);
			else tell(['此文尚未准备发布快照。', 'No publication snapshot has been prepared for this article.']);
		} catch (error) {
			if (current()) tell(error.code === 'PUBLICATION_UNAVAILABLE' ?
				['暂时无法核对公开文章，请稍后重试。', 'The public article could not be checked. Try again shortly.'] : authError(error));
		} finally {
			if (current()) control.disabled = false;
		}
	}

	async function showHistory() {
		if (busy) return;
		let panel = container.querySelector('.history-panel');
		if (panel) {
			panel.remove();
			return;
		}
		panel = el('section', '', 'history-panel');
		container.append(panel);
		panel.append(el('h2', ['版本记录', 'Version history']));
		try {
			const result = await api(
				'documents/' + encodeURIComponent(id) + '/revisions'
			);
			if (!current() || !panel.isConnected) return;
			if (!result.records.length) {
				panel.append(
					el('p', ['还没有历史版本。', 'No earlier versions yet.'], 'empty')
				);
				return;
			}
			for (const version of result.records) {
				const row = el('div', '', 'history-row');
				row.append(
					el('span', () => word(['版本 ', 'Version ']) + version.revision),
					button(['载入此版本', 'Load version'], async () => {
						if (
							!(await ask([
								'载入旧版本会替换编辑区内容，保存后才会生效。继续吗？',
								'Load this version into the editor? It takes effect only after saving.'
							]))
						)
							return;
						try {
							const old = await api(
								'documents/' +
									encodeURIComponent(id) +
									'/revisions/' +
									version.revision
							);
							if (!current()) return;
							editor = old.editor;
							fields = structuredClone(editor.fields || {});
							body = editor.body || '';
							raw = old.source;
							restoring = version.revision;
							rawMode = false;
							markDirty(true);
							render();
							tell([
								'旧版本已载入，尚未保存。',
								'Earlier version loaded, not saved yet.'
							]);
						} catch (error) {
							tell(authError(error));
						}
					})
				);
				panel.append(row);
			}
		} catch (error) {
			tell(authError(error));
		}
	}
	render();
}
function renderPreview(source, target) {
	const purifier = DOMPurify;
	purifier.addHook('uponSanitizeAttribute', (node, attribute) => {
		if (node.nodeName === 'IMG' && attribute.attrName === 'src') {
			try {
				const url = new URL(attribute.attrValue, location.origin);
				if (
					!['https:', 'data:'].includes(url.protocol) ||
					(url.protocol === 'https:' &&
						![
							location.hostname,
							'assets.telysta.com',
							'library-files.telysta.com'
						].includes(url.hostname)) ||
					(url.protocol === 'data:' &&
						!/^data:image\/(png|jpeg|webp|gif);/i.test(attribute.attrValue))
				)
					attribute.keepAttr = false;
			} catch {
				attribute.keepAttr = false;
			}
		}
	});
	try {
		target.innerHTML = purifier.sanitize(
			marked.parse(source, { async: false }),
			{
				FORBID_TAGS: [
					'style',
					'script',
					'iframe',
					'object',
					'embed',
					'form',
					'input',
					'button',
					'select',
					'textarea',
					'base',
					'meta',
					'link'
				],
				FORBID_ATTR: ['style', 'id', 'name', 'srcset', 'class'],
				ALLOW_DATA_ATTR: false,
				ALLOW_ARIA_ATTR: false
			}
		);
		for (const a of target.querySelectorAll('a')) {
			a.target = '_blank';
			a.rel = 'noopener noreferrer';
		}
	} finally {
		purifier.removeAllHooks();
	}
}
