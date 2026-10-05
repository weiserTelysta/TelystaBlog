/* The editor keeps user input in memory on validation or version conflicts. Never render editable HTML. */
import {
	diffLines,
	localDate,
	imageReference,
	contentDate,
} from './workbench.mjs';
const main = document.querySelector('main');
const statusMessage = document.querySelector('#status');
new ResizeObserver(() => {
	document.documentElement.style.setProperty(
		'--status-height',
		`${Math.ceil(statusMessage.getBoundingClientRect().height)}px`,
	);
}).observe(statusMessage);
let token = '',
	dirty = false,
	active = '',
	navigationSerial = 0,
	editRevision = 0;
let imagePreviews = {},
	socialIcons = {},
	relatedVisuals = {},
	relatedCategories = [],
	contactMedia = [],
	foilOptions = [];
const selection = {};
const optionLabels = {
	github: 'GitHub',
	bilibili: '哔哩哔哩',
	email: '邮箱',
	x: 'X',
	steam: 'Steam',
	qq: 'QQ',
	wechat: '微信',
	warm: '暖金',
	moon: '月蓝',
	rose: '蔷薇',
	violet: '紫雾',
	mist: '薄雾',
	quiet: '安静',
	playful: '轻快',
	poetic: '诗意',
	hopeful: '希望',
	melancholy: '惆怅',
	daily: '日常',
};
const labels = {
	name: '名称',
	defaultTitle: '默认标题',
	defaultDescription: '默认描述',
	authorName: '作者',
	shareImage: '固定分享图',
	url: '图片地址',
	alt: '替代文字',
	width: '宽度',
	height: '高度',
	type: '类型',
	icpRecord: '备案文案（可留空）',
	home: '首页 SEO',
	title: '标题',
	description: '介绍',
	navItems: '顶部导航',
	label: '显示文字',
	href: '链接地址',
	id: '稳定 ID',
	text: '句子',
	dayAffinity: '昼夜偏好（0 夜间 → 1 白天）',
	weight: '权重',
	mood: '语气',
	avatar: '头像来源（与 favicon 配套）',
	tone: '色调',
	enabled: '启用',
	eyebrow: '题签',
	items: '链接条目',
	order: '排序',
	external: '新窗口打开',
	icon: '图标',
	imageSrc: '二维码图片地址',
	cardInscription: '角色英文题签',
	prefix: '角色名',
	image: '角色图片引用',
	imagePosition: '裁切位置',
	imageScale: '图片缩放',
	titleEn: '英文标题',
	subtitle: '中文小标题',
	subtitleEn: '英文小标题',
	descriptionEn: '英文介绍',
	category: '所属分类',
	foil: '光泽样式',
};
const notes = {
	site: '网站标题、介绍、分享图与页脚。离开标签页后的句子在「标签页祝福」中管理。',
	hero: '选择一句欢迎语编辑。按昼夜偏好与权重抽样，欢迎语在首页轮换出现。',
	tabs: '离开标签页时随机显示一句，返回后恢复页面标题。',
	profiles:
		'选择身份编辑名称、色调和抽样权重；新增时一并生成头像与浏览器图标。',
	visuals:
		'每张角色卡片对应一个博客分类。英文角色名与题签用于收起状态，展开介绍使用中文。',
	categories:
		'编辑分类资料与光泽预设。新增分类时同时建立对应的角色卡片与文章目录。',
	contacts:
		'选择或上传二维码，也可填写 R2 图片地址。上传自动转为无损 WebP，保存后请扫码核对。',
	series: '新增系列时选择已有分类；文章通过系列 ID 和章节序号加入目录。',
	social:
		'图标与网站共用同一套图形。选择平台、填写地址，可新增、移除或调整顺序。',
	home: '维护首页区块、启用状态与顺序；链接和介绍段落可以新增。',
};
function el(tag, text, className) {
	const node = document.createElement(tag);
	if (text !== undefined) node.textContent = text;
	if (className) node.className = className;
	return node;
}
function message(text = '', error = false) {
	statusMessage.textContent = text;
	statusMessage.dataset.error = String(error);
	const state = document.querySelector('#save-state');
	state.textContent = dirty ? '有未保存修改' : '无未保存修改';
	state.dataset.dirty = String(dirty);
}
function changed() {
	dirty = true;
	editRevision++;
	message('有未保存修改');
}
async function api(url, data) {
	const response = await fetch(url, {
		method: data === undefined ? 'GET' : 'POST',
		headers: {
			'x-telysta-token': token,
			...(data === undefined ? {} : { 'Content-Type': 'application/json' }),
		},
		...(data === undefined ? {} : { body: JSON.stringify(data) }),
	});
	const result = await response.json();
	if (!response.ok)
		throw new Error(result.error || `请求失败 (${response.status})`);
	return result;
}
function button(text, action, className = '') {
	const b = el('button', text, className);
	b.type = 'button';
	b.addEventListener('click', async () => {
		b.disabled = true;
		try {
			await action();
		} catch (e) {
			message(e.message, true);
		} finally {
			b.disabled = false;
		}
	});
	return b;
}
function inputLabel(text, input) {
	const label = el('label');
	if (input.type === 'checkbox') label.classList.add('check-field');
	label.append(el('span', text), input);
	return label;
}
function toolbar(...buttons) {
	const node = el('div', undefined, 'toolbar');
	node.append(...buttons);
	return node;
}
function heading(title, hint) {
	main.append(el('h2', title));
	if (hint) main.append(el('p', hint, 'hint'));
	document.title = `${title} · Telysta 本地管理`;
}
function searchBox(placeholder, onInput) {
	const input = el('input');
	input.type = 'search';
	input.placeholder = placeholder;
	input.setAttribute('aria-label', placeholder);
	input.className = 'search';
	input.addEventListener('input', () =>
		onInput(input.value.toLocaleLowerCase()),
	);
	return input;
}
function protectNavigation() {
	return (
		!dirty || window.confirm('当前内容尚未保存。确定放弃这些输入并切换吗？')
	);
}
window.addEventListener('beforeunload', (event) => {
	if (dirty) event.preventDefault();
});
function defaultValue(field) {
	if (field.kind === 'object')
		return Object.fromEntries(
			Object.entries(field.fields)
				.filter(([, f]) => f.kind !== 'readonly')
				.map(([k, f]) => [
					k,
					k === 'id' ? `entry-${Date.now()}` : defaultValue(f),
				]),
		);
	if (field.kind === 'array') return [];
	if (field.kind === 'boolean') return true;
	if (field.kind === 'number') return 1;
	return field.options?.[0] ?? '';
}
function icon(name) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('aria-hidden', 'true');
	svg.classList.add('social-icon');
	const p = document.createElementNS(svg.namespaceURI, 'path');
	p.setAttribute('d', socialIcons[name] ?? '');
	svg.append(p);
	return svg;
}
function rolePreview(visual, foil) {
	const area = el('div', undefined, 'role-preview-area');
	const frame = el('div', undefined, 'role-frame');
	frame.tabIndex = 0;
	frame.setAttribute('aria-label', '角色卡片光泽与裁切预览');
	const img = el('img', undefined, 'role-preview');
	const caption = el('div', undefined, 'role-caption');
	const name = el('span'),
		inscription = el('small');
	caption.append(name, inscription);
	frame.append(img, caption);
	area.append(
		frame,
		el('p', '移动指针查看反光 · 预览沿用网站卡片比例', 'hint'),
	);
	area.refresh = (v, f) => {
		frame.dataset.foil = f;
		frame.dataset.tone = v.tone ?? 'blue';
		const src = v.image?.src ?? v.image;
		img.src = imagePreviews[src] ?? src;
		img.alt = `${v.cardInscription.prefix} 角色裁切预览`;
		img.style.objectPosition = v.imagePosition ?? 'center center';
		img.style.transform = `scale(${Math.max(1, Math.min(2, Number(v.imageScale ?? 1.04)))})`;
		name.textContent = v.cardInscription.prefix;
		inscription.textContent = v.cardInscription.name;
	};
	frame.addEventListener('pointermove', (e) => {
		if (
			e.pointerType !== 'mouse' ||
			matchMedia('(prefers-reduced-motion: reduce)').matches
		)
			return;
		const bounds = frame.getBoundingClientRect();
		frame.style.setProperty(
			'--pointer-x',
			`${((e.clientX - bounds.left) / bounds.width) * 100}%`,
		);
		frame.style.setProperty(
			'--pointer-y',
			`${((e.clientY - bounds.top) / bounds.height) * 100}%`,
		);
	});
	frame.addEventListener('pointerleave', () => {
		frame.style.removeProperty('--pointer-x');
		frame.style.removeProperty('--pointer-y');
	});
	area.refresh(visual, foil);
	return area;
}
function collectionEditor(value, field, set, section) {
	const container = el('div', undefined, 'collection');
	const rail = el('div', undefined, 'collection-rail'),
		list = el('div', undefined, 'record-list'),
		panel = el('section', undefined, 'record-editor');
	let query = '',
		selected = selection[section] ?? 0;
	const rows = () =>
		Array.isArray(value) ? value.map((v, i) => [i, v]) : Object.entries(value);
	const title = (v, k) =>
		typeof v === 'string'
			? v
			: (v.name ??
				v.title ??
				v.cardInscription?.prefix ??
				v.label ??
				v.text ??
				v.id ??
				String(k + 1));
	const display = () => {
		list.replaceChildren();
		const entries = rows();
		if (!entries.some(([k]) => k === selected)) selected = entries[0]?.[0];
		for (const [k, v] of entries.filter(([, v]) =>
			JSON.stringify(v).toLocaleLowerCase().includes(query),
		)) {
			const b = button('', () => {
				selected = k;
				selection[section] = k;
				display();
			});
			b.className = 'record-select';
			b.setAttribute('aria-pressed', String(k === selected));
			const text = el('span', undefined, 'record-summary');
			text.append(
				el('strong', title(v, k)),
				el(
					'small',
					typeof v === 'object'
						? (v.id ??
								v.cardInscription?.name ??
								v.href ??
								`条目 ${Number(k) + 1}`)
						: `句子 ${Number(k) + 1}`,
				),
			);
			if (section === 'profiles') {
				const img = el('img', undefined, 'record-avatar');
				const match = String(v.avatar).match(
					/^createCdnAvatar\(['"]([^'"]+)['"]\)$/,
				);
				const src =
					v.avatar?.src ??
					(match
						? 'https://assets.telysta.com/avatars/' +
							encodeURIComponent(match[1])
						: '');
				img.src = imagePreviews[src] ?? src;
				img.alt = '';
				b.append(img);
			} else if (v.icon) b.append(icon(v.icon));
			b.append(text);
			list.append(b);
		}
		if (!list.children.length) list.append(el('p', '没有匹配的条目', 'hint'));
		panel.replaceChildren();
		const entry = entries.find(([k]) => k === selected);
		if (!entry) {
			panel.append(el('p', '暂无条目，可从上方新增。'));
			return;
		}
		const [k, v] = entry;
		const top = el('div', undefined, 'item-heading');
		top.append(el('h3', title(v, k)));
		if (!field.locked && Array.isArray(value)) {
			const move = button(
				'上移',
				() => {
					[value[k - 1], value[k]] = [value[k], value[k - 1]];
					selected = k - 1;
					set(value);
					changed();
					display();
				},
				'small',
			);
			move.disabled = k === 0;
			top.append(
				toolbar(
					move,
					button(
						'移除此项',
						() => {
							value.splice(k, 1);
							set(value);
							changed();
							display();
						},
						'small danger',
					),
				),
			);
		}
		if (section === 'categories' || section === 'visuals')
			top.append(
				button(
					section === 'categories' ? '编辑对应角色' : '编辑分类资料',
					() => {
						selection[section === 'categories' ? 'visuals' : 'categories'] =
							section === 'categories'
								? v.id
								: relatedCategories.findIndex((c) => c.id === k);
						return navigate(
							section === 'categories' ? 'visuals' : 'categories',
						);
					},
					'small',
				),
			);
		panel.append(
			top,
			formField(
				v,
				Array.isArray(value) ? field.item : field.fields[k],
				section === 'visuals' ? String(k) : '',
				(next) => {
					value[k] = next;
					set(value);
				},
				section,
			),
		);
		panel.oninput = () => {
			const caption = title(value[k], k);
			top.querySelector('h3').textContent = caption;
			const selectedTitle = list.querySelector(
				'[aria-pressed="true"] .record-summary strong',
			);
			if (selectedTitle) selectedTitle.textContent = caption;
		};
	};
	const controls = el('div', undefined, 'collection-tools');
	controls.append(
		searchBox('搜索条目', (q) => {
			query = q;
			display();
		}),
	);
	if (!field.locked && Array.isArray(value))
		controls.append(
			button(
				{ hero: '新增欢迎语', tabs: '新增祝福语', social: '新增社交链接' }[
					section
				] ?? '新增条目',
				() => {
					value.push(defaultValue(field.item));
					selected = value.length - 1;
					query = '';
					controls.querySelector('input').value = '';
					set(value);
					changed();
					display();
				},
				'primary',
			),
		);
	rail.append(el('p', `${rows().length} 个条目`, 'eyebrow'), list);
	container.append(controls, rail, panel);
	display();
	return container;
}
async function fileContent(file) {
	if (!file || file.size > 8 * 1024 * 1024)
		throw new Error('请选择不超过 8 MB 的图片');
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(String(reader.result).split(',')[1]);
		reader.onerror = () => reject(new Error('图片读取失败'));
		reader.readAsDataURL(file);
	});
}
function imagePicker(input, set) {
	const area = el('div', undefined, 'image-picker'),
		img = el('img', undefined, 'qr-preview');
	img.alt = '二维码预览';
	const refresh = () => {
		const src =
			imagePreviews[input.value] ??
			contactMedia.find((m) => m.reference === input.value)?.url ??
			input.value;
		if (src) img.src = src;
		else img.removeAttribute('src');
	};
	input.addEventListener('input', refresh);
	refresh();
	const select = el('select');
	select.append(new Option('选择已有二维码…', ''));
	for (const item of contactMedia.filter(
		(m) =>
			m.reference.startsWith('src/assets/contact/') ||
			m.reference.startsWith('/media/qr-'),
	))
		select.append(new Option(item.label, item.reference));
	select.addEventListener('change', () => {
		if (select.value) {
			input.value = select.value;
			set(input.value);
			changed();
			refresh();
		}
	});
	const upload = el('input');
	upload.type = 'file';
	upload.accept = 'image/png,image/jpeg,image/webp';
	area.append(
		img,
		inputLabel('二维码图片地址', input),
		inputLabel('已有二维码', select),
		inputLabel('上传新二维码', upload),
		button(
			'处理并使用二维码',
			async () => {
				const serial = navigationSerial;
				const result = await api('/api/qr-upload', {
					content: await fileContent(upload.files[0]),
				});
				if (serial !== navigationSerial) return;
				imagePreviews[result.src] = result.preview;
				input.value = result.src;
				set(result.src);
				changed();
				refresh();
				message('无损 WebP 已保存到本地；请保存配置以使用这张图。');
			},
			'small',
		),
	);
	return area;
}
async function createEntryPage(kind) {
	if (!protectNavigation()) return;
	const serial = ++navigationSerial;
	const catalog = await api('/api/catalog');
	if (serial !== navigationSerial) return;
	dirty = false;
	main.replaceChildren();
	const title = {
		profiles: '新增头像身份',
		categories: '新增分类与角色',
		series: '新增系列',
	}[kind];
	heading(
		title,
		kind === 'series'
			? '系列归属于一个分类；创建后即可在文章中选择。'
			: '图片自动处理并保存到项目，随 Git 部署。当前上传目标：本地。',
	);
	const form = el('form', undefined, 'create-form');
	form.addEventListener('submit', (e) => e.preventDefault());
	const fields = el('fieldset');
	const record = {};
	const add = (key, label, values) => {
		const input = values
			? el('select')
			: el(key.toLowerCase().includes('description') ? 'textarea' : 'input');
		if (values)
			for (const item of values)
				input.append(new Option(optionLabels[item] ?? item, item));
		input.required = true;
		input.maxLength = key === 'id' ? 60 : 2000;
		if (key === 'id') {
			input.pattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
			input.placeholder = '例如 travel-notes';
		}
		record[key] = input.value;
		input.addEventListener('input', () => {
			record[key] = input.value;
			changed();
		});
		fields.append(inputLabel(label, input));
	};
	add('id', '稳定 ID');
	if (kind === 'profiles') {
		add('name', '角色名');
		add('alt', '替代文字');
		add('tone', '色调', ['warm', 'moon', 'rose', 'violet', 'mist']);
	}
	if (kind === 'series') {
		add(
			'category',
			'所属分类',
			catalog.categories.map((c) => c.id),
		);
		add('title', '系列标题');
		add('titleEn', '英文标题');
		add('description', '系列介绍');
		add('descriptionEn', '英文介绍');
	}
	if (kind === 'categories') {
		add('title', '中文分类名');
		add('prefix', '角色名');
		add('name', '英文分类题签');
		add('subtitle', '中文小题签');
		add('description', '分类介绍');
		add('descriptionEn', '英文介绍');
		add('foil', '光泽样式', foilOptions);
	}
	const file = el('input');
	file.type = 'file';
	file.accept = 'image/png,image/jpeg,image/webp';
	file.required = true;
	if (kind !== 'series') {
		fields.append(
			inputLabel(
				kind === 'profiles'
					? '头像图片（居中裁成正方形）'
					: '角色图片（保留完整画面）',
				file,
			),
		);
		file.addEventListener('change', changed);
	}
	const preview = el('div', undefined, 'creation-preview');
	const prepare = async () => ({
		kind,
		record: { ...record },
		versions: catalog.versions,
		...(kind === 'series' ? {} : { content: await fileContent(file.files[0]) }),
	});
	form.append(fields);
	main.append(
		form,
		preview,
		toolbar(
			button('查看创建预览', async () => {
				if (!form.reportValidity()) return;
				const revision = editRevision;
				const result = await api('/api/catalog', {
					...(await prepare()),
					preview: true,
				});
				if (serial !== navigationSerial || revision !== editRevision) return;
				preview.replaceChildren();
				if (result.image) {
					const img = el('img', undefined, 'creation-image');
					img.src = result.image;
					img.alt = '处理后的图片';
					preview.append(img);
				}
				preview.append(
					el('h3', '将创建或更新'),
					el('pre', result.changes.map((c) => c.path).join('\n')),
				);
				message('预览完成，尚未保存。');
			}),
			button(
				'创建并保存到本地',
				async () => {
					if (!form.reportValidity()) return;
					fields.disabled = true;
					try {
						const data = await prepare();
						await api('/api/catalog', data);
						if (serial !== navigationSerial) return;
						dirty = false;
						await navigate(kind);
						message('已创建并保存到本地。请预览网站并运行检查。');
					} finally {
						fields.disabled = false;
					}
				},
				'primary',
			),
			button('返回列表', () => navigate(kind)),
		),
	);
}

