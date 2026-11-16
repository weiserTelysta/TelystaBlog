const copies = new WeakMap();
let language;
try {
	language =
		localStorage.getItem('telysta.console.locale') === 'en' ? 'en' : 'zh';
} catch {
	language = 'zh';
}
export const locale = () => language;
export const word = (value) => {
	const pair = typeof value === 'function' ? value() : value;
	return Array.isArray(pair)
		? pair[language === 'en' ? 1 : 0]
		: String(pair ?? '');
};
export function bind(node, value, attribute) {
	const mapping = copies.get(node) || new Map();
	mapping.set(attribute || 'text', value);
	copies.set(node, mapping);
	node.dataset.consoleCopy = '';
	apply(node);
	return node;
}
function apply(node) {
	for (const [attribute, value] of copies.get(node) || []) {
		if (attribute === 'text') node.textContent = word(value);
		else node.setAttribute(attribute, word(value));
	}
}
export function setLocale(next) {
	language = next === 'en' ? 'en' : 'zh';
	document.documentElement.lang = language === 'en' ? 'en' : 'zh-CN';
	try {
		localStorage.setItem('telysta.console.locale', language);
	} catch {}
	for (const node of document.querySelectorAll('[data-console-copy]'))
		apply(node);
	window.dispatchEvent(
		new CustomEvent('console-locale-change', { detail: language })
	);
}
export function el(tag, label = '', className = '') {
	const node = document.createElement(tag);
	if (label) bind(node, label);
	if (className) node.className = className;
	return node;
}
export function button(label, action, className = '') {
	const node = el('button', label, className);
	node.type = 'button';
	node.addEventListener('click', action);
	return node;
}
export function field(label, control, hint) {
	const group = el('div', '', 'field'),
		caption = el('label', label);
	control.id ||= 'console-field-' + crypto.randomUUID();
	caption.htmlFor = control.id;
	group.append(caption, control);
	if (hint) {
		const help = el('p', hint, 'field-help');
		help.id = control.id + '-help';
		control.setAttribute('aria-describedby', help.id);
		group.append(help);
	}
	return group;
}
export function icon(name) {
	const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
	svg.setAttribute('viewBox', '0 0 24 24');
	svg.setAttribute('width', '20');
	svg.setAttribute('height', '20');
	svg.setAttribute('fill', 'none');
	svg.setAttribute('stroke', 'currentColor');
	svg.setAttribute('stroke-width', '1.5');
	svg.setAttribute('aria-hidden', 'true');
	const paths = {
		eye: [
			'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z',
			'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z'
		],
		eyeOff: [
			'm3 3 18 18',
			'M10.6 5.1 12 5c6.5 0 10 7 10 7s-1.1 2.2-3.2 4.1M6.1 6.1C3.4 8 2 12 2 12s3.5 7 10 7c1.7 0 3.3-.5 4.6-1.2'
		],
		menu: ['M4 6h16M4 12h16M4 18h16'],
		close: ['m6 6 12 12M18 6 6 18'],
		home: ['m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9'],
		file: ['M14 2H5v20h14V7Zm0 0v6h5M8 12h8M8 16h8'],
		book: ['M3 3h7l2 2 2-2h7v17h-7l-2 2-2-2H3ZM12 5v17'],
		image: ['M3 3h18v18H3ZM3 17l6-6 5 5 3-3 4 4M17 7h.01'],
		settings: ['M4 7h16M4 17h16M8 4v6M16 14v6'],
		users: [
			'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 4a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9',
			'M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z'
		],
		device: ['M3 4h18v13H3ZM8 21h8M12 17v4'],
		archive: ['M3 3h18v5H3ZM5 8v13h14V8M10 12h4'],
		upload: ['m7 8 5-5 5 5M12 3v12M3 15v6h18v-6'],
		history: ['M3 4v5h5M3 9a9 9 0 1 1-.1 5M12 7v5l3 2']
	};
	for (const d of paths[name] || paths.file) {
		const path = document.createElementNS(svg.namespaceURI, 'path');
		path.setAttribute('d', d);
		svg.append(path);
	}
	return svg;
}
let confirmation;
export function ask(message) {
	if (confirmation) return Promise.resolve(false);
	return new Promise((resolve) => {
		const dialog = el('dialog', '', 'console-confirm'),
			title = el('h2', ['确认操作', 'Confirm action']),
			body = el('p', message),
			actions = el('div', '', 'dialog-actions');
		dialog.setAttribute('aria-labelledby', 'console-confirm-title');
		title.id = 'console-confirm-title';
		const finish = (value) => {
			dialog.close();
			dialog.remove();
			confirmation = null;
			resolve(value);
		};
		actions.append(
			button(['取消', 'Cancel'], () => finish(false)),
			button(['继续', 'Continue'], () => finish(true), 'primary')
		);
		dialog.append(title, body, actions);
		dialog.addEventListener('cancel', (event) => {
			event.preventDefault();
			finish(false);
		});
		document.body.append(dialog);
		confirmation = dialog;
		dialog.showModal();
		actions.firstElementChild.focus();
	});
}
