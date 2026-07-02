import { useEffect, useRef, useState } from 'react';
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { RESOURCE_PAGE_CONFIG } from '../../config/pages/resources';
import type {
	ResourceAction,
	ResourceListItem,
} from '../../lib/resources/resourceItems';
import { getResourceTypeById } from '../../lib/resourceTypeUtils';
import ResourceDownloadSplitButton from './ResourceDownloadSplitButton';

type ResourceDetailOverlayProps = {
	resource: ResourceListItem | null;
	onClose: () => void;
};

type ImageStepDirection = 'previous' | 'next';
type ImageTransitionDirection = ImageStepDirection | 'neutral';
type ResourceDetailImage = ResourceListItem['gallery'][number];
type ExitingResourceImage = {
	image: ResourceDetailImage;
	alt: string;
	direction: ImageStepDirection;
};
type PendingImageTransition = {
	index: number;
	direction: ImageStepDirection;
	src: string;
	resourceId: string;
	token: number;
};

const WHEEL_IMAGE_SWITCH_THRESHOLD = 92;
const WHEEL_IMAGE_SWITCH_LOCK_MS = 280;

export default function ResourceDetailOverlay({ resource, onClose }: ResourceDetailOverlayProps) {
	const [activeImageIndex, setActiveImageIndex] = useState(0);
	const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
	const [imageTransitionDirection, setImageTransitionDirection] = useState<ImageTransitionDirection>('neutral');
	const [exitingImage, setExitingImage] = useState<ExitingResourceImage | null>(null);
	const [readyImageSources, setReadyImageSources] = useState<Set<string>>(() => new Set());
	const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);
	const panelRef = useRef<HTMLElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const imageTransitionTimeoutRef = useRef<number | null>(null);
	const wheelStepLockRef = useRef<number | null>(null);
	const wheelDeltaAccumulatorRef = useRef(0);
	const readyImageSourcesRef = useRef<Set<string>>(new Set());
	const imageDecodePromisesRef = useRef<Map<string, Promise<void>>>(new Map());
	const pendingImageTransitionRef = useRef<PendingImageTransition | null>(null);
	const pendingImageTransitionTokenRef = useRef(0);

	usePageScrollLock(Boolean(resource));
	useDialogFocusTrap(Boolean(resource), panelRef, closeButtonRef);

	const hasMultipleImages = Boolean(resource && resource.gallery.length > 1);

	useEffect(() => {
		if (!resource) {
			return;
		}

		const handleKeydown = (event: KeyboardEvent) => {
			if (hasMultipleImages && event.key === 'ArrowLeft') {
				event.preventDefault();
				goToImage(getPreviousImageIndex(activeImageIndex, resource.gallery.length), 'previous');
				return;
			}

			if (hasMultipleImages && event.key === 'ArrowRight') {
				event.preventDefault();
				goToImage(getNextImageIndex(activeImageIndex, resource.gallery.length), 'next');
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
	}, [resource, imagePreviewOpen, hasMultipleImages, activeImageIndex, onClose]);

	useEffect(() => {
		clearImageTransitionTimeout();
		clearWheelStepLock();
		pendingImageTransitionRef.current = null;
		pendingImageTransitionTokenRef.current += 1;
		setActiveImageIndex(0);
		setImagePreviewOpen(false);
		setImageTransitionDirection('neutral');
		setExitingImage(null);
		setPendingImageSrc(null);
	}, [resource]);

	useEffect(() => {
		if (!resource) {
			return;
		}

		const galleryLength = resource.gallery.length;
		const preloadIndexes = galleryLength <= 4
			? resource.gallery.map((_, index) => index)
			: [
				activeImageIndex,
				getPreviousImageIndex(activeImageIndex, galleryLength),
				getNextImageIndex(activeImageIndex, galleryLength),
			];

		Array.from(new Set(preloadIndexes)).forEach((index) => {
			const galleryImage = resource.gallery[index];

			if (!galleryImage) {
				return;
			}

			void ensureImageReady(galleryImage.src);
		});
	}, [resource, activeImageIndex]);

	useEffect(() => {
		return () => {
			clearImageTransitionTimeout();
			clearWheelStepLock();
		};
	}, []);

	useEffect(() => {
		if (!resource) {
			return;
		}

		document.documentElement.classList.add('has-modal-open');

		return () => {
			document.documentElement.classList.remove('has-modal-open');
		};
	}, [resource]);

	if (!resource) {
		return null;
	}

	const type = getResourceTypeById(resource.type);
	const activeImage = resource.gallery[activeImageIndex] ?? resource.gallery[0];
	const activeImageAlt = activeImage.alt ?? resource.title;
	const isUnavailable = resource.status === 'unavailable';
	const detailParagraphs = resource.details.length > 0 ? resource.details : [resource.summary];
	const showImageNavigation = hasMultipleImages && resource.gallery.length > 1;
	const isImagePending = Boolean(pendingImageSrc);
	const isActiveImageReady = readyImageSources.has(activeImage.src);

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

				<div className="resource-detail__media" onWheel={handleImageWheel}>
					<div className={isImagePending ? 'resource-detail__stage is-pending' : 'resource-detail__stage'}>
						<button
							type="button"
							className={isImagePending ? 'resource-detail__preview is-pending' : 'resource-detail__preview'}
							onClick={() => setImagePreviewOpen(true)}
							aria-label={RESOURCE_PAGE_CONFIG.detail.previewLabel}
							aria-busy={isImagePending}
							data-ready={isActiveImageReady ? 'true' : 'false'}
						>
							<span className="resource-detail__image-stack">
								{exitingImage ? (
									<img
										key={`exiting-${exitingImage.image.src}`}
										className={`resource-detail__image-layer is-exiting is-${exitingImage.direction}`}
										src={exitingImage.image.src}
										alt=""
										aria-hidden="true"
										onAnimationEnd={handleExitingImageAnimationEnd}
									/>
								) : null}
								<img
									key={`active-${activeImage.src}`}
									className={`resource-detail__image-layer is-active is-${imageTransitionDirection}`}
									src={activeImage.src}
									alt={activeImageAlt}
									onLoad={() => markImageReady(activeImage.src)}
								/>
							</span>
						</button>

						{showImageNavigation ? (
							<>
								<button
									type="button"
									className="resource-detail__image-nav resource-detail__image-nav--previous"
									onClick={() => goToImage(getPreviousImageIndex(activeImageIndex, resource.gallery.length), 'previous')}
									aria-label={RESOURCE_PAGE_CONFIG.detail.previousImageLabel}
								>
									‹
								</button>
								<button
									type="button"
									className="resource-detail__image-nav resource-detail__image-nav--next"
									onClick={() => goToImage(getNextImageIndex(activeImageIndex, resource.gallery.length), 'next')}
									aria-label={RESOURCE_PAGE_CONFIG.detail.nextImageLabel}
								>
									›
								</button>
								<span className="resource-detail__image-count">
									{activeImageIndex + 1} / {resource.gallery.length}
								</span>
							</>
						) : null}
					</div>
				</div>

				<div className="resource-detail__body" data-scroll-native>
					<div className="resource-detail__identity">
						<p className="resource-detail__eyebrow">{type.label}</p>
						<h2 id="resource-detail-title">{resource.title}</h2>
						{isUnavailable ? (
							<p className="resource-detail__unavailable">{RESOURCE_PAGE_CONFIG.status.unavailable}</p>
						) : null}

						{resource.credits.length > 0 ? (
							<div className="resource-detail__meta" aria-label="Resource info">
								{resource.credits.map((credit) => (
									<MetaItem key={`${credit.label}-${credit.name}`} label={credit.label} value={credit.name} href={credit.href} />
								))}
							</div>
						) : null}
					</div>

					<div className="resource-detail__description">
						<div className="resource-detail__text">
							{detailParagraphs.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					</div>

					<ResourceActionsPanel resource={resource} activeImageIndex={activeImageIndex} />
				</div>
			</section>

			{imagePreviewOpen ? (
				<div
					className="resource-image-preview"
					role="dialog"
					aria-modal="true"
					onMouseDown={closeImagePreview}
					onWheel={handleImageWheel}
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
							onClick={() => goToImage(getPreviousImageIndex(activeImageIndex, resource.gallery.length), 'previous')}
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
							onClick={() => goToImage(getNextImageIndex(activeImageIndex, resource.gallery.length), 'next')}
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

	function handleImageWheel(event: React.WheelEvent) {
		if ((event.target as HTMLElement).closest('.resource-detail__body')) {
			return;
		}

		if (!resource || resource.gallery.length <= 1) {
			return;
		}

		const dominantDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
			? event.deltaX
			: event.deltaY;

		if (Math.abs(dominantDelta) < 8) {
			return;
		}

		event.preventDefault();
		event.stopPropagation();
		event.nativeEvent.stopImmediatePropagation?.();

		if (wheelStepLockRef.current !== null) {
			return;
		}

		wheelDeltaAccumulatorRef.current += dominantDelta;

		if (Math.abs(wheelDeltaAccumulatorRef.current) < WHEEL_IMAGE_SWITCH_THRESHOLD) {
			return;
		}

		const directionDelta = wheelDeltaAccumulatorRef.current;
		wheelDeltaAccumulatorRef.current = 0;
		wheelStepLockRef.current = window.setTimeout(() => {
			wheelStepLockRef.current = null;
		}, WHEEL_IMAGE_SWITCH_LOCK_MS);

		if (directionDelta > 0) {
			goToImage(getNextImageIndex(activeImageIndex, resource.gallery.length), 'next');
			return;
		}

		goToImage(getPreviousImageIndex(activeImageIndex, resource.gallery.length), 'previous');
	}

	function goToImage(nextIndex: number, direction: ImageStepDirection) {
		if (!resource || resource.gallery.length === 0) {
			return;
		}

		const normalizedIndex = normalizeImageIndex(nextIndex, resource.gallery.length);

		if (normalizedIndex === activeImageIndex) {
			return;
		}

		const targetImage = resource.gallery[normalizedIndex];

		if (!targetImage || readyImageSourcesRef.current.has(targetImage.src)) {
			commitImageTransition(normalizedIndex, direction);
			return;
		}

		const token = pendingImageTransitionTokenRef.current + 1;
		pendingImageTransitionTokenRef.current = token;
		pendingImageTransitionRef.current = {
			index: normalizedIndex,
			direction,
			src: targetImage.src,
			resourceId: resource.id,
			token,
		};
		setPendingImageSrc(targetImage.src);

		void ensureImageReady(targetImage.src).then(() => {
			const pendingTransition = pendingImageTransitionRef.current;

			if (
				!pendingTransition ||
				pendingTransition.token !== token ||
				pendingTransition.src !== targetImage.src ||
				pendingTransition.resourceId !== resource.id
			) {
				return;
			}

			pendingImageTransitionRef.current = null;
			setPendingImageSrc(null);
			commitImageTransition(pendingTransition.index, pendingTransition.direction);
		});
	}

	function commitImageTransition(normalizedIndex: number, direction: ImageStepDirection) {
		if (!resource || resource.gallery.length === 0) {
			return;
		}

		pendingImageTransitionRef.current = null;
		setPendingImageSrc(null);

		const currentImage = resource.gallery[activeImageIndex] ?? resource.gallery[0];

		if (currentImage) {
			setExitingImage({
				image: currentImage,
				alt: currentImage.alt ?? resource.title,
				direction,
			});
		}

		clearImageTransitionTimeout();
		setImageTransitionDirection(direction);
		setActiveImageIndex(normalizedIndex);
		imageTransitionTimeoutRef.current = window.setTimeout(() => {
			setExitingImage(null);
			imageTransitionTimeoutRef.current = null;
		}, 260);
	}

	function ensureImageReady(src: string): Promise<void> {
		if (readyImageSourcesRef.current.has(src)) {
			return Promise.resolve();
		}

		const existingDecode = imageDecodePromisesRef.current.get(src);

		if (existingDecode) {
			return existingDecode;
		}

		const image = new Image();
		image.decoding = 'async';
		const loadFallbackPromise = new Promise<void>((resolve) => {
			image.onload = () => resolve();
			image.onerror = () => resolve();
		});
		image.src = src;

		const decodePromise = (typeof image.decode === 'function' ? image.decode() : loadFallbackPromise)
			.catch(() => undefined)
			.then(() => {
				markImageReady(src);
				imageDecodePromisesRef.current.delete(src);
			});

		imageDecodePromisesRef.current.set(src, decodePromise);
		return decodePromise;
	}

	function markImageReady(src: string) {
		if (readyImageSourcesRef.current.has(src)) {
			return;
		}

		const nextReadyImageSources = new Set(readyImageSourcesRef.current);
		nextReadyImageSources.add(src);
		readyImageSourcesRef.current = nextReadyImageSources;
		setReadyImageSources(nextReadyImageSources);
	}

	function handleExitingImageAnimationEnd() {
		clearImageTransitionTimeout();
		setExitingImage(null);
	}

	function clearImageTransitionTimeout() {
		if (imageTransitionTimeoutRef.current === null) {
			return;
		}

		window.clearTimeout(imageTransitionTimeoutRef.current);
		imageTransitionTimeoutRef.current = null;
	}

	function clearWheelStepLock() {
		wheelDeltaAccumulatorRef.current = 0;

		if (wheelStepLockRef.current === null) {
			return;
		}

		window.clearTimeout(wheelStepLockRef.current);
		wheelStepLockRef.current = null;
	}
}

function normalizeImageIndex(index: number, length: number) {
	return ((index % length) + length) % length;
}

function ResourceActionsPanel({
	resource,
	activeImageIndex,
}: {
	resource: ResourceListItem;
	activeImageIndex: number;
}) {
	const hasDownloads = resource.downloadFiles.length > 0;
	const visibleRelatedActions = resource.relatedActions.filter((action) => !action.disabled && action.href);

	if (!hasDownloads && visibleRelatedActions.length === 0) {
		return (
			<p className="resource-detail__unavailable resource-detail__actions">暂无可用下载。</p>
		);
	}

	return (
		<div className="resource-detail__actions" aria-label={RESOURCE_PAGE_CONFIG.detail.actionLabel}>
			{hasDownloads ? (
				<ResourceDownloadSplitButton
					resourceId={resource.id}
					files={resource.downloadFiles}
					activeIndex={activeImageIndex}
				/>
			) : null}

			{visibleRelatedActions.length > 0 ? (
				<div className="resource-detail__action-group">
					<p className="resource-detail__action-heading">Source / Related</p>
					<div className="resource-detail__related-actions">
						{visibleRelatedActions.map((action) => (
							<ResourceRelatedActionLink key={`${action.type}-${action.label}`} action={action} />
						))}
					</div>
				</div>
			) : null}
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

function ResourceRelatedActionLink({ action }: { action: ResourceAction }) {
	const isDisabled = action.disabled || !action.href;
	const isExternal = action.type !== 'download' || Boolean(action.href?.startsWith('http'));
	const actionMeta = getActionMeta(action);

	if (isDisabled) {
		return (
			<span className="resource-detail__related-action is-disabled">
				<strong>{action.label}</strong>
			</span>
		);
	}

	return (
		<a
			className="resource-detail__related-action"
			href={action.href}
			target={isExternal ? '_blank' : undefined}
			rel={isExternal ? 'noreferrer' : undefined}
		>
			<strong>{action.label}</strong>
			{actionMeta ? <small>{actionMeta}</small> : null}
		</a>
	);
}

function getActionMeta(action: ResourceAction) {
	const parts = [
		action.format,
		action.provider,
		action.code ? `Code ${action.code}` : undefined,
		action.note,
	].filter(Boolean);

	return parts.join(' · ');
}

function getPreviousImageIndex(index: number, length: number) {
	return (index - 1 + length) % length;
}

function getNextImageIndex(index: number, length: number) {
	return (index + 1) % length;
}
