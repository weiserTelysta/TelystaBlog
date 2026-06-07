import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RESOURCE_PAGE_CONFIG } from '../../lib/resources/resourcePageConfig';
import {
	RESOURCE_TYPES,
	getResourceTypeById,
	isResourceTypeId,
	type ResourceTypeId,
} from '../../lib/resources/resourceTypes';
import type { ResourceListItem } from '../../lib/resources/resourceItems';
import ResourceCard from './ResourceCard';
import ResourceDetailOverlay from './ResourceDetailOverlay';

type ResourceExplorerProps = {
	resources: ResourceListItem[];
	formatCount: number;
};

type FilterValue = ResourceTypeId | 'all';

export default function ResourceExplorer({ resources, formatCount }: ResourceExplorerProps) {
	const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
	const [selectedResource, setSelectedResource] = useState<ResourceListItem | null>(null);
	const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

	useEffect(() => {
		const syncFromUrl = () => {
			const params = new URLSearchParams(window.location.search);
			const type = params.get('type');
			setActiveFilter(isResourceTypeId(type) ? type : 'all');
		};

		syncFromUrl();
		window.addEventListener('popstate', syncFromUrl);

		return () => window.removeEventListener('popstate', syncFromUrl);
	}, []);

	const counts = useMemo(() => {
		const map = new Map<ResourceTypeId, number>();

		for (const resource of resources) {
			map.set(resource.type, (map.get(resource.type) ?? 0) + 1);
		}

		return map;
	}, [resources]);

	const filteredResources = useMemo(() => {
		if (activeFilter === 'all') {
			return resources;
		}

		return resources.filter((resource) => resource.type === activeFilter);
	}, [activeFilter, resources]);

	const activeType = activeFilter === 'all' ? null : getResourceTypeById(activeFilter);
	const activeLabel = activeType?.label ?? RESOURCE_PAGE_CONFIG.filter.allLabel;
	const activeDescription = activeType?.description ?? RESOURCE_PAGE_CONFIG.filter.allDescription;

	const selectFilter = useCallback((nextFilter: FilterValue) => {
		setActiveFilter(nextFilter);

		const url = new URL(window.location.href);
		if (nextFilter === 'all') {
			url.searchParams.delete('type');
		} else {
			url.searchParams.set('type', nextFilter);
		}

		window.history.pushState({}, '', url);
	}, []);

	const selectResource = useCallback((resource: ResourceListItem, trigger: HTMLButtonElement) => {
		lastTriggerRef.current = trigger;
		setSelectedResource(resource);
	}, []);

	const closeResource = useCallback(() => {
		setSelectedResource(null);
		window.setTimeout(() => lastTriggerRef.current?.focus(), 0);
	}, []);

	return (
		<section className="resource-explorer" aria-label="资源列表">
			<aside className="resource-sidebar" aria-label={RESOURCE_PAGE_CONFIG.filter.ariaLabel}>
				<div className="resource-sidebar__intro">
					<p className="resource-sidebar__eyebrow">{RESOURCE_PAGE_CONFIG.hero.eyebrow}</p>
					<h1 id="resource-page-title">{RESOURCE_PAGE_CONFIG.hero.title}</h1>
					<p>{RESOURCE_PAGE_CONFIG.hero.description}</p>
					<div className="resource-sidebar__stats" aria-label="资源统计">
						<span>
							{resources.length} {RESOURCE_PAGE_CONFIG.stats.resourceLabel}
						</span>
						<span>
							{formatCount} {RESOURCE_PAGE_CONFIG.stats.formatLabel}
						</span>
					</div>
				</div>
				<div className="resource-sidebar__summary">
					<strong>{activeLabel}</strong>
					<span>{activeDescription}</span>
				</div>
				<p className="resource-sidebar__section">{RESOURCE_PAGE_CONFIG.filter.sidebarTitle}</p>
				<nav className="resource-filters">
					<FilterButton
						active={activeFilter === 'all'}
						count={resources.length}
						label={RESOURCE_PAGE_CONFIG.filter.allLabel}
						onClick={() => selectFilter('all')}
					/>
					{RESOURCE_TYPES.map((type) => (
						<FilterButton
							key={type.id}
							active={activeFilter === type.id}
							count={counts.get(type.id) ?? 0}
							label={type.label}
							onClick={() => selectFilter(type.id)}
						/>
					))}
				</nav>
			</aside>

			<div className="resource-results">
				<div className="resource-results__header">
					<p>{activeLabel}</p>
					<span>
						{filteredResources.length} {RESOURCE_PAGE_CONFIG.stats.resourceLabel}
					</span>
				</div>
				{filteredResources.length > 0 ? (
					<div className="resource-grid">
						{filteredResources.map((resource) => (
							<ResourceCard key={resource.id} resource={resource} onSelect={selectResource} />
						))}
					</div>
				) : (
					<div className="resource-empty">
						<p>{RESOURCE_PAGE_CONFIG.emptyState.title}</p>
						<span>{RESOURCE_PAGE_CONFIG.emptyState.description}</span>
					</div>
				)}
			</div>

			<ResourceDetailOverlay resource={selectedResource} onClose={closeResource} />
		</section>
	);
}

function FilterButton({
	active,
	count,
	label,
	onClick,
}: {
	active: boolean;
	count: number;
	label: string;
	onClick: () => void;
}) {
	return (
		<button type="button" className={active ? 'resource-filter is-active' : 'resource-filter'} onClick={onClick}>
			<span className="resource-filter__label">{label}</span>
			<small className="resource-filter__count">{count}</small>
		</button>
	);
}
