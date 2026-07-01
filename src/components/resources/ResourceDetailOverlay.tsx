import { useEffect, useRef, useState } from 'react';
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { RESOURCE_PAGE_CONFIG } from '../../config/pages/resources';
import type {
	ResourceAction,
	ResourceGalleryImage,
	ResourceListItem,
} from '../../lib/resources/resourceItems';
import { getResourceTypeById } from '../../lib/resourceTypeUtils';

type ResourceDetailOverlayProps = {
	resource: ResourceListItem | null;
	onClose: () => void;
};

export default function ResourceDetailOverlay({ resource, onClose }: ResourceDetailOverlayProps) {
	const [activeImageIndex, setActiveImageIndex] = useState(0);
	const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
	const panelRef = useRef<HTMLElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	usePageScrollLock(Boolean(resource));
	useDialogFocusTrap(Boolean(resource), panelRef, closeButtonRef);

	const hasMultipleImages = Boolean(resource && resource.gallery.length > 1);

	useEffect(() => {
		if (!resource) {
			return;
		}

		const handleKeydown = (event: KeyboardEvent) => {
			if (imagePreviewOpen && hasMultipleImages && event.key === 'ArrowLeft') {
				event.preventDefault();
				setActiveImageIndex((index) => getPreviousImageIndex(index, resource.gallery.length));
				return;
			}

			if (imagePreviewOpen && hasMultipleImages && event.key === 'ArrowRight') {
				event.preventDefault();
				setActiveImageIndex((index) => getNextImageIndex(index, resource.gallery.length));
				return;
			}

			if (event.key !== 'Escape') {
				return;
			}

			if (imagePreviewOpen) {
				setImagePreviewOpen(false);
				return;
			}

			onClose();
		};

		window.addEventListener('keydown', handleKeydown);

		return () => {
			window.removeEventListener('keydown', handleKeydown);
		};
	}, [resource, imagePreviewOpen, hasMultipleImages, onClose]);

	useEffect(() => {
		setActiveImageIndex(0);
		setImagePreviewOpen(false);
	}, [resource]);

	if (!resource) {
		return null;
	}

	const type = getResourceTypeById(resource.type);
	const activeImage = resource.gallery[activeImageIndex] ?? resource.gallery[0];
	const activeImageAlt = activeImage.alt ?? resource.title;
	const isUnavailable = resource.status === 'unavailable';
	const detailParagraphs = resource.details.length > 0 ? resource.details : [resource.summary];

	return (
		<div className="resource-detail" onMouseDown={handleBackdropMouseDown} data-scroll-native>
			<section
				ref={panelRef}
				className="resource-detail__panel"
				role="dialog"
				aria-modal="true"
				aria-labelledby="resource-detail-title"
				data-scroll-native
			>
				<button
					ref={closeButtonRef}
					type="button"
					className="resource-detail__close"
					onClick={onClose}
					aria-label={RESOURCE_PAGE_CONFIG.detail.closeLabel}
				>
					×
				</button>

				<div className="resource-detail__media">
					<button
						type="button"
						className="resource-detail__preview"
						onClick={() => setImagePreviewOpen(true)}
						aria-label={RESOURCE_PAGE_CONFIG.detail.previewLabel}
					>
						<img src={activeImage.src} alt={activeImageAlt} />
					</button>

					{hasMultipleImages ? (
						<GalleryStrip
							gallery={resource.gallery}
							activeImageIndex={activeImageIndex}
							resourceTitle={resource.title}
							onSelect={setActiveImageIndex}
						/>
					) : null}
				</div>

				<div className="resource-detail__body" data-scroll-native>
					<p className="resource-detail__eyebrow">{type.label}</p>
					<h2 id="resource-detail-title">{resource.title}</h2>
					{isUnavailable ? (
						<p className="resource-detail__unavailable">{RESOURCE_PAGE_CONFIG.status.unavailable}</p>
					) : null}

					<div className="resource-detail__text">
						{detailParagraphs.map((paragraph) => (
							<p key={paragraph}>{paragraph}</p>
						))}
					</div>

					<div className="resource-detail__meta" aria-label="资源信息">
						{resource.credits.map((credit) => (
							<MetaItem key={`${credit.label}-${credit.name}`} label={credit.label} value={credit.name} href={credit.href} />
						))}
						{typeof resource.variantCount === 'number' ? (
							<MetaItem label={RESOURCE_PAGE_CONFIG.detail.variantLabel} value={`${resource.variantCount}`} />
						) : null}
						<MetaItem label="更新" value={resource.updatedAt} subdued />
					</div>

					{resource.actions.length > 0 ? (
						<div className="resource-detail__actions" aria-label={RESOURCE_PAGE_CONFIG.detail.actionLabel}>
							{resource.actions.map((action) => (
								<ResourceActionLink key={`${action.type}-${action.label}`} action={action} />
							))}
						</div>
					) : (
						<p className="resource-detail__unavailable">暂无可用下载。</p>
					)}
				</div>
			</section>

			{imagePreviewOpen ? (
				<div
					className="resource-image-preview"
					role="dialog"
					aria-modal="true"
					onMouseDown={closeImagePreview}
					data-scroll-native
				>
					<button
						type="button"
						className="resource-image-preview__close"
						onClick={() => setImagePreviewOpen(false)}
						aria-label="关闭高清预览"
					>
						×
					</button>

					{hasMultipleImages ? (
						<button
							type="button"
							className="resource-image-preview__nav resource-image-preview__nav--previous"
							onClick={() => setActiveImageIndex((index) => getPreviousImageIndex(index, resource.gallery.length))}
							aria-label={RESOURCE_PAGE_CONFIG.detail.previousImageLabel}
						>
							‹
						</button>
					) : null}

					<img src={activeImage.src} alt={activeImageAlt} />

					{hasMultipleImages ? (
						<button
							type="button"
							className="resource-image-preview__nav resource-image-preview__nav--next"
							onClick={() => setActiveImageIndex((index) => getNextImageIndex(index, resource.gallery.length))}
							aria-label={RESOURCE_PAGE_CONFIG.detail.nextImageLabel}
						>
							›
						</button>
					) : null}
				</div>
			) : null}
		</div>
	);

	function handleBackdropMouseDown(event: React.MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			onClose();
		}
	}

	function closeImagePreview(event: React.MouseEvent<HTMLDivElement>) {
		if (event.target === event.currentTarget) {
			setImagePreviewOpen(false);
		}
	}
}

