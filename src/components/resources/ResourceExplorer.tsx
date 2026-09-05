import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type PhotoSwipe from 'photoswipe';
import { RESOURCE_PAGE_CONFIG } from '../../config/pages/resources';
import { RESOURCE_TYPES, type ResourceTypeId } from '../../config/content/resourceTypes';
import type { ResourceListItem } from '../../lib/resources/resourceItems';
import { isResourceTypeId } from '../../lib/resourceTypeUtils';
import ResourceCard from './ResourceCard';

type ResourceExplorerProps = { resources: ResourceListItem[] };
type FilterValue = ResourceTypeId | 'all';

export default function ResourceExplorer({ resources }: ResourceExplorerProps) {
	const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
	const viewerRef = useRef<PhotoSwipe | null>(null);
	const openingRef = useRef(false);
	const mountedRef = useRef(false);

	useEffect(() => {
		mountedRef.current = true;
		const syncFromUrl = () => {
			const type = new URLSearchParams(window.location.search).get('type');
			setActiveFilter(isResourceTypeId(type) && resources.some((item) => item.type === type) ? type : 'all');
		};
		syncFromUrl();
		window.addEventListener('popstate', syncFromUrl);
		return () => {
			mountedRef.current = false;
			window.removeEventListener('popstate', syncFromUrl);
			viewerRef.current?.destroy();
		};
	}, [resources]);

	const visibleTypes = useMemo(
		() => RESOURCE_TYPES.filter((type) => resources.some((resource) => resource.type === type.id)),
		[resources],
	);
	const filteredResources = useMemo(
		() => activeFilter === 'all' ? resources : resources.filter((resource) => resource.type === activeFilter),
		[activeFilter, resources],
	);
	const selectFilter = useCallback((nextFilter: FilterValue) => {
		setActiveFilter(nextFilter);
		const url = new URL(window.location.href);
		if (nextFilter === 'all') url.searchParams.delete('type');
		else url.searchParams.set('type', nextFilter);
		window.history.pushState({}, '', url);
	}, []);

	async function selectResource(resource: ResourceListItem, trigger: HTMLAnchorElement) {
		if (openingRef.current || viewerRef.current) return;
		openingRef.current = true;
		trigger.setAttribute('aria-busy', 'true');
		try {
			const { openResourceLightbox } = await import('./resourceLightbox');
			if (!mountedRef.current) return;
			viewerRef.current = openResourceLightbox(resource, trigger, () => {
				viewerRef.current = null;
			});
		} catch (error) {
			console.error('[resources] 无法打开看图器，转到图片链接。', error);
			if (mountedRef.current) window.location.assign(trigger.href);
		} finally {
			openingRef.current = false;
			trigger.removeAttribute('aria-busy');
		}
	}

	return (
		<section className="resource-explorer" aria-label="资源索引">
			<header className="resource-hero">
				<p className="resource-hero__eyebrow">{RESOURCE_PAGE_CONFIG.hero.eyebrow}</p>
				<h1 id="resource-page-title">{RESOURCE_PAGE_CONFIG.hero.title}</h1>
				<p>{RESOURCE_PAGE_CONFIG.hero.description}</p>
				{visibleTypes.length > 1 && <nav className="resource-filters" aria-label={RESOURCE_PAGE_CONFIG.filter.ariaLabel}>
					<FilterButton active={activeFilter === 'all'} label={RESOURCE_PAGE_CONFIG.filter.allLabel} onClick={() => selectFilter('all')} />
					{visibleTypes.map((type) => (
						<FilterButton key={type.id} active={activeFilter === type.id} label={type.label} onClick={() => selectFilter(type.id)} />
					))}
				</nav>}
			</header>
			<div className="resource-results">
				{filteredResources.length === 0 ? (
					<div className="resource-empty">
						<p>{RESOURCE_PAGE_CONFIG.emptyState.title}</p>
						<span>{RESOURCE_PAGE_CONFIG.emptyState.description}</span>
					</div>
				) : (
					<div className="resource-gallery">
						{filteredResources.map((resource) => (
							<ResourceCard key={resource.id} resource={resource} onSelect={selectResource} />
						))}
					</div>
				)}
			</div>
		</section>
	);
}

function FilterButton({ active, label, onClick }: { active: boolean; label: string; onClick: () => void }) {
	return (
		<button type="button" className={active ? 'resource-filter is-active' : 'resource-filter'} aria-pressed={active} onClick={onClick}>
			{label}
		</button>
	);
}
