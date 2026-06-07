import { useEffect, useRef, useState } from 'react';
import { useDialogFocusTrap } from '../../hooks/useDialogFocusTrap';
import { usePageScrollLock } from '../../hooks/usePageScrollLock';
import { RESOURCE_PAGE_CONFIG } from '../../lib/resources/resourcePageConfig';
import { getResourceTypeById } from '../../lib/resources/resourceTypes';
import type { ResourceAction, ResourceListItem } from '../../lib/resources/resourceItems';

type ResourceDetailOverlayProps = {
	resource: ResourceListItem | null;
	onClose: () => void;
};

export default function ResourceDetailOverlay({ resource, onClose }: ResourceDetailOverlayProps) {
	const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
	const panelRef = useRef<HTMLElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);

	usePageScrollLock(Boolean(resource));
	useDialogFocusTrap(Boolean(resource), panelRef, closeButtonRef);

	useEffect(() => {
		if (!resource) {
			return;
		}

		const handleKeydown = (event: KeyboardEvent) => {
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
	}, [resource, imagePreviewOpen, onClose]);

	useEffect(() => {
		setImagePreviewOpen(false);
	}, [resource]);

	if (!resource) {
		return null;
	}

	const type = getResourceTypeById(resource.type);

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

				<button
					type="button"
					className="resource-detail__preview"
					onClick={() => setImagePreviewOpen(true)}
					aria-label={RESOURCE_PAGE_CONFIG.detail.previewLabel}
				>
					<img src={resource.preview} alt={resource.title} />
				</button>

				<div className="resource-detail__body" data-scroll-native>
					<p className="resource-detail__eyebrow">{type.label}</p>
					<h2 id="resource-detail-title">{resource.title}</h2>
					<p className="resource-detail__summary">{resource.summary}</p>

					<div className="resource-detail__meta" aria-label="资源信息">
						<MetaItem label="公开" value={resource.publishedAt} />
						<MetaItem label="更新" value={resource.updatedAt} />
						<MetaItem label={RESOURCE_PAGE_CONFIG.detail.formatLabel} value={resource.formats.join(' / ')} />
						{typeof resource.variantCount === 'number' ? (
							<MetaItem label={RESOURCE_PAGE_CONFIG.detail.variantLabel} value={`${resource.variantCount}`} />
						) : null}
					</div>

					{resource.details.length > 0 ? (
						<div className="resource-detail__text">
							{resource.details.map((paragraph) => (
								<p key={paragraph}>{paragraph}</p>
							))}
						</div>
					) : null}

					{resource.license ? (
						<div className="resource-detail__license">
							<span>{RESOURCE_PAGE_CONFIG.detail.licenseLabel}</span>
							<p>{resource.license}</p>
						</div>
					) : null}

					<p className="resource-detail__section-title">{RESOURCE_PAGE_CONFIG.detail.actionLabel}</p>
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
					<img src={resource.preview} alt={resource.title} />
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

function MetaItem({ label, value }: { label: string; value: string }) {
	return (
		<span className="resource-detail__meta-item">
			<span>{label}</span>
			<strong>{value}</strong>
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
				<span>{action.label}</span>
				<ActionMeta action={action} />
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
			<span>{action.label}</span>
			<ActionMeta action={action} />
		</a>
	);
}

function ActionMeta({ action }: { action: ResourceAction }) {
	const meta = [action.format, action.provider, action.code ? `${RESOURCE_PAGE_CONFIG.detail.codeLabel} ${action.code}` : undefined]
		.filter(Boolean)
		.join(' / ');

	return (
		<>
			{meta ? <small>{meta}</small> : null}
			{action.note ? <small>{action.note}</small> : null}
		</>
	);
}
