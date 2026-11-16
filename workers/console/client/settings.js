import { el, button, field, word, bind } from './ui.js';
import { authError } from './auth.js';
const labels = {
	title: ['标题', 'Title'],
	titleEn: ['英文标题', 'English title'],
	description: ['说明', 'Description'],
	descriptionEn: ['英文说明', 'English description'],
	label: ['显示名称', 'Label'],
	labelEn: ['英文名称', 'English label'],
	name: ['名称', 'Name'],
	nameEn: ['英文名称', 'English name'],
	text: ['文字', 'Text'],
	textEn: ['英文文字', 'English text'],
	href: ['链接地址', 'Link address'],
	url: ['链接地址', 'Link address'],
	imageSrc: ['图片地址', 'Image address'],
	avatarSrc: ['头像图片', 'Avatar image'],
	image: ['图片', 'Image'],
	alt: ['图片描述', 'Image description'],
	altEn: ['英文图片描述', 'English image description'],
	enabled: ['启用', 'Enabled'],
	weight: ['出现权重', 'Display weight'],
	category: ['所属分类', 'Category'],
	categoryId: ['分类编号', 'Category ID'],
	icon: ['图标', 'Icon'],
	id: ['固定编号', 'Permanent ID'],
	slug: ['固定路径', 'Permanent path'],
	type: ['类型', 'Type'],
	order: ['顺序', 'Order'],
	summary: ['摘要', 'Summary'],
	summaryEn: ['英文摘要', 'English summary'],
	license: ['使用许可', 'License'],
	author: ['作者', 'Author'],
	siteUrl: ['站点网址', 'Site address'],
	siteName: ['站点名称', 'Site name'],
	language: ['语言', 'Language'],
	lang: ['语言', 'Language'],
	navigation: ['主导航', 'Primary navigation'],
	sections: ['内容分区', 'Content sections'],
	titlePrefix: ['标题前缀', 'Title prefix'],
	titleSuffix: ['标题后缀', 'Title suffix'],
	target: ['打开方式', 'Open target'],
	duration: ['持续时间', 'Duration'],
	offset: ['偏移量', 'Offset'],
	threshold: ['触发阈值', 'Threshold'],
	count: ['数量', 'Count'],
	size: ['尺寸', 'Size'],
	opacity: ['不透明度', 'Opacity'],
	scale: ['缩放', 'Scale'],
	position: ['位置', 'Position'],
	targetBlank: ['新标签页打开', 'Open in a new tab'],
	status: ['状态', 'Status'],
	formats: ['格式', 'Formats'],
	readMore: ['阅读更多', 'Read more'],
	empty: ['空状态文案', 'Empty state'],
	search: ['搜索', 'Search'],
	placeholder: ['输入提示', 'Placeholder']
};