function GalleryStrip({
	gallery,
	activeImageIndex,
	resourceTitle,
	onSelect,
}: {
	gallery: ResourceGalleryImage[];
	activeImageIndex: number;
	resourceTitle: string;
	onSelect: (index: number) => void;
}) {
	return (
		<div className="resource-detail__gallery" aria-label={RESOURCE_PAGE_CONFIG.detail.galleryLabel} data-scroll-native>
			{gallery.map((image, index) => (
				<button
					key={`${image.src}-${index}`}
					type="button"
					className={
						index === activeImageIndex
							? 'resource-detail__gallery-item is-active'
							: 'resource-detail__gallery-item'
					}
					onClick={() => onSelect(index)}
					aria-label={image.label ?? `${resourceTitle} ${index + 1}`}
					aria-pressed={index === activeImageIndex}
				>
					<img src={image.src} alt="" loading="lazy" decoding="async" />
					{image.label ? <span>{image.label}</span> : null}
				</button>
			))}
		</div>
	);
}

function MetaItem({
	label,
	value,
	href,
	subdued = false,
}: {
	label: string;
	value: string;
	href?: string;
	subdued?: boolean;
}) {
	return (
		<span className={subdued ? 'resource-detail__meta-item is-subdued' : 'resource-detail__meta-item'}>
			<span>{label}</span>
			{href ? (
				<a href={href} target="_blank" rel="noreferrer">
					{value}
				</a>
			) : (
				<strong>{value}</strong>
			)}
		</span>
	);
}

function ResourceActionLink({ action }: { action: ResourceAction }) {
	const isDisabled = action.disabled || !action.href;
	const isExternal = action.type === 'external' || Boolean(action.href?.startsWith('http'));
	const className = action.primary
		? 'resource-detail__action resource-detail__action--primary'
		: 'resource-detail__action';

	if (isDisabled) {
		return (
			<span className={`${className} is-disabled`}>
				<strong>{action.format ?? action.label}</strong>
			</span>
		);
	}

	return (
		<a
			className={className}
			href={action.href}
			target={isExternal ? '_blank' : undefined}
			rel={isExternal ? 'noreferrer' : undefined}
			download={action.type === 'download' ? '' : undefined}
		>
			<strong>{action.format ?? action.label}</strong>
		</a>
	);
}

function getPreviousImageIndex(index: number, length: number) {
	return (index - 1 + length) % length;
}

function getNextImageIndex(index: number, length: number) {
	return (index + 1) % length;
}
