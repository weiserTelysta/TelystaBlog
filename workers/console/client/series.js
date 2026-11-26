import { authError } from './auth.js';
import { ask, button, el, field, locale } from './ui.js';

const labels = {
	id: ['固定链接编号', 'Permanent URL ID'],
	title: ['系列名称', 'Series name'],
	titleEn: ['英文名称', 'English name'],
	description: ['系列简介', 'Description'],
	descriptionEn: ['英文简介', 'English description'],
};
const name = item => locale() === 'en' ? item.titleEn || item.title : item.title;

export async function renderSeries({ api, workspace, current, tell, dirty, navigate }) {
	let { series, categories, revision } = await api('series');
	if (!current()) return;
	const shell = el('div', '', 'series-manager');
	const heading = el('div', '', 'workspace-heading');
	const list = el('select');
	const editor = el('div');
	const articles = button(['分配文章', 'Assign articles'], () => navigate('post'), 'quiet-button');
	const create = button(['新建系列', 'New series'], async () => {
		if (!(await discard())) return;
		list.value = '';
		show(null);
	}, 'quiet-button');
	heading.append(el('h1', ['文章系列', 'Article series']), articles, create);
	shell.append(heading, field(['选择系列', 'Select series'], list), editor);
	workspace.replaceChildren(shell);
	let selected = series[0]?.id || '', changed = false, saving = false;
	updateList();
	show(series.find(item => item.id === selected));
	list.addEventListener('change', async () => {
		const next = list.value;
		if (!(await discard())) { list.value = selected; return; }
		show(series.find(item => item.id === next));
	});

	function updateList() {
		const placeholder = el('option', ['新系列', 'New series']);
		placeholder.value = '';
		list.replaceChildren(placeholder);
		for (const item of series) {
			const option = el('option', () => name(item));
			option.value = item.id;
			list.append(option);
		}
		list.value = selected;
	}
	function discard() {
		return !changed || ask(['舍弃此系列尚未保存的修改？', 'Discard unsaved changes to this series?']);
	}
	function show(item) {
		selected = item?.id || '';
		changed = false;
		dirty(false);
		const form = el('form', '', 'series-manager__form');
		const details = el('div', '', 'editor-section');
		const controls = {};
		for (const [key, label] of Object.entries(labels)) {
			const input = el(key.startsWith('description') ? 'textarea' : 'input');
			input.required = true;
			input.maxLength = key.startsWith('description') ? 400 : key === 'id' ? 64 : 120;
			input.value = item?.[key] || '';
			if (key === 'id') {
				input.pattern = '[a-z0-9]+(?:-[a-z0-9]+)*';
				input.readOnly = Boolean(item);
			}
			if (input instanceof HTMLTextAreaElement) input.rows = 2;
			controls[key] = input;
			details.append(field(label, input));
		}
		const category = el('select');
		for (const value of categories) {
			const option = el('option', () => name(value));
			option.value = value.id;
			category.append(option);
		}
		category.value = item?.category || categories[0]?.id;
		category.disabled = Boolean(item);
		details.prepend(field(['所属分类', 'Category'], category));
		const crop = cropEditor(item, tell);
		const save = button(['保存系列草稿', 'Save series draft'], null, 'primary');
		save.type = 'submit';
		const validity = el('p', [
			'草稿保存在云端。将文章归入系列时，在文章编辑的「分类与访问」中选择系列和顺序。',
			'Drafts are saved to the cloud. To assign an article, select the series and order under Classification & access.'
		], 'record-meta');
		form.append(details, crop.panel, save, validity);
		editor.replaceChildren(form);
		form.addEventListener('input', () => { changed = true; dirty(true); });
		form.addEventListener('submit', async event => {
			event.preventDefault();
			if (saving) return;
			saving = true;
			save.disabled = list.disabled = create.disabled = true;
			try {
				const input = Object.fromEntries(Object.entries(controls).map(([key, control]) => [key, control.value.trim()]));
				const result = await api('series', {
					method: 'PATCH',
					body: JSON.stringify({ ...input, create: !item, category: category.value, revision, image: crop.image() }),
				});
				if (!current()) return;
				({ series, revision } = result);
				selected = input.id;
				updateList();
				show(series.find(value => value.id === selected));
				tell(['系列草稿已保存。', 'Series draft saved.']);
				editor.querySelector('button[type=submit]')?.focus();
			} catch (error) {
				if (current()) tell(authError(error));
			} finally {
				saving = false;
				save.disabled = list.disabled = create.disabled = false;
			}
		});
	}
}