Object.assign(
	labels,
	Object.fromEntries(
		[
			['actionsLabel', '相关操作名称', 'Actions label'],
			['allLabel', '全部选项名称', 'All option label'],
			['allRecordsTitle', '全部文章名称', 'All articles title'],
			['ariaLabel', '无障碍名称', 'Accessible name'],
			['aurora', '极光光泽', 'Aurora finish'],
			['authorName', '作者姓名', 'Author name'],
			['avatar', '头像', 'Avatar'],
			['backLabel', '返回操作名称', 'Back label'],
			['backToTop', '返回顶部', 'Back to top'],
			['behavior', '滚动方式', 'Scroll behavior'],
			['bilibili', '哔哩哔哩', 'Bilibili'],
			['bottomThreshold', '底部触发距离', 'Bottom threshold'],
			['cardInscription', '卡片寄语', 'Card inscription'],
			['categoryAccordion', '分类展开控件', 'Category accordion'],
			['categoryIndex', '分类索引', 'Category index'],
			['categorySuffix', '分类名称后缀', 'Category suffix'],
			['categoryTitleSuffix', '分类标题后缀', 'Category title suffix'],
			['closeLabel', '关闭操作名称', 'Close label'],
			['codeCopy', '代码复制', 'Code copy'],
			['collection', '收藏', 'Collection'],
			['comfortAnchor', '阅读舒适位置', 'Reading anchor'],
			['comfortBottom', '底部舒适间距', 'Bottom reading margin'],
			['comfortTop', '顶部舒适间距', 'Top reading margin'],
			['compactMediaQuery', '紧凑布局条件', 'Compact layout query'],
			['contentsLabel', '目录操作名称', 'Contents label'],
			['copied', '复制完成文案', 'Copied message'],
			['countLabel', '数量说明', 'Count label'],
			['coverAriaLabel', '封面无障碍名称', 'Accessible cover label'],
			['crosshatch', '交叉光纹', 'Crosshatch finish'],
			['currentLabel', '当前位置名称', 'Current location label'],
			['dayAffinity', '白天出现偏好', 'Daytime preference'],
			['defaultDescription', '默认分享说明', 'Default description'],
			['defaultMessage', '默认提示', 'Default message'],
			['defaultTitle', '默认标题', 'Default title'],
			['dialogEyebrow', '对话框题签', 'Dialog label'],
			['dialogLabel', '对话框无障碍名称', 'Accessible dialog label'],
			['dialogTitle', '对话框标题', 'Dialog title'],
			['download', '下载功能', 'Download'],
			['downloadLabel', '下载操作名称', 'Download label'],
			['drawer', '侧栏', 'Side panel'],
			['email', '邮箱', 'Email'],
			['embers', '余烬光泽', 'Ember finish'],
			['emptyLabel', '无内容提示', 'Empty label'],
			['emptyState', '空状态', 'Empty state'],
			['entryLabel', '入口名称', 'Entry label'],
			['error', '错误提示', 'Error'],
			['errorLabel', '错误说明', 'Error label'],
			['external', '外部链接', 'External link'],
			['eyebrow', '原有题签文案', 'Existing label'],
			['featuredImages', '额外收录图片', 'Featured images'],
			['filter', '筛选', 'Filter'],
			['foil', '光泽样式', 'Finish'],
			['github', 'GitHub', 'GitHub'],
			['header', '页面顶部', 'Header'],
			['height', '高度', 'Height'],
			['hero', '首页头像区域', 'Home avatar area'],
			['hint', '提示', 'Hint'],
			['home', '首页', 'Home'],
			['homeLabel', '首页入口名称', 'Home label'],
			['icpRecord', '备案信息', 'Registration record'],
			['idle', '待机文案', 'Idle message'],
			['imageLabel', '图片说明', 'Image label'],
			['imagePosition', '图片裁切位置', 'Image position'],
			['imageScale', '图片缩放', 'Image scale'],
			['imageViewer', '图片查看器', 'Image viewer'],
			['indexHeader', '列表标题', 'List header'],
			['inspectionLeaveMs', '离开检查延迟（毫秒）', 'Leave delay (ms)'],
			['items', '条目', 'Items'],
			['kind', '类型', 'Kind'],
			['letters', '信件', 'Letters'],
			['life', '生活', 'Life'],
			['limited', '限制提示', 'Restricted message'],
			['loading', '加载文案', 'Loading message'],
			['manuscript', '手稿', 'Manuscripts'],
			['maxDepth', '目录最大层级', 'Maximum outline depth'],
			['meta', '元信息', 'Metadata'],
			['metaAriaLabel', '元信息无障碍名称', 'Accessible metadata label'],
			['minDepth', '目录起始层级', 'Minimum outline depth'],
			[
				'minHeadingCount',
				'显示目录的最少标题数',
				'Minimum headings for outline'
			],
			['mood', '语气', 'Mood'],
			['moonlit', '月光光泽', 'Moonlit finish'],
			['navItems', '导航项目', 'Navigation items'],
			['navigationLabel', '导航名称', 'Navigation label'],
			['nextLabel', '下一页名称', 'Next label'],
			['notes', '笔记', 'Notes'],
			['openLabel', '打开操作名称', 'Open label'],
			['pageLabel', '页面名称', 'Page label'],
			['portraits', '人物', 'Portraits'],
			['prefix', '前缀', 'Prefix'],
			['previousLabel', '上一页名称', 'Previous label'],
			['prism', '棱镜光泽', 'Prism finish'],
			['publishedLabel', '发表时间名称', 'Published label'],
			['qq', 'QQ', 'QQ'],
			['reading', '阅读', 'Reading'],
			['readingLineOffset', '阅读线偏移', 'Reading line offset'],
			['recordLabel', '条目名称', 'Record label'],
			['recordsLabel', '文章集合名称', 'Records label'],
			['reducedMotionQuery', '减少动态条件', 'Reduced motion query'],
			['resultCount', '搜索结果数量文案', 'Result count message'],
			['revealAnchor', '显示锚点', 'Reveal anchor'],
			['revealCooldownMs', '显示冷却（毫秒）', 'Reveal cooldown (ms)'],
			['revealMargin', '显示间距', 'Reveal margin'],
			['ripple', '涟漪光泽', 'Ripple finish'],
			['satin', '缎面光泽', 'Satin finish'],
			['scrollSettleMs', '滚动停止等待（毫秒）', 'Scroll settle delay (ms)'],
			['series', '系列', 'Series'],
			['seriesIndex', '系列索引', 'Series index'],
			['shareImage', '分享图片', 'Share image'],
			['shortLabel', '简短名称', 'Short label'],
			['showAfter', '出现距离', 'Show after'],
			['smoothNavigation', '平滑跳转', 'Smooth navigation'],
			['starlight', '星光光泽', 'Starlight finish'],
			['steam', 'Steam', 'Steam'],
			['subtitleEn', '英文副标题', 'English subtitle'],
			['titleSeparator', '标题分隔符', 'Title separator'],
			['toc', '文章目录', 'Table of contents'],
			['tone', '色调', 'Tone'],
			['unavailableLabel', '暂不可用文案', 'Unavailable label'],
			['updatedLabel', '更新时间名称', 'Updated label'],
			['userIntentMs', '操作判定时间（毫秒）', 'Intent interval (ms)'],
			['viewer', '查看器', 'Viewer'],
			['wechat', '微信', 'WeChat'],
			['width', '宽度', 'Width'],
			['x', 'X', 'X'],
			['yearJump', '年份跳转', 'Year navigation'],
			['zoomLabel', '缩放操作名称', 'Zoom label']
		].map(([key, zh, en]) => [key, [zh, en]])
	)
);
const naming = (key) =>
	labels[key] || [
		key.replace(/([a-z])([A-Z])/g, '$1 $2'),
		key.replace(/([a-z])([A-Z])/g, '$1 $2')
	];
