import type { CSSProperties } from 'react';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, LayoutGroup } from 'motion/react';
import { RESOURCE_PAGE_CONFIG } from '../../config/pages/resources';
import { RESOURCE_TYPES, type ResourceTypeId } from '../../config/content/resourceTypes';
import type { ResourceListItem } from '../../lib/resources/resourceItems';
import { isResourceTypeId } from '../../lib/resourceTypeUtils';
import ResourceCard from './ResourceCard';
import ResourceDetailOverlay from './ResourceDetailOverlay';

type ResourceExplorerProps = {
	resources: ResourceListItem[];
};

type FilterValue = ResourceTypeId | 'all';

const ESTIMATED_TITLE_HEIGHT = 0.2;
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export default function ResourceExplorer({ resources }: ResourceExplorerProps) {
	const [activeFilter, setActiveFilter] = useState<FilterValue>('all');
	const [selectedResource, setSelectedResource] = useState<ResourceListItem | null>(null);
	const [containerWidth, setContainerWidth] = useState<number | null>(null);
	const [measured, setMeasured] = useState(false);
	const resultsRef = useRef<HTMLDivElement | null>(null);
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

	useIsomorphicLayoutEffect(() => {
		const element = resultsRef.current;

		if (!element) {
			return;
		}

		const updateContainerWidth = () => {
			const width = element.getBoundingClientRect().width;

			if (width <= 0) {
				return;
			}

			setContainerWidth(width);
			setMeasured(true);
		};

		updateContainerWidth();

		if (typeof ResizeObserver === 'undefined') {
			window.addEventListener('resize', updateContainerWidth);

			return () => {
				window.removeEventListener('resize', updateContainerWidth);
			};
		}

		const observer = new ResizeObserver(updateContainerWidth);
		observer.observe(element);

		return () => {
			observer.disconnect();
		};
	}, []);

	const counts = useMemo(() => {
		const map = new Map<ResourceTypeId, number>();

		for (const resource of resources) {
			map.set(resource.type, (map.get(resource.type) ?? 0) + 1);
		}

		return map;
	}, [resources]);
	const visibleTypes = useMemo(
		() => RESOURCE_TYPES.filter((type) => (counts.get(type.id) ?? 0) > 0),
		[counts],
	);
	const filteredResources = useMemo(() => {
		if (activeFilter === 'all') {
			return resources;
		}

		return resources.filter((resource) => resource.type === activeFilter);
	}, [activeFilter, resources]);
	const columnCount = useMemo(() => (
		containerWidth === null ? null : getMasonryColumnCount(containerWidth)
	), [containerWidth]);
	const masonryColumns = useMemo(
		() => (columnCount === null ? [] : buildMasonryColumns(filteredResources, columnCount)),
		[filteredResources, columnCount],
	);

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
		<section className="resource-explorer" aria-label="Resource list">
			<header className="resource-hero">
				<p className="resource-hero__eyebrow">{RESOURCE_PAGE_CONFIG.hero.eyebrow}</p>
				<h1 id="resource-page-title">{RESOURCE_PAGE_CONFIG.hero.title}</h1>
				<p>{RESOURCE_PAGE_CONFIG.hero.description}</p>
				<nav className="resource-filters" aria-label={RESOURCE_PAGE_CONFIG.filter.ariaLabel}>
					<FilterButton
						active={activeFilter === 'all'}
						label={RESOURCE_PAGE_CONFIG.filter.allLabel}
						onClick={() => selectFilter('all')}
					/>
					{visibleTypes.map((type) => (
						<FilterButton
							key={type.id}
							active={activeFilter === type.id}
							label={type.label}
							onClick={() => selectFilter(type.id)}
						/>
					))}
				</nav>
			</header>

			<div className={filteredResources.length > 0 && !measured ? 'resource-results is-measuring' : 'resource-results'} ref={resultsRef}>
				{filteredResources.length === 0 ? (
					<div className="resource-empty">
						<p>{RESOURCE_PAGE_CONFIG.emptyState.title}</p>
						<span>{RESOURCE_PAGE_CONFIG.emptyState.description}</span>
					</div>
				) : measured && columnCount !== null ? (
					<LayoutGroup id="resource-masonry">
						<div
							className="resource-masonry"
							style={{ '--resource-column-count': columnCount } as CSSProperties}
						>
							{masonryColumns.map((column, columnIndex) => (
								<div className="resource-masonry__column" key={`column-${columnIndex}`}>
									<AnimatePresence initial={false}>
										{column.map((resource, itemIndex) => (
											<ResourceCard
												key={resource.id}
												resource={resource}
												motionIndex={itemIndex * masonryColumns.length + columnIndex}
												onSelect={selectResource}
											/>
										))}
									</AnimatePresence>
								</div>
							))}
						</div>
					</LayoutGroup>
				) : null}
			</div>

			<ResourceDetailOverlay resource={selectedResource} onClose={closeResource} />
		</section>
	);
}

function FilterButton({
	active,
	label,
	onClick,
}: {
	active: boolean;
	label: string;
	onClick: () => void;
}) {
	return (
		<button type="button" className={active ? 'resource-filter is-active' : 'resource-filter'} onClick={onClick}>
			<span className="resource-filter__label">{label}</span>
		</button>
	);
}

function getMasonryColumnCount(containerWidth: number) {
	if (containerWidth < 620) {
		return 1;
	}

	if (containerWidth < 900) {
		return 2;
	}

	if (containerWidth < 1160) {
		return 3;
	}

	if (containerWidth < 1460) {
		return 4;
	}

	return 5;
}

function buildMasonryColumns(resources: ResourceListItem[], columnCount: number) {
	const safeColumnCount = Math.max(1, columnCount);
	const columns = Array.from({ length: safeColumnCount }, () => [] as ResourceListItem[]);
	const columnHeights = Array.from({ length: safeColumnCount }, () => 0);

	for (const resource of resources) {
		const targetColumnIndex = getShortestColumnIndex(columnHeights);
		columns[targetColumnIndex].push(resource);
		columnHeights[targetColumnIndex] += getEstimatedResourceCardHeight(resource);
	}

	return columns;
}

function getShortestColumnIndex(columnHeights: number[]) {
	let shortestIndex = 0;
	let shortestHeight = columnHeights[0] ?? 0;

	for (let index = 1; index < columnHeights.length; index += 1) {
		if (columnHeights[index] < shortestHeight) {
			shortestIndex = index;
			shortestHeight = columnHeights[index];
		}
	}

	return shortestIndex;
}

function getEstimatedResourceCardHeight(resource: ResourceListItem) {
	const aspectRatio = resource.coverAspectRatio > 0 ? resource.coverAspectRatio : 0.78;
	return (1 / aspectRatio) + ESTIMATED_TITLE_HEIGHT;
}