function cropEditor(item, tell) {
	const panel = el('div', '', 'series-crop');
	const preview = el('img');
	preview.alt = '';
	if (item?.cover) preview.src = item.cover;
	else if (item?.artworkId) preview.src = './series-cover-previews/' + encodeURIComponent(item.artworkId) + '.webp';
	else preview.hidden = true;
	const canvas = el('canvas');
	canvas.width = 352;
	canvas.height = 440;
	canvas.hidden = true;
	canvas.setAttribute('role', 'img');
	canvas.setAttribute('aria-label', locale() === 'en' ? 'Cropped cover preview' : '裁剪后的封面预览');
	const context = canvas.getContext('2d', { alpha: false });
	const input = el('input');
	input.type = 'file';
	input.accept = 'image/jpeg,image/png,image/webp';
	const adjust = el('fieldset', '', 'series-crop__sliders');
	adjust.hidden = true;
	adjust.append(el('legend', ['裁剪构图', 'Cover framing']));
	const slider = (label, min, max, value) => {
		const control = el('input');
		control.type = 'range';
		Object.assign(control, { min, max, value });
		adjust.append(field(label, control));
		return control;
	};
	const zoom = slider(['缩放', 'Zoom'], 100, 250, 100);
	const x = slider(['左右取景', 'Horizontal position'], 0, 100, 50);
	const y = slider(['上下取景', 'Vertical position'], 0, 100, 50);
	let source;
	let loading = 0;
	function draw() {
		if (!source || !context) return;
		const { naturalWidth: w, naturalHeight: h } = source;
		const scale = Math.max(canvas.width / w, canvas.height / h) * Number(zoom.value) / 100;
		const width = canvas.width / scale, height = canvas.height / scale;
		context.fillStyle = '#0b0f17';
		context.fillRect(0, 0, canvas.width, canvas.height);
		context.drawImage(source, (w - width) * Number(x.value) / 100, (h - height) * Number(y.value) / 100,
			width, height, 0, 0, canvas.width, canvas.height);
	}
	input.addEventListener('change', async () => {
		const version = ++loading, file = input.files[0];
		if (!file) return;
		try {
			if (file.size > 16 * 1024 * 1024 || !context || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error();
			const reader = new FileReader();
			const image = new Image();
			image.src = await new Promise((resolve, reject) => {
				reader.onload = () => resolve(reader.result);
				reader.onerror = reject;
				reader.readAsDataURL(file);
			});
			await image.decode();
			if (loading !== version) return;
			source = image;
			zoom.value = '100';
			x.value = y.value = '50';
			canvas.hidden = adjust.hidden = false;
			preview.hidden = true;
			draw();
		} catch {
			if (loading === version) tell(['无法打开图片，请选择 16 MB 以内的 JPEG、PNG 或 WebP。', 'Choose a JPEG, PNG, or WebP up to 16 MB.']);
		}
	});
	adjust.addEventListener('input', draw);
	panel.append(
		preview, canvas, field(['选取封面图片', 'Choose cover image'], input), adjust,
		el('p', ['封面为 4∶5。保存会上传裁好的公开封面，原图留在本地。', 'The crop is 4:5. Saving uploads the public thumbnail; the original stays on your device.'], 'record-meta')
	);
	return {
		panel,
		image() {
			if (!source) return undefined;
			for (const quality of [.84, .72, .56]) {
				const data = canvas.toDataURL('image/webp', quality);
				if (data.startsWith('data:image/webp;base64,') && data.length <= 87407) return data;
			}
			throw new Error(locale() === 'en' ? 'Could not create a WebP cover under 64 KB.' : '无法生成 64 KB 以内的 WebP 封面。');
		}
	};
}