export function renderSettings(context) {
	const { api, workspace, current, tell, dirty, back } = context;
	let record = context.record,
		sections = context.editor.sections,
		sectionName = context.section || sections[0]?.name,
		busy = false;
	const pending = new Map();
	const container = el('div', '', 'settings-editor');
	workspace.replaceChildren(container);
	const top = el('div', '', 'workspace-heading'),
		heading = el('h1', ['站点设置', 'Site settings']);
	top.append(heading, button(['返回设置列表', 'Back to settings'], back));
	container.append(top);
	const sectionMenu = el('nav', '', 'section-tabs');
	bind(sectionMenu, ['设置分组', 'Settings groups'], 'aria-label');
	container.append(sectionMenu);
	const body = el('section');
	container.append(body);
	function render() {
		sectionMenu.replaceChildren();
		for (const section of sections) {
			const tab = button(section.title, () => {
				sectionName = section.name;
				render();
			});
			tab.setAttribute('aria-current', String(section.name === sectionName));
			sectionMenu.append(tab);
		}
		const section = sections.find((s) => s.name === sectionName);
		body.replaceChildren();
		if (!section) {
			body.append(
				el(
					'p',
					[
						'此项设置暂时只支持在源文件中维护。',
						'This setting currently needs to be maintained in its source file.'
					],
					'empty'
				)
			);
			return;
		}
		body.append(
			el('h2', section.title),
			el('p', section.description, 'field-help')
		);
		const form = el('form', '', 'settings-form');
		form.method = 'post';
		form.action =
			'./api/documents/' + encodeURIComponent(record.id) + '/editor';
		const fields = el('div', '', 'settings-fields');
		renderNode(section.fields, fields, section.name);
		form.append(fields);
		const save = button(['保存草稿', 'Save draft'], () => {}, 'primary');
		save.type = 'submit';
		const note = el(
			'p',
			[
				'修改先保存在云端草稿，公开网站需要另行发布。',
				'Changes are saved as cloud drafts. Publishing the public site is a separate step.'
			],
			'field-help'
		);
		form.append(el('div', '', 'editor-actions'), note);
		form.querySelector('.editor-actions').append(save);
		form.addEventListener('submit', async (event) => {
			event.preventDefault();
			if (busy || !form.reportValidity()) return;
			busy = true;
			save.disabled = true;
			try {
				for (const [name, patches] of pending) {
					if (!patches.size) continue;
					const result = await api(
						'documents/' + encodeURIComponent(record.id) + '/editor',
						{
							method: 'PATCH',
							body: JSON.stringify({
								section: name,
								patches: [...patches.values()],
								revision: record.revision
							})
						}
					);
					if (!current()) return;
					record = result.record;
					sections = result.editor.sections;
					pending.delete(name);
				}
				dirty(false);
				render();
				tell([
					'设置草稿已保存，公开网站尚未更新。',
					'Settings draft saved. The public site has not changed.'
				]);
			} catch (error) {
				tell(
					error.code === 'VERSION_CONFLICT'
						? [
								'设置已有新版本，当前输入仍保留。请对照后再保存。',
								'A newer version exists. Your input is preserved. Compare before saving again.'
							]
						: authError(error)
				);
			} finally {
				busy = false;
				if (current()) save.disabled = false;
			}
		});
		body.append(form);
	}
	function renderNode(node, target, section) {
		if (node.kind === 'readonly') return;
		if (node.kind === 'object' || node.kind === 'array') {
			const parent = el('fieldset', '', 'settings-group');
			if (node.key)
				parent.append(
					el(
						'legend',
						/^\d+$/.test(node.key)
							? ['项目 ' + node.key, 'Item ' + node.key]
							: naming(node.key)
					)
				);
			for (const child of node.children || [])
				renderNode(child, parent, section);
			if (parent.querySelector('input,textarea,select')) target.append(parent);
			return;
		}
		const key = JSON.stringify(node.path),
			value = pending.get(section)?.get(key)?.value ?? node.value;
		const control = el(
			node.kind === 'string' && String(value || '').length > 100
				? 'textarea'
				: 'input'
		);
		if (control.tagName === 'INPUT')
			control.type =
				node.kind === 'boolean'
					? 'checkbox'
					: node.kind === 'number'
						? 'number'
						: 'text';
		if (node.kind === 'boolean') control.checked = !!value;
		else control.value = String(value ?? '');
		if (node.kind === 'number') control.step = 'any';
		else if (node.kind === 'string') control.maxLength = 40000;
		control.addEventListener('input', () => {
			let values = pending.get(section);
			if (!values) {
				values = new Map();
				pending.set(section, values);
			}
			values.set(key, {
				path: node.path,
				value:
					node.kind === 'boolean'
						? control.checked
						: node.kind === 'number'
							? Number(control.value)
							: control.value
			});
			dirty(true);
		});
		const label = node.key ? naming(node.key) : ['服务地址', 'Service address'];
		target.append(field(label, control));
	}
	render();
}
