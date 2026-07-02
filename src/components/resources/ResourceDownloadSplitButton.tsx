import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { ResourceDownloadFile } from '../../lib/resources/resourceItems';

type ResourceDownloadSplitButtonProps = {
	resourceId: string;
	files: ResourceDownloadFile[];
	activeIndex: number;
};

export default function ResourceDownloadSplitButton({
	resourceId,
	files,
	activeIndex,
}: ResourceDownloadSplitButtonProps) {
	const [menuOpen, setMenuOpen] = useState(false);
	const shouldReduceMotion = useReducedMotion();
	const menuRef = useRef<HTMLDivElement>(null);
	const primaryDownload = getPrimaryDownload(files, activeIndex);
	const showMenu = files.length > 1;
	const menuId = `resource-download-menu-${resourceId}`;

	useEffect(() => {
		if (!menuOpen) {
			return;
		}

		const closeOnPointerDown = (event: PointerEvent) => {
			if (menuRef.current?.contains(event.target as Node)) {
				return;
			}

			setMenuOpen(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				setMenuOpen(false);
			}
		};

		window.addEventListener('pointerdown', closeOnPointerDown);
		window.addEventListener('keydown', closeOnEscape);

		return () => {
			window.removeEventListener('pointerdown', closeOnPointerDown);
			window.removeEventListener('keydown', closeOnEscape);
		};
	}, [menuOpen]);

	useEffect(() => {
		setMenuOpen(false);
	}, [resourceId]);

	if (!primaryDownload) {
		return null;
	}

	return (
		<div ref={menuRef} className={getDownloadClassName(showMenu, menuOpen)}>
			<a className="resource-download__primary" href={primaryDownload.href} {...getDownloadLinkProps(primaryDownload)}>
				<span className="resource-download__label">Download</span>
			</a>
			{showMenu ? (
				<button
					type="button"
					className="resource-download__toggle"
					aria-label="Show download options"
					aria-haspopup="menu"
					aria-expanded={menuOpen}
					aria-controls={menuId}
					onClick={() => setMenuOpen((open) => !open)}
				>
					<span className="resource-download__chevron" aria-hidden="true" />
				</button>
			) : null}
			<AnimatePresence>
				{menuOpen && showMenu ? (
					<motion.div
						id={menuId}
						className="resource-download__menu"
						role="menu"
						initial={shouldReduceMotion ? false : { opacity: 0, y: 6, scale: 0.98 }}
						animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, scale: 1 }}
						exit={shouldReduceMotion ? undefined : { opacity: 0, y: 4, scale: 0.985 }}
						transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: DOWNLOAD_MENU_EASE }}
					>
						{files.map((file) => {
							const isCurrent = file.sourceIndex === activeIndex;

							return (
								<a
									key={`${file.kind}-${file.label}-${file.href}`}
									className={isCurrent ? 'resource-download__menu-item is-current' : 'resource-download__menu-item'}
									href={file.href}
									role="menuitem"
									{...getDownloadLinkProps(file)}
								>
									<span>{file.label}</span>
									<small>{getDownloadMeta(file, isCurrent)}</small>
								</a>
							);
						})}
					</motion.div>
				) : null}
			</AnimatePresence>
		</div>
	);
}

const DOWNLOAD_MENU_EASE = [0.2, 0.78, 0.28, 1] as const;

function getPrimaryDownload(files: ResourceDownloadFile[], activeIndex: number) {
	return (
		files.find((file) => file.kind === 'file' && file.sourceIndex === activeIndex) ??
		files.find((file) => file.kind === 'file') ??
		files[0]
	);
}

function getDownloadLinkProps(file: ResourceDownloadFile) {
	if (file.kind === 'external') {
		return {
			target: '_blank',
			rel: 'noreferrer',
		};
	}

	return {
		download: true,
	};
}

function getDownloadMeta(file: ResourceDownloadFile, isCurrent: boolean) {
	if (isCurrent) {
		return 'Current';
	}

	const providerParts = [
		file.provider,
		file.code ? `code ${file.code}` : undefined,
	].filter(Boolean);

	if (providerParts.length > 0) {
		return providerParts.join(' / ');
	}

	return file.format;
}

function getDownloadClassName(showMenu: boolean, menuOpen: boolean) {
	return [
		'resource-download',
		showMenu ? 'has-menu' : '',
		menuOpen ? 'is-open' : '',
	].filter(Boolean).join(' ');
}
