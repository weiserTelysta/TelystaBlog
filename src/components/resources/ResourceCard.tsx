import type { CSSProperties, MouseEvent } from 'react';
import type { ResourceListItem } from '../../lib/resources/resourceItems';

type ResourceCardProps = {
	resource: ResourceListItem;
	onSelect: (resource: ResourceListItem, trigger: HTMLAnchorElement) => void;
};

export default function ResourceCard({ resource, onSelect }: ResourceCardProps) {
	const ratio = resource.coverAspectRatio > 0 ? resource.coverAspectRatio : 0.78;

	function open(event: MouseEvent<HTMLAnchorElement>) {
		if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
		event.preventDefault();
		onSelect(resource, event.currentTarget);
	}

	return (
		<a
			className="resource-card"
			data-pixel-art={resource.pixelArt || undefined}
			href={resource.preview}
			style={{ '--resource-card-ratio': ratio } as CSSProperties}
			onClick={open}
			aria-label={'查看资源：' + resource.title}
		>
			<img src={resource.cover} alt={resource.title} loading="lazy" decoding="async" />
		</a>
	);
}
