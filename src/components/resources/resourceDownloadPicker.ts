import type { ResourceDownloadFile } from '../../lib/resources/resourceItems';

export function createDownloadPicker(root: HTMLElement, files: ResourceDownloadFile[], trigger: HTMLButtonElement,
	options: { reduced: () => boolean; currentIndex: () => number; onToggle: (open: boolean) => void }) {
	let dialog: HTMLDialogElement | undefined;
	let closeTimer: number | undefined;
	function close() {
		if (!dialog?.open || closeTimer !== undefined) return;
		const finish = () => {
			closeTimer = undefined;
			dialog?.close();
			dialog?.classList.remove('is-closing');
			options.onToggle(false);
			trigger.focus({ preventScroll: true });
		};
		if (options.reduced()) finish();
		else { dialog.classList.add('is-closing'); closeTimer = window.setTimeout(finish, 160); }
	}
	function open() {
		if (!dialog) {
			dialog = document.createElement('dialog');
			dialog.className = 'resource-download-dialog';
			dialog.setAttribute('aria-labelledby', 'resource-download-heading');
			dialog.setAttribute('data-scroll-native', '');
			dialog.innerHTML = '<h2 id="resource-download-heading">选择图片</h2><button type="button" class="resource-download-dialog__close" aria-label="关闭下载选择">×</button><p class="resource-download-dialog__hint">打开原图后，可右键或长按保存。</p><ul></ul>';
			dialog.querySelector('button')!.addEventListener('click', close);
			const list = dialog.querySelector('ul')!;
			files.forEach((file, index) => {
				const item = document.createElement('li');
				const link = document.createElement('a');
				link.href = file.href;
				link.download = '';
				link.target = '_blank';
				link.rel = 'noopener noreferrer';
				link.dataset.sourceIndex = String(file.sourceIndex ?? -1);
				const label = document.createElement('span');
				label.textContent = file.label || `图片 ${index + 1}`;
				const format = document.createElement('small');
				format.textContent = file.format;
				link.append(label, format);
				item.append(link);
				list.append(item);
			});
			dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
			// Let the download list scroll natively without reaching PhotoSwipe's wheel handler.
			dialog.addEventListener('wheel', event => event.stopPropagation(), { passive: true });
			dialog.addEventListener('click', event => {
				if (event.target !== dialog) return;
				const rect = dialog!.getBoundingClientRect();
				if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
			});
			root.append(dialog);
		}
		dialog.querySelectorAll('a').forEach(link => {
			if (Number(link.dataset.sourceIndex) === options.currentIndex()) link.setAttribute('aria-current', 'true');
			else link.removeAttribute('aria-current');
		});
		options.onToggle(true);
		dialog.showModal();
	}
	return {
		open,
		get isOpen() { return Boolean(dialog?.open); },
		destroy() { window.clearTimeout(closeTimer); dialog?.close(); dialog?.remove(); },
	};
}
