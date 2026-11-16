import type { ReaderOutlineItem } from './readerTypes';

/** A docked desktop outline; a focus-contained side dialog on small screens. */
export function createReaderContents(
	root: HTMLElement,
	navigate: (run: () => Promise<void>) => void
) {
	const panel = root.querySelector<HTMLDialogElement>('[data-reader-dialog]')!;
	const trigger = root.querySelector<HTMLButtonElement>('[data-reader-toc]')!;
	const close = panel.querySelector<HTMLButtonElement>('[data-reader-close]')!;
	const chapters = panel.querySelector<HTMLElement>('[data-reader-chapters]')!;
	const search = panel.querySelector<HTMLInputElement>(
		'[data-reader-toc-search]'
	)!;
	const narrow = matchMedia('(max-width: 860px)');
	const lifecycle = new AbortController();
	let currentHref = '',
		sequence = 0;
	function setOpen(open: boolean, restoreFocus = true) {
		if (panel.open) panel.close();
		root.toggleAttribute('data-contents-open', open);
		trigger.setAttribute('aria-expanded', String(open));
		if (!open) {
			if (restoreFocus) trigger.focus({ preventScroll: true });
			return;
		}
		panel.setAttribute('aria-modal', String(narrow.matches));
		if (narrow.matches) panel.showModal();
		else panel.show();
		close.focus({ preventScroll: true });
		requestAnimationFrame(() =>
			chapters
				.querySelector('[aria-current]')
				?.scrollIntoView({ block: 'nearest' })
		);
	}
	trigger.addEventListener('click', () => setOpen(!panel.open), {
		signal: lifecycle.signal
	});
	close.addEventListener('click', () => setOpen(false), {
		signal: lifecycle.signal
	});
	panel.addEventListener(
		'cancel',
		(event) => {
			event.preventDefault();
			setOpen(false);
		},
		{ signal: lifecycle.signal }
	);
	document.addEventListener(
		'keydown',
		(event) => {
			if (event.key === 'Escape' && panel.open) {
				event.preventDefault();
				setOpen(false);
			}
		},
		{ signal: lifecycle.signal }
	);
	panel.addEventListener(
		'click',
		(event) => {
			if (!narrow.matches || event.target !== panel) return;
			const box = panel.getBoundingClientRect();
			if (
				event.clientX < box.left ||
				event.clientX > box.right ||
				event.clientY < box.top ||
				event.clientY > box.bottom
			)
				setOpen(false);
		},
		{ signal: lifecycle.signal }
	);
	narrow.addEventListener(
		'change',
		() => {
			if (panel.open) setOpen(true);
		},
		{ signal: lifecycle.signal }
	);
	function highlight() {
		const buttons = Array.from(
			chapters.querySelectorAll<HTMLButtonElement>('[data-chapter-href]')
		);
		for (const button of buttons) button.removeAttribute('aria-current');
		const active =
			buttons.find((button) => button.dataset.chapterHref === currentHref) ||
			buttons.find(
				(button) =>
					button.dataset.chapterHref?.split('#')[0] ===
					currentHref.split('#')[0]
			);
		if (!active) return;
		active.setAttribute('aria-current', 'location');
		let ancestor = active.closest('ul');
		while (ancestor && ancestor !== chapters) {
			ancestor.hidden = false;
			const toggle = ancestor.previousElementSibling?.querySelector(
				'[data-chapter-toggle]'
			);
			toggle?.setAttribute('aria-expanded', 'true');
			ancestor = ancestor.parentElement?.closest('ul') || null;
		}
	}
	function list(items: ReaderOutlineItem[]): HTMLUListElement {
		const ul = document.createElement('ul');
		for (const item of items) {
			const li = document.createElement('li'),
				row = document.createElement('div'),
				button = document.createElement('button');
			row.className = 'reader-contents__row';
			button.type = 'button';
			button.textContent = item.label;
			if (item.href) button.dataset.chapterHref = item.href;
			button.addEventListener('click', () => {
				if (narrow.matches) setOpen(false);
				navigate(item.go);
			});
			row.append(button);
			li.append(row);
			if (item.children?.length) {
				const child = list(item.children),
					toggle = document.createElement('button');
				child.id = 'reader-chapters-' + sequence++;
				child.hidden = true;
				toggle.type = 'button';
				toggle.dataset.chapterToggle = '';
				toggle.setAttribute('aria-expanded', 'false');
				toggle.setAttribute('aria-controls', child.id);
				toggle.setAttribute('aria-label', 'Expand or collapse: ' + item.label);
				const icon = document.createElementNS(
					'http://www.w3.org/2000/svg',
					'svg'
				);
				icon.setAttribute('viewBox', '0 0 20 20');
				icon.setAttribute('aria-hidden', 'true');
				const path = document.createElementNS(icon.namespaceURI, 'path');
				path.setAttribute('d', 'm7 4 6 6-6 6');
				icon.append(path);
				toggle.append(icon);
				toggle.addEventListener('click', () => {
					child.hidden = !child.hidden;
					toggle.setAttribute('aria-expanded', String(!child.hidden));
				});
				row.append(toggle);
				li.append(child);
			}
			ul.append(li);
		}
		return ul;
	}
	search.addEventListener(
		'input',
		() => {
			const query = search.value.trim().toLocaleLowerCase();
			function filter(ul: Element): boolean {
				let any = false;
				for (const li of Array.from(ul.children) as HTMLElement[]) {
					const button = li.querySelector<HTMLButtonElement>(
						':scope > .reader-contents__row > button'
					)!;
					const child = li.querySelector<HTMLUListElement>(':scope > ul');
					const childMatch = child ? filter(child) : false;
					li.hidden =
						!!query &&
						!button.textContent!.toLocaleLowerCase().includes(query) &&
						!childMatch;
					if (child) {
						child.hidden =
							!query &&
							li
								.querySelector('[data-chapter-toggle]')
								?.getAttribute('aria-expanded') !== 'true';
					}
					any ||= !li.hidden;
				}
				return any;
			}
			const ul = chapters.querySelector('ul');
			if (ul) filter(ul);
		},
		{ signal: lifecycle.signal }
	);
	return {
		open: () => panel.open,
		modal: () => panel.open && narrow.matches,
		set(items: ReaderOutlineItem[]) {
			search.value = '';
			chapters.replaceChildren(list(items));
			trigger.disabled = !items.length;
			highlight();
		},
		current(href = '') {
			if (href === currentHref) return;
			currentHref = href;
			highlight();
			if (panel.open)
				chapters
					.querySelector('[aria-current]')
					?.scrollIntoView({ block: 'nearest' });
		},
		close() {
			if (panel.open) setOpen(false);
		},
		clear() {
			setOpen(false, false);
			search.value = '';
			chapters.replaceChildren();
		},
		destroy() {
			setOpen(false, false);
			lifecycle.abort();
		}
	};
}