function formField(value, field, key, set, section) {
	if (
		key === '' &&
		(field.kind === 'array' ||
			(section === 'visuals' && field.kind === 'object'))
	)
		return collectionEditor(value, field, set, section);
	if (field.kind === 'object') {
		const group = el('fieldset');
		if (key) group.append(el('legend', labels[key] ?? key));
		for (const [name, spec] of Object.entries(field.fields)) {
			const current = Object.hasOwn(value, name)
				? value[name]
				: ({
						enabled: true,
						weight: 1,
						imagePosition: 'center center',
						imageScale: 1.04,
					}[name] ?? defaultValue(spec));
			group.append(
				formField(
					current,
					spec,
					name,
					(next) => {
						value[name] = next;
						set(value);
					},
					section,
				),
			);
		}

		if (section === 'profiles' && value.avatar) {
			const match = String(value.avatar).match(
				/^createCdnAvatar\(['"]([^'"]+)['"]\)$/,
			);
			const src =
				value.avatar?.src ??
				(match
					? 'https://assets.telysta.com/avatars/' + encodeURIComponent(match[1])
					: '');
			if (src) {
				const img = el('img', undefined, 'avatar');
				img.src = imagePreviews[src] ?? src;
				img.alt = value.alt ?? '头像预览';
				group.prepend(img);
			}
			if (imagePreviews[value.id]) {
				const icon = el('img', undefined, 'favicon');
				icon.src = imagePreviews[value.id];
				icon.alt = `${value.name} favicon`;
				group.prepend(icon);
			}
		}
		if (
			(section === 'visuals' && value.cardInscription) ||
			(section === 'categories' && value.id)
		) {
			const visual = section === 'visuals' ? value : relatedVisuals[value.id];
			if (visual) {
				const category =
					section === 'categories'
						? value
						: relatedCategories.find((c) => c.id === key);
				const preview = rolePreview(visual, category?.foil ?? 'starlight');
				group.prepend(preview);
				group.addEventListener('input', () =>
					preview.refresh(visual, category?.foil ?? value.foil ?? 'starlight'),
				);
			}
		}
		if (value.icon) {
			const preview = el('div', undefined, 'social-preview');
			const refresh = () =>
				preview.replaceChildren(
					icon(value.icon),
					el('strong', value.label ?? optionLabels[value.icon]),
				);
			refresh();
			group.prepend(preview);
			group.addEventListener('input', refresh);
		}

		return group;
	}
	if (field.kind === 'array') {
		const container = el('div');
		if (key) container.append(el('h3', labels[key] ?? key));
		const list = el('div');
		container.append(list);
		const draw = () => {
			list.replaceChildren();
			value.forEach((item, index) => {
				const row = el('section', undefined, 'list-row');
				const title = el('div', undefined, 'item-heading');
				title.append(
					el('h3', item?.name ?? item?.title ?? item?.id ?? `${index + 1}`),
				);
				if (!field.locked)
					title.append(
						toolbar(
							button(
								'上移',
								() => {
									if (index) {
										[value[index - 1], value[index]] = [
											value[index],
											value[index - 1],
										];
										set(value);
										changed();
										draw();
									}
								},
								'small',
							),
							button(
								'删除此项',
								() => {
									value.splice(index, 1);
									set(value);
									changed();
									draw();
								},
								'small danger',
							),
						),
					);
				row.append(
					title,
					formField(
						item,
						field.item,
						'',
						(next) => {
							value[index] = next;
							set(value);
						},
						section,
					),
				);
				list.append(row);
			});
		};
		draw();
		if (!field.locked)
			container.append(
				button(
					'新增一项',
					() => {
						value.push(defaultValue(field.item));
						set(value);
						changed();
						draw();
					},
					'small',
				),
			);
		return container;
	}
	if (field.kind === 'readonly')
		return inputLabel(
			labels[key] ?? key,
			el(
				'div',
				['image', 'avatar'].includes(key)
					? '由图片上传流程维护'
					: String(value ?? '未设置'),
				'readonly',
			),
		);
	let input;
	if (field.options) {
		input = el('select');
		for (const option of field.options) {
			const o = el('option', optionLabels[option] ?? option);
			o.value = option;
			input.append(o);
		}
	} else if (
		field.kind === 'string' &&
		(/text|description|Description/.test(key) ||
			key === '' ||
			String(value ?? '').length > 90 ||
			String(value ?? '').includes('\n'))
	)
		input = el('textarea');
	else {
		input = el('input');
		input.type =
			field.kind === 'number'
				? 'number'
				: field.kind === 'boolean'
					? 'checkbox'
					: 'text';
		if (input.type === 'number') {
			input.step = 'any';
			input.min = '0';
		}
	}
	if (field.kind === 'boolean') input.checked = Boolean(value);
	else input.value = value ?? '';
	input.addEventListener('input', () => {
		set(
			field.kind === 'boolean'
				? input.checked
				: field.kind === 'number'
					? input.valueAsNumber
					: input.value,
		);
		changed();
	});
	if (key === 'imageSrc') return imagePicker(input, set);
	return inputLabel(labels[key] ?? (key || '内容'), input);
}
function sourcePreview(previous, proposed) {
	const area = el('section', undefined, 'source-review');
	const rows = diffLines(previous, proposed);
	const added = rows.filter((row) => row.kind === 'add').length;
	const removed = rows.filter((row) => row.kind === 'remove').length;
	area.append(
		el('h3', '保存差异'),
		el(
			'p',
			rows.length ? `新增 ${added} 行 · 移除 ${removed} 行` : '内容没有变化',
			'hint',
		),
	);
	const diff = el('div', undefined, 'source-diff');
	diff.setAttribute('aria-label', '逐行源码差异');
	let sameRun = 0;
	for (const row of rows.slice(0, 1200)) {
		sameRun = row.kind === 'same' ? sameRun + 1 : 0;
		if (sameRun > 4) {
			if (sameRun === 5) diff.append(el('div', '… 未修改的内容 …', 'diff-gap'));
			continue;
		}
		const line = el('div', undefined, `diff-line diff-${row.kind}`);
		line.append(
			el('span', row.oldLine ?? '', 'line-number'),
			el('span', row.newLine ?? '', 'line-number'),
			el('span', { add: '+', remove: '−', same: ' ' }[row.kind], 'diff-sign'),
			el('code', row.text || ' '),
		);
		diff.append(line);
	}
	if (rows.length > 1200)
		diff.append(
			el('p', '仅显示前 1200 行；展开完整源码查看其余内容。', 'hint'),
		);
	if (rows.length) area.append(diff);
	const full = el('details');
	full.append(el('summary', '保存前后的完整源码'));
	full.append(
		el('h3', '当前文件'),
		el('pre', previous),
		el('h3', '将保存'),
		el('pre', proposed),
	);
	area.append(full);
	return area;
}
async function configPage(id, serial) {
	const current = await api(`/api/config?id=${id}`);
	if (serial !== navigationSerial) return;
	imagePreviews = current.previews ?? {};
	if (['categories', 'visuals'].includes(id)) {
		const other = await api(
			'/api/config?id=' + (id === 'categories' ? 'visuals' : 'categories'),
		);
		if (serial !== navigationSerial) return;
		relatedVisuals = id === 'visuals' ? current.value : other.value;
		relatedCategories = id === 'categories' ? current.value : other.value;
		imagePreviews = { ...imagePreviews, ...other.previews };
	}
	if (id === 'contacts') {
		contactMedia = await api('/api/media');
		if (serial !== navigationSerial) return;
	}
	let value = structuredClone(current.value);
	heading(
		current.label,
		notes[id] ??
			'编辑现有文案；保存前可检查源码变化。派生表达式和交互参数受保护。',
	);
	if (['profiles', 'categories', 'visuals', 'series'].includes(id)) {
		main.append(
			toolbar(
				button(
					{
						profiles: '新增头像身份',
						categories: '新增分类与角色',
						visuals: '新增分类与角色',
						series: '新增系列',
					}[id],
					() => createEntryPage(id === 'visuals' ? 'categories' : id),
					'primary',
				),
			),
		);
	}
	const location = el('details', undefined, 'source-location');
	location.append(el('summary', '配置文件'), el('code', current.path));
	main.append(location);
	if (id === 'hero') {
		const hour = el('input');
		hour.type = 'number';
		hour.min = '0';
		hour.max = '23';
		hour.value = String(new Date().getHours());
		const sample = el(
			'p',
			'试抽样使用当前表单中的句子和权重。',
			'text-preview',
		);
		main.append(
			inputLabel('试抽样小时（访客本地时间）', hour),
			button('按此小时试抽一句', async () => {
				const result = await api('/api/greeting-preview', {
					hour: Number(hour.value),
					value,
				});
				sample.textContent = result.text;
			}),
			sample,
		);
	}
	if (id === 'tabs') {
		const sample = el('p', '返回时：恢复当前页面原标题。', 'text-preview');
		main.append(
			toolbar(
				button('模拟离开', () => {
					sample.textContent =
						'离开时：' +
						(value[Math.floor(Math.random() * value.length)] ??
							'请至少保留一句');
				}),
				button('模拟返回', () => {
					sample.textContent = '返回时：恢复当前页面原标题。';
				}),
			),
			sample,
		);
	}
	const fields = formField(
		value,
		current.schema,
		'',
		(next) => {
			value = next;
		},
		id,
	);
	main.append(fields);
	const preview = el('div');
	const actions = toolbar(
		button('查看保存差异', async () => {
			const revision = editRevision;
			const result = await api(`/api/config?id=${id}`, {
				version: current.version,
				value,
				preview: true,
			});
			if (serial !== navigationSerial || revision !== editRevision) return;
			preview.replaceChildren(sourcePreview(result.previous, result.source));
			message('已校验，尚未写入文件');
		}),
		button(
			'保存到本地',
			async () => {
				const revision = editRevision;
				const result = await api(`/api/config?id=${id}`, {
					version: current.version,
					value,
				});
				current.version = result.version;
				if (serial !== navigationSerial) return;
				dirty = revision !== editRevision;
				preview.replaceChildren();
				message(
					dirty
						? '本次保存完成；保存期间的新输入尚未保存。'
						: '已保存到本地。请预览网站并运行检查。',
				);
			},
			'primary',
		),
		button('重新读取', () => navigate(id)),
	);
	actions.querySelector('.primary').dataset.save = 'true';
	actions.classList.add('actions');
	main.append(preview, actions);
}
async function postsPage(serial) {
	const data = await api('/api/posts');
	if (serial !== navigationSerial) return;
	heading(
		'系列与文章',
		'新文章先保存为草稿；原文编辑保留 YAML 注释、未知字段与 Markdown 扩展。正文及元数据预检后，使用网站预览核对渲染。',
	);
	const list = el('div', undefined, 'post-list');
	let query = '';
	const category = el('select'),
		state = el('select'),
		sort = el('select');
	category.append(new Option('全部分类', ''));
	for (const item of data.categories)
		category.append(new Option(item.title, item.id));
	state.append(
		new Option('全部状态', ''),
		new Option('草稿', 'draft'),
		new Option('已公开', 'published'),
	);
	sort.append(
		new Option('最近更新', 'updated'),
		new Option('最近发布', 'published'),
		new Option('标题顺序', 'title'),
	);
	const count = el('p', undefined, 'list-count');
	count.setAttribute('aria-live', 'polite');
	const draw = () => {
		list.replaceChildren();
		const posts = data.posts.filter(
			(p) =>
				`${p.title} ${p.path}`.toLocaleLowerCase().includes(query) &&
				(!category.value || p.category === category.value) &&
				(!state.value || p.draft === (state.value === 'draft')),
		);
		posts.sort((a, b) =>
			sort.value === 'title'
				? String(a.title).localeCompare(String(b.title), 'zh-CN')
				: contentDate(
						b[sort.value === 'published' ? 'publishedAt' : 'updatedAt'],
					).localeCompare(
						contentDate(
							a[sort.value === 'published' ? 'publishedAt' : 'updatedAt'],
						),
					) || a.path.localeCompare(b.path),
		);
		count.textContent = `${posts.length} / ${data.posts.length} 篇文章 · ${data.posts.filter((p) => p.draft).length} 篇草稿`;
		for (const post of posts) {
			const b = button('', () => openPost(post.path));
			const title = el('div', undefined, 'post-row-title');
			title.append(
				el('strong', String(post.title)),
				el(
					'span',
					post.draft ? '草稿' : '已公开',
					`post-badge ${post.draft ? 'draft' : ''}`,
				),
			);
			b.append(
				title,
				el(
					'small',
					`${data.categories.find((c) => c.id === post.category)?.title ?? post.category ?? '未分类'} · ${contentDate(post.updatedAt ?? post.publishedAt) || '日期未填写'}`,
				),
			);
			const location = el('small', post.path, 'post-path');
			b.append(location);
			list.append(b);
		}
		if (!posts.length)
			list.append(
				el('p', '没有匹配的文章，试试调整搜索或筛选条件。', 'empty-state'),
			);
	};
	for (const input of [category, state, sort])
		input.addEventListener('change', draw);
	draw();
	const title = el('input');
	title.placeholder = '文章标题';
	const folder = el('select');
	for (const name of data.folders) {
		const o = el('option', name);
		o.value = name;
		folder.append(o);
	}
	const create = el('details');
	create.append(
		el('summary', '新建文章'),
		inputLabel('标题', title),
		inputLabel('分类目录', folder),
		button('创建草稿编辑页', () => {
			if (!title.value.trim()) throw new Error('请填写标题');
			const date = localDate();
			const filename = `${date}-${title.value
				.trim()
				.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-')
				.replace(/[. ]+$/, '')}.md`;
			return editPost({
				path: `src/content/weiser-posts/${folder.value}/${filename}`,
				version: null,
				source: `---\ntitle: ${JSON.stringify(title.value.trim())}\ndraft: true\n---\n\n`,
			});
		}),
	);
	const filters = el('div', undefined, 'post-filters');
	filters.append(
		searchBox('搜索文章标题或路径', (q) => {
			query = q;
			draw();
		}),
		inputLabel('筛选分类', category),
		inputLabel('文章状态', state),
		inputLabel('排序', sort),
	);
	main.append(create, filters, count, list);
}
async function openPost(path) {
	if (!protectNavigation()) return;
	const serial = ++navigationSerial;
	const current = await api(`/api/post?path=${encodeURIComponent(path)}`);
	if (serial !== navigationSerial) return;
	editPost(current);
}
function editPost(current) {
	const serial = ++navigationSerial;
	main.replaceChildren();
	dirty = current.version === null;
	heading(
		current.version === null ? '新建草稿' : '编辑文章',
		'编辑文章信息与 Markdown，预览和保存会应用表单修改。使用右侧助手检查内容、提取摘要与选择章节序号。',
	);
	main.append(el('p', current.path, 'path'));
	const text = el('textarea', undefined, 'markdown');
	text.value = current.source;
	text.spellcheck = false;
	text.setAttribute('aria-label', 'Markdown 源码');
	text.addEventListener('input', changed);
	const preview = el('div');
	const assistant = el('aside', undefined, 'writing-assistant');
	assistant.setAttribute('aria-label', '写作助手');
	const checks = el('div', undefined, 'writing-checks');
	const suggestions = el('div', undefined, 'writing-suggestions');
	const stats = el('p', undefined, 'writing-stats');
	const updateStats = () => {
		stats.textContent = `${text.value.length.toLocaleString()} 字符 · ${text.value.split('\n').length} 行`;
		if (checks.children.length)
			checks.replaceChildren(el('p', '内容已变化，请重新检查。', 'hint'));
	};
	text.addEventListener('input', updateStats);
	updateStats();
	const editorSource = () => {
		const normalized = current.source.replace(/\r\n/g, '\n');
		if (text.value === normalized) return current.source;
		return current.source.includes('\r\n')
			? text.value.replace(/\r?\n/g, '\r\n')
			: text.value;
	};
	const metadataPanel = el('details');
	metadataPanel.open = true;
	metadataPanel.append(el('summary', '文章信息'));
	const metadataFields = el('div', undefined, 'post-metadata');
	metadataFields.append(el('p', '正在读取文章信息…', 'hint'));
	let fieldControls = {},
		fieldInfo,
		writing;
	let pendingFields = false,
		metadataBasis = '',
		fieldPatch = {};
	const renderFields = (info) => {
		fieldInfo = info;
		writing = info.writing;
		fieldControls = {};
		metadataFields.replaceChildren();
		metadataBasis = editorSource();
		fieldPatch = {};
		pendingFields = false;
		for (const [key, label, type] of [
			['title', '标题', 'text'],
			['titleEn', '英文标题', 'text'],
			['description', '摘要', 'textarea'],
			['descriptionEn', '英文摘要', 'textarea'],
			['publishedAt', '发布日期', 'date'],
			['updatedAt', '更新日期', 'date'],
			['category', '分类', 'category'],
			['series', '系列', 'series'],
			['seriesOrder', '系列顺序', 'number'],
			['draft', '草稿（不进入公开页面）', 'checkbox'],
			['tags', '标签（逗号分隔）', 'tags'],
			['cover', '封面图片地址', 'text'],
		]) {
			const value = info.authored[key];
			let input;
			if (type === 'category' || type === 'series') {
				input = el('select');
				const empty = el(
					'option',
					type === 'category' ? '自动按目录' : '无系列',
				);
				empty.value = '';
				input.append(empty);
				for (const item of info[
					type === 'category' ? 'categories' : 'series'
				]) {
					const option = el('option', `${item.title} · ${item.id}`);
					option.value = item.id;
					input.append(option);
				}
			} else if (type === 'textarea') input = el('textarea');
			else {
				input = el('input');
				input.type = type === 'tags' ? 'text' : type;
			}
			if (type === 'checkbox') input.checked = value === true;
			else
				input.value = Array.isArray(value) ? value.join(', ') : (value ?? '');
			if (type === 'number') {
				input.min = '1';
				input.step = '1';
			}
			const labelNode = inputLabel(label, input);
			fieldControls[key] = input;
			if (['description', 'descriptionEn', 'tags', 'cover'].includes(key))
				labelNode.classList.add('wide-field');
			if (value == null && info.metadata[key] != null && type !== 'checkbox')
				labelNode.append(
					el(
						'small',
						`自动值：${Array.isArray(info.metadata[key]) ? info.metadata[key].join(', ') : info.metadata[key]}`,
						'hint',
					),
				);
			input.addEventListener('input', () => {
				fieldPatch[key] =
					type === 'checkbox'
						? input.checked
						: type === 'number'
							? input.value
								? input.valueAsNumber
								: null
							: type === 'tags'
								? input.value
										.split(/[,，\n]/)
										.map((v) => v.trim())
										.filter(Boolean)
								: input.value || null;
				if (key === 'series' && !input.value) fieldPatch.seriesOrder = null;
				pendingFields = true;
				changed();
				updateStats();
				if (['series', 'category'].includes(key)) refreshSuggestions();
			});
			metadataFields.append(labelNode);
		}
		refreshSuggestions();
	};
	const refreshSuggestions = () => {
		if (!fieldInfo) return;
		suggestions.replaceChildren();
		const controls = fieldControls;
		const category = controls.category.value || fieldInfo.metadata.category;
		for (const option of controls.series.options) {
			const item = fieldInfo.series.find((s) => s.id === option.value);
			option.disabled = Boolean(
				item &&
				item.category !== category &&
				option.value !== controls.series.value,
			);
		}
		const selected = fieldInfo.series.find(
			(s) => s.id === controls.series.value,
		);
		controls.seriesOrder.disabled = !controls.series.value;
		if (
			writing?.title &&
			writing.title !== (controls.title.value || fieldInfo.metadata.title)
		)
			suggestions.append(
				el(
					'p',
					`正文一级标题为「${writing.title}」。页面优先使用正文标题。`,
					'hint',
				),
				button(
					'同步正文标题到表单',
					() => {
						controls.title.value = writing.title;
						controls.title.dispatchEvent(new Event('input', { bubbles: true }));
					},
					'small',
				),
			);
		if (selected && selected.category !== category)
			suggestions.append(
				el(
					'p',
					'当前系列与分类不一致，请选择同一分类下的系列。',
					'field-warning',
				),
			);
		if (writing?.excerpt && writing.excerpt !== controls.description.value)
			suggestions.append(
				el('p', writing.excerpt, 'excerpt-suggestion'),
				button(
					'使用首段摘要',
					() => {
						controls.description.value = writing.excerpt;
						controls.description.dispatchEvent(
							new Event('input', { bubbles: true }),
						);
						message('摘要建议已填入表单，保存时会应用到源码。');
					},
					'small',
				),
			);
		if (selected) {
			const next = writing?.seriesOrders?.[selected.id] ?? 1;
			suggestions.append(
				el(
					'p',
					`「${selected.title}」下一个可用序号：${next}（含草稿）`,
					'hint',
				),
				button(
					'使用建议序号',
					() => {
						controls.seriesOrder.value = String(next);
						controls.seriesOrder.dispatchEvent(
							new Event('input', { bubbles: true }),
						);
					},
					'small',
				),
			);
		}
		if (!suggestions.children.length)
			suggestions.append(
				el('p', '从正文首段提取摘要；选择系列后可查看章节序号建议。', 'hint'),
			);
	};
	const reloadFields = async () => {
		if (
			pendingFields &&
			!window.confirm('放弃尚未应用到源码的字段修改，重新读取吗？')
		)
			return;
		const source = editorSource(),
			revision = editRevision;
		const info = await api('/api/post-fields', { path: current.path, source });
		if (serial !== navigationSerial) return;
		if (revision !== editRevision) {
			if (!fieldInfo)
				setTimeout(() => {
					if (serial === navigationSerial && !fieldInfo)
						reloadFields().catch((error) => {
							metadataFields.replaceChildren(el('p', error.message, 'hint'));
						});
				}, 350);
			return;
		}
		renderFields(info);
	};
	const applyFields = async () => {
		if (!pendingFields) return;
		if (metadataBasis !== editorSource())
			throw new Error(
				'读取表单后源码已变化，请先复制字段输入，再从源码重新读取。',
			);
		const revision = editRevision;
		const info = await api('/api/post-fields', {
			path: current.path,
			source: editorSource(),
			patch: fieldPatch,
		});
		if (serial !== navigationSerial || revision !== editRevision)
			throw new Error('等待期间输入已变化，已保留当前输入，请重新应用。');
		text.value = info.source;
		changed();
		updateStats();
		renderFields(info);
		preview.replaceChildren();
	};
	metadataPanel.append(
		metadataFields,
		toolbar(
			button('从源码读取表单', reloadFields),
			button(
				'应用字段到源码',
				async () => {
					await applyFields();
					message('字段已应用到源码，尚未保存文件。');
				},
				'primary',
			),
		),
	);
	reloadFields().catch((error) => {
		if (serial !== navigationSerial) return;
		metadataFields.replaceChildren(el('p', error.message, 'hint'));
	});
	const jumpToLine = (line) => {
		const lines = text.value.split('\n');
		const start = lines
			.slice(0, line - 1)
			.reduce((sum, value) => sum + value.length + 1, 0);
		text.focus();
		text.setSelectionRange(start, start + (lines[line - 1]?.length ?? 0));
		text.scrollTop = Math.max(
			0,
			(line - 4) * parseFloat(getComputedStyle(text).lineHeight),
		);
	};
	assistant.append(
		el('span', 'WRITING NOTES', 'eyebrow'),
		el('h3', '写作助手'),
		el('p', '检查当前内容，建议由你选择使用。', 'hint'),
		stats,
		button('检查当前文章', async () => {
			await applyFields();
			const revision = editRevision;
			const result = await api('/api/post-assist', {
				path: current.path,
				source: editorSource(),
			});
			if (serial !== navigationSerial || revision !== editRevision) return;
			writing = result.writing;
			refreshSuggestions();
			checks.replaceChildren();
			const problems = [
				...result.issues,
				...result.writing.hints.map((h) => ({ ...h, severity: 'hint' })),
			];
			checks.append(
				el(
					'p',
					result.issues.some((i) => i.severity === 'error')
						? '请先修正以下内容'
						: '内容检查通过',
					'check-summary',
				),
			);
			for (const issue of problems) {
				const prefix = `${issue.severity === 'error' ? '需修正' : issue.severity === 'hint' ? '格式建议' : '提醒'}${issue.filePath && issue.filePath !== current.path ? ` · ${issue.filePath}` : ''}${issue.line ? ` · 第 ${issue.line} 行` : ''}`;
				const node =
					issue.line && (!issue.filePath || issue.filePath === current.path)
						? button(
								`${prefix}：${issue.message}`,
								() => jumpToLine(issue.line),
								'issue-link',
							)
						: el('p', `${prefix}：${issue.message}`, 'hint');
				checks.append(node);
			}
			if (!problems.length)
				checks.append(
					el(
						'p',
						'未发现内容问题。发布前仍需运行项目检查并核对网站效果。',
						'hint',
					),
				);
			message('已检查当前文章，尚未写入文件。');
		}),
		checks,
		el('h3', '可用建议'),
		suggestions,
	);
	const actions = toolbar(
		button('校验与预览', async () => {
			await applyFields();
			const revision = editRevision;
			const result = await api('/api/post', {
				...current,
				source: editorSource(),
				preview: true,
			});
			if (serial !== navigationSerial || revision !== editRevision) return;
			const frame = el('iframe');
			frame.title = '草稿正文预览';
			frame.setAttribute('sandbox', '');
			frame.referrerPolicy = 'no-referrer';
			frame.className = 'post-preview';
			frame.srcdoc = result.html;
			preview.replaceChildren(
				el('h3', '正文预览'),
				el(
					'p',
					'预览未保存的内容，不发布草稿。HTML 以代码显示，链接不可跳转；简谱引用与最终样式请通过网站构建核对。',
					'hint',
				),
				frame,
				el('h3', '自动补全后的元数据'),
				el('pre', JSON.stringify(result.metadata, null, 2)),
				el('pre', result.warnings.join('\n') || '没有内容警告'),
				sourcePreview(current.source, text.value),
			);
			message('内容校验通过，尚未写入');
		}),
		button(
			'保存文章',
			async () => {
				await applyFields();
				const source = editorSource(),
					revision = editRevision;
				const result = await api('/api/post', {
					path: current.path,
					version: current.version,
					source,
				});
				current.version = result.version;
				current.source = source;
				if (serial !== navigationSerial) return;
				dirty = revision !== editRevision;
				message(
					dirty
						? '本次保存完成；保存期间的新输入尚未保存。'
						: `文章已保存${result.warnings.length ? '；' + result.warnings.join('；') : ''}`,
				);
				preview.replaceChildren();
			},
			'primary',
		),
		button('返回文章列表', () => navigate('posts')),
	);
	actions.querySelector('.primary').dataset.save = 'true';
	actions.classList.add('actions');
	const editor = el('section', undefined, 'writing-editor');
	const writingLayout = el('div', undefined, 'writing-layout');
	const insert = (before, after = '') => {
		const start = text.selectionStart,
			end = text.selectionEnd;
		text.setRangeText(
			before + text.value.slice(start, end) + after,
			start,
			end,
			'select',
		);
		text.focus();
		text.dispatchEvent(new Event('input', { bubbles: true }));
	};
	const imagePanel = el('section', undefined, 'inline-media');
	imagePanel.hidden = true;
	imagePanel.setAttribute('aria-label', '文章图片选择');
	const chooseImage = async () => {
		if (!imagePanel.hidden) {
			imagePanel.hidden = true;
			text.focus();
			return;
		}
		const range = [text.selectionStart, text.selectionEnd],
			basis = text.value,
			revision = editRevision;
		const media = await api('/api/media');
		if (serial !== navigationSerial || revision !== editRevision) return;
		const alt = el('input');
		alt.placeholder = '描述图片内容，例如：Telysta 身着中亚风格服饰';
		const grid = el('div', undefined, 'inline-media-grid');
		const draw = (query) => {
			grid.replaceChildren();
			const matches = media.filter(
				(item) =>
					imageReference(item, current.path) &&
					item.label.toLocaleLowerCase().includes(query),
			);
			for (const item of matches.slice(0, 24)) {
				const b = button(
					'',
					() => {
						if (!alt.value.trim()) throw new Error('请先填写图片说明。');
						if (basis !== text.value)
							throw new Error(
								'选择图片期间源码已变化，请重新打开图片选择以定位插入位置。',
							);
						const caption = alt.value
							.trim()
							.replace(/[\r\n]/g, ' ')
							.replace(/[\\\[\]]/g, '\\$&');
						text.setSelectionRange(...range);
						insert(
							`\n\n![${caption}](<${imageReference(item, current.path)}>)\n\n`,
						);
						imagePanel.hidden = true;
						message('图片引用已插入源码，尚未保存。');
					},
					'inline-media-item',
				);
				const img = el('img');
				img.src = item.url;
				img.alt = '';
				img.loading = 'lazy';
				b.append(img, el('span', item.label));
				grid.append(b);
			}
			if (!matches.length) grid.append(el('p', '没有匹配的图片。', 'hint'));
			if (matches.length > 24)
				grid.append(
					el(
						'p',
						`显示前 24 张，共 ${matches.length} 张；输入名称缩小范围。`,
						'hint',
					),
				);
		};
		const search = searchBox('搜索可插入的图片', draw);
		imagePanel.replaceChildren(
			el('h3', '选择文章图片'),
			inputLabel('图片说明', alt),
			search,
			grid,
			button(
				'关闭图片选择',
				() => {
					imagePanel.hidden = true;
					text.focus();
				},
				'small',
			),
		);
		draw('');
		imagePanel.hidden = false;
		alt.focus();
	};
	const tools = toolbar(
		button('二级标题', () => insert('\n\n## ', '\n\n'), 'small'),
		button('加粗', () => insert('**', '**'), 'small'),
		button('引用', () => insert('\n\n> ', '\n\n'), 'small'),
		button('链接', () => insert('[', '](https://)'), 'small'),
		button('插入图片', chooseImage, 'small'),
	);
	tools.classList.add('markdown-tools');
	editor.append(metadataPanel, tools, imagePanel, text);
	writingLayout.append(editor, assistant);
	main.append(writingLayout, preview, actions);
	message(dirty ? '新草稿尚未保存。' : '已读取文章。');
}
async function mediaPage(serial) {
	const media = await api('/api/media');
	if (serial !== navigationSerial) return;
	heading(
		'素材选择',
		'已有 R2 清单与本地图片的索引。复制公共显示图地址可用于 Markdown。此处不上传、覆盖或删除 R2 对象。',
	);
	const upload = el('details');
	upload.append(el('summary', '上传本地文章图片／二维码'));
	const file = el('input');
	file.type = 'file';
	file.accept = 'image/png,image/jpeg';
	const destination = el('input');
	destination.placeholder = 'src/assets/contact/wechat-new.png';
	upload.append(
		inputLabel('图片（PNG / JPEG，最多 8 MiB）', file),
		inputLabel('保存到已有目录的新文件名', destination),
		button('上传新文件', async () => {
			const selected = file.files[0];
			if (!selected) throw new Error('请选择图片');
			if (selected.size > 8 * 1024 * 1024) throw new Error('图片最大 8 MiB');
			const content = await new Promise((resolve, reject) => {
				const reader = new FileReader();
				reader.onload = () => resolve(String(reader.result).split(',')[1]);
				reader.onerror = reject;
				reader.readAsDataURL(selected);
			});
			await api('/api/upload', { path: destination.value, content });
			message('图片已保存。请在文章或二维码配置中填写引用；旧图片保留。');
		}),
	);
	main.append(upload);
	const grid = el('div', undefined, 'media-grid');
	const draw = (query) => {
		grid.replaceChildren();
		for (const item of media.filter((m) =>
			`${m.label} ${m.source}`.toLocaleLowerCase().includes(query),
		)) {
			const card = el('article', undefined, 'media-card');
			const img = el('img');
			img.src = item.url;
			img.alt = item.label;
			img.loading = 'lazy';
			card.append(
				img,
				el(
					'p',
					`${item.label}\n${item.source} · ${item.width && item.height ? `${item.width} × ${item.height}` : '尺寸未登记'}`,
				),
				button('复制引用', async () => {
					await navigator.clipboard.writeText(item.reference);
					message('已复制引用');
				}),
				button('复制显示图地址', async () => {
					await navigator.clipboard.writeText(item.publicUrl ?? item.reference);
					message('已复制显示图地址／本地路径');
				}),
			);
			grid.append(card);
		}
	};
	draw('');
	main.append(searchBox('搜索素材名称', draw), grid);
}
async function historyPage(serial) {
	const data = await api('/api/history');
	if (serial !== navigationSerial) return;
	heading(
		'检查与历史',
		'历史只读。恢复前请使用 Git 工具逐文件检查；这里不提供回退或发布操作。',
	);
	main.append(
		el('h3', '工作区变更'),
		el('pre', data.status || '工作区干净'),
		el('h3', '近期配置与内容提交'),
		el('pre', data.history),
	);
	const output = el('pre');
	const state = el('p', undefined, 'hint');
	const poll = async () => {
		if (serial !== navigationSerial) return;
		const job = await api('/api/check');
		output.textContent = job.output || '暂无检查记录';
		state.textContent = job.running
			? '检查运行中，暂时不能保存配置或文章。'
			: job.exitCode === null
				? '尚未运行'
				: `检查结束，退出码 ${job.exitCode}`;
		if (job.running)
			setTimeout(() => poll().catch((e) => message(e.message, true)), 1200);
	};
	main.append(
		button('运行项目检查', async () => {
			await api('/api/check', {});
			await poll();
		}),
		state,
		output,
	);
	await poll();
}
async function navigate(id) {
	if (!protectNavigation()) return;
	dirty = false;
	active = id;
	const serial = ++navigationSerial;
	main.replaceChildren(el('p', '正在读取…', 'hint'));
	main.setAttribute('aria-busy', 'true');
	message();
	for (const b of document.querySelectorAll('nav button')) {
		if (b.dataset.id === id) {
			b.setAttribute('aria-current', 'page');
			document.querySelector('#nav-current').textContent = b.textContent;
		} else b.removeAttribute('aria-current');
	}
	document.querySelector('.sidebar').dataset.open = 'false';
	document.querySelector('.nav-toggle').setAttribute('aria-expanded', 'false');
	try {
		main.replaceChildren();
		if (id === 'posts') await postsPage(serial);
		else if (id === 'media') await mediaPage(serial);
		else if (id === 'history') await historyPage(serial);
		else await configPage(id, serial);
	} catch (e) {
		if (serial === navigationSerial) {
			message(e.message, true);
			main.append(
				el('p', '读取失败。修复文件后可以重新读取。'),
				button('重新读取', () => navigate(active)),
			);
		}
	} finally {
		if (serial === navigationSerial) main.removeAttribute('aria-busy');
	}
}
async function start() {
	const session = await api('/api/session');
	token = session.token;
	socialIcons = session.icons ?? {};
	foilOptions = Object.keys(session.foils ?? {});
	Object.assign(optionLabels, session.foils);
	const nav = document.querySelector('nav');
	const names = Object.fromEntries(
		session.sections.map((s) => [s.id, s.label]),
	);
	for (const [title, ids] of [
		['站点与首页', ['site', 'home', 'intro', 'hero', 'profiles', 'tabs']],
		['导航与分类', ['social', 'contacts', 'categories', 'visuals', 'series']],
		[
			'写作与维护',
			['posts', 'media', 'blog', 'article', 'resources', 'history'],
		],
	]) {
		const group = el('section', undefined, 'nav-group');
		group.append(el('h2', title));
		for (const id of ids) {
			const b = button(
				names[id] ??
					{ posts: '系列与文章', media: '素材选择', history: '检查与历史' }[id],
				() => navigate(id),
			);
			b.dataset.id = id;
			group.append(b);
		}
		nav.append(group);
	}
	const navSearch = document.querySelector('#nav-search');
	navSearch.addEventListener('input', () => {
		const query = navSearch.value.trim().toLocaleLowerCase();
		for (const group of nav.children) {
			for (const b of group.querySelectorAll('button'))
				b.hidden = !b.textContent.toLocaleLowerCase().includes(query);
			group.hidden = !group.querySelector('button:not([hidden])');
		}
	});
	document.querySelector('.nav-toggle').addEventListener('click', () => {
		const sidebar = document.querySelector('.sidebar');
		const open = sidebar.dataset.open !== 'true';
		sidebar.dataset.open = String(open);
		document
			.querySelector('.nav-toggle')
			.setAttribute('aria-expanded', String(open));
	});
	document.addEventListener('keydown', (event) => {
		if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
		if (event.key.toLowerCase() === 's') {
			const save = main.querySelector('[data-save]');
			if (!save) return;
			event.preventDefault();
			if (!save.disabled) save.click();
		}
		if (event.key.toLowerCase() === 'k') {
			event.preventDefault();
			document.querySelector('.sidebar').dataset.open = 'true';
			document
				.querySelector('.nav-toggle')
				.setAttribute('aria-expanded', 'true');
			navSearch.focus();
		}
	});
	document.addEventListener('focusin', (event) => {
		if (
			!main.contains(event.target) ||
			!event.target.matches('input, select, textarea, button')
		)
			return;
		const bar = main.querySelector('.actions');
		if (!bar || bar.contains(event.target)) return;
		const bounds = event.target.getBoundingClientRect(),
			actions = bar.getBoundingClientRect();
		if (bounds.bottom > actions.top && bounds.top < actions.bottom)
			event.target.scrollIntoView({ block: 'center' });
	});
	await navigate('site');
}
start().catch((e) => message(e.message, true));
