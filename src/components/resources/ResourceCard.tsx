import { getResourceTypeById } from '../../lib/resources/resourceTypes';
import type { ResourceListItem } from '../../lib/resources/resourceItems';

type ResourceCardProps = {
	resource: ResourceListItem;
	onSelect: (resource: ResourceListItem, trigger: HTMLButtonElement) => void;
};

export default function ResourceCard({ resource, onSelect }: ResourceCardProps) {
	const type = getResourceTypeById(resource.type);

	return (
		<button
			type="button"
			className="resource-card"
			onClick={(event) => onSelect(resource, event.currentTarget)}
			aria-label={`查看资源 ${resource.title}`}
		>
			<span className="resource-card__plate">
				<img src={resource.cover} alt="" loading="lazy" decoding="async" />
			</span>
			<span className="resource-card__content">
				<span className="resource-card__title">{resource.title}</span>
				<span className="resource-card__meta">
					<span>{resource.publishedAt}</span>
					<span>{type.label}</span>
					<span>{resource.formats.join(' / ')}</span>
				</span>
			</span>
		</button>
	);
}
