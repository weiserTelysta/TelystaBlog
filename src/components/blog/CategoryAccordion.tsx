import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent, WheelEvent } from 'react';
import { BLOG_PAGE_CONFIG } from '../../config/pages/blog';
import type { BlogCategoryId, CategoryPostCount } from '../../config/content/blogCategories';
import type { BlogCategoryVisual } from '../../config/visuals/categoryVisuals';
import { buildCategoryHref } from '../../lib/blogCategoryUtils';
import {
	RAIL_SNAP_DISTANCE_RATIO,
	easeOutRailMotion,
	getBoundedRailTarget,
	getNearestRailSnapTarget,
	getRailMotionDuration,
	normalizeWheelDelta,
} from './categoryAccordionMotion';
import './CategoryAccordion.scss';

const ACCORDION_COPY = BLOG_PAGE_CONFIG.categoryAccordion;
const CATEGORY_DIALOG_TITLE_ID = ACCORDION_COPY.dialogTitleId;
const CLOSE_ANIMATION_MS = 200;
const RAIL_REST_DISTANCE = 0.5;

type RailMotionPhase = 'idle' | 'animating' | 'closing';

type Props = {
	visuals: BlogCategoryVisual[];
	selectedCategoryId?: BlogCategoryId;
	postCounts: CategoryPostCount;
	totalCount: number;
};

export default function CategoryAccordion({
	visuals,
	selectedCategoryId,
	postCounts,
	totalCount,
}: Props) {
	const [open, setOpen] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [isWheelScrolling, setIsWheelScrolling] = useState(false);
	const [preselectedId, setPreselectedId] = useState<BlogCategoryId | undefined>();
	const [armedCategoryId, setArmedCategoryId] = useState<BlogCategoryId | null>(null);
	const entryButtonRef = useRef<HTMLButtonElement>(null);
	const closeButtonRef = useRef<HTMLButtonElement>(null);
	const panelRef = useRef<HTMLDivElement>(null);
	const railRef = useRef<HTMLDivElement>(null);
	const closeTimerRef = useRef<number | null>(null);
	const scrollAnimationFrameRef = useRef<number | null>(null);
	const animationStartLeftRef = useRef(0);
	const animationStartTimeRef = useRef(0);
	const animationDurationRef = useRef(0);
	const targetScrollLeftRef = useRef(0);
	const wheelDirectionRef = useRef(0);
	const reducedMotionRef = useRef(false);
	const isWheelScrollingRef = useRef(false);
	const isClosingRef = useRef(false);
	const railMotionPhaseRef = useRef<RailMotionPhase>('idle');
	const railResizeObserverRef = useRef<ResizeObserver | null>(null);
	const triggerElementRef = useRef<HTMLElement | null>(null);

	const selectedVisual = useMemo(
		() => visuals.find((visual) => visual.id === selectedCategoryId),
		[visuals, selectedCategoryId],
	);
	const currentCount = selectedCategoryId ? postCounts[selectedCategoryId] : totalCount;

	useEffect(() => {
		const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

		function syncReducedMotionPreference() {
			reducedMotionRef.current = reducedMotionQuery.matches;

			if (!reducedMotionQuery.matches || railMotionPhaseRef.current !== 'animating') {
				return;
			}

			const rail = railRef.current;
			stopRailAnimation();

			if (rail) {
				rail.scrollLeft = targetScrollLeftRef.current;
			}

			wheelDirectionRef.current = 0;
			setRailMotionPhase('idle');
		}

		syncReducedMotionPreference();
		reducedMotionQuery.addEventListener('change', syncReducedMotionPreference);

		return () => {
			reducedMotionQuery.removeEventListener('change', syncReducedMotionPreference);
		};
	}, []);

	useEffect(() => {
		if (!open) {
			return;
		}

		const root = document.documentElement;
		const body = document.body;
		let focusFrame = 0;

		root.classList.add('is-category-accordion-open');
		body.classList.add('is-category-accordion-open');
		focusFrame = window.requestAnimationFrame(() => {
			closeButtonRef.current?.focus();
			updateRailEdgeSpace();
		});

		const rail = railRef.current;

		if (rail && 'ResizeObserver' in window) {
			railResizeObserverRef.current = new ResizeObserver(() => {
				updateRailEdgeSpace();
				clearWheelScrollState();
			});
			railResizeObserverRef.current.observe(rail);
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				requestCloseAccordion();
				return;
			}

			if (event.key === 'Tab') {
				trapFocus(event);
			}
		};

		window.addEventListener('keydown', onKeyDown);
		return () => {
			window.cancelAnimationFrame(focusFrame);
			clearCloseTimer();
			clearWheelScrollState();
			disconnectRailResizeObserver();
			window.removeEventListener('keydown', onKeyDown);
			root.classList.remove('is-category-accordion-open');
			body.classList.remove('is-category-accordion-open');
		};
	}, [open]);

	function openAccordion() {
		clearCloseTimer();
		clearWheelScrollState();
		triggerElementRef.current = entryButtonRef.current;
		isClosingRef.current = false;
		setIsClosing(false);
		setPreselectedId(undefined);
		setArmedCategoryId(null);
		setOpen(true);
	}

	function clearCloseTimer() {
		if (closeTimerRef.current === null) {
			return;
		}

		window.clearTimeout(closeTimerRef.current);
		closeTimerRef.current = null;
	}

	function setWheelScrolling(active: boolean) {
		if (isWheelScrollingRef.current === active) {
			return;
		}

		isWheelScrollingRef.current = active;
		setIsWheelScrolling(active);
	}

	function setRailMotionPhase(phase: RailMotionPhase) {
		railMotionPhaseRef.current = phase;
		setWheelScrolling(phase === 'animating');
	}

	function startRailAnimation(
		rail: HTMLDivElement,
		targetScrollLeft: number,
		cardSpan: number,
		direction: number,
	) {
		stopRailAnimation();
		animationStartLeftRef.current = rail.scrollLeft;
		targetScrollLeftRef.current = targetScrollLeft;
		animationStartTimeRef.current = window.performance.now();
		animationDurationRef.current = getRailMotionDuration(
			targetScrollLeft - rail.scrollLeft,
			cardSpan,
		);
		wheelDirectionRef.current = direction;

		if (
			reducedMotionRef.current ||
			Math.abs(targetScrollLeft - rail.scrollLeft) <= RAIL_REST_DISTANCE
		) {
			rail.scrollLeft = targetScrollLeft;
			wheelDirectionRef.current = 0;
			setRailMotionPhase('idle');
			return;
		}

		setRailMotionPhase('animating');
		scrollAnimationFrameRef.current = window.requestAnimationFrame(animateRailScroll);
	}

	function stopRailAnimation() {
		if (scrollAnimationFrameRef.current === null) {
			return;
		}

		window.cancelAnimationFrame(scrollAnimationFrameRef.current);
		scrollAnimationFrameRef.current = null;
	}

	function clearWheelScrollState() {
		stopRailAnimation();
		const rail = railRef.current;
		if (rail) {
			targetScrollLeftRef.current = rail.scrollLeft;
		}
		wheelDirectionRef.current = 0;

		if (railMotionPhaseRef.current !== 'closing') {
			setRailMotionPhase('idle');
		}
	}

	function requestCloseAccordion() {
		if (isClosingRef.current || isClosing || closeTimerRef.current !== null) {
			return;
		}

		isClosingRef.current = true;
		setRailMotionPhase('closing');
		stopRailAnimation();
		clearPreselection();
		setIsClosing(true);
		closeTimerRef.current = window.setTimeout(finishCloseAccordion, CLOSE_ANIMATION_MS);
	}

	function finishCloseAccordion() {
		clearCloseTimer();
		stopRailAnimation();
		disconnectRailResizeObserver();
		setOpen(false);
		setIsClosing(false);
		isClosingRef.current = false;
		setRailMotionPhase('idle');
		setPreselectedId(undefined);
		setArmedCategoryId(null);
		document.documentElement.classList.remove('is-category-accordion-open');
		document.body.classList.remove('is-category-accordion-open');
		triggerElementRef.current?.focus();
	}

	function clearPreselection() {
		setPreselectedId(undefined);
		setArmedCategoryId(null);
	}

	function trapFocus(event: KeyboardEvent) {
		const focusableElements = getFocusableElements(panelRef.current);
		const firstElement = focusableElements[0];
		const lastElement = focusableElements[focusableElements.length - 1];

		if (!firstElement || !lastElement) {
			event.preventDefault();
			return;
		}

		if (!panelRef.current?.contains(document.activeElement)) {
			event.preventDefault();
			firstElement.focus();
			return;
		}

		if (event.shiftKey && document.activeElement === firstElement) {
			event.preventDefault();
			lastElement.focus();
			return;
		}

		if (!event.shiftKey && document.activeElement === lastElement) {
			event.preventDefault();
			firstElement.focus();
		}
	}

	function confirmCategory(categoryId: BlogCategoryId) {
		window.location.href = buildCategoryHref(categoryId);
	}

	function handleCardClick(categoryId: BlogCategoryId) {
		if (armedCategoryId === categoryId) {
			confirmCategory(categoryId);
			return;
		}

		setPreselectedId(categoryId);
		setArmedCategoryId(categoryId);
	}

	function handlePanelClick(event: MouseEvent<HTMLDivElement>) {
		const target = event.target as HTMLElement;

		if (
			target.closest('.category-accordion__card') ||
			target.closest('[data-category-accordion-control]')
		) {
			return;
		}

		clearPreselection();
	}

	function getRailMaxScrollLeft(rail: HTMLDivElement) {
		return Math.max(0, rail.scrollWidth - rail.clientWidth);
	}

	function updateRailEdgeSpace() {
		const rail = railRef.current;
		const firstCard = rail?.querySelector<HTMLElement>('.category-accordion__card');

		if (!rail || !firstCard) {
			return;
		}

		const railStyles = window.getComputedStyle(rail);
		const gap = parseFloat(railStyles.columnGap || railStyles.gap || '0') || 0;
		const cardWidth = firstCard.getBoundingClientRect().width;
		const edgeSpace = Math.max(24, rail.clientWidth / 2 - cardWidth / 2 - gap);

		rail.style.setProperty('--rail-edge-space', `${edgeSpace}px`);
	}

	function disconnectRailResizeObserver() {
		railResizeObserverRef.current?.disconnect();
		railResizeObserverRef.current = null;
	}

	function handleRailWheel(event: WheelEvent<HTMLDivElement>) {
		const rail = railRef.current;

		if (railMotionPhaseRef.current === 'closing' || !rail) {
			return;
		}

		const isMostlyVerticalWheel = Math.abs(event.deltaY) > Math.abs(event.deltaX);

		if (event.shiftKey || !isMostlyVerticalWheel || event.deltaY === 0) {
			clearWheelScrollState();
			return;
		}

		const maxScrollLeft = getRailMaxScrollLeft(rail);
		const normalizedDelta = normalizeWheelDelta(
			event.deltaY,
			event.deltaMode,
			rail.clientWidth,
		);

		if (maxScrollLeft <= 1 || normalizedDelta === 0) {
			clearWheelScrollState();
			return;
		}

		const direction = Math.sign(normalizedDelta);
		const reversesDirection =
			wheelDirectionRef.current !== 0 && wheelDirectionRef.current !== direction;
		const cardSpan = getRailCardSpan(rail);
		const baseTarget =
			railMotionPhaseRef.current === 'animating' && !reversesDirection
				? targetScrollLeftRef.current
				: rail.scrollLeft;
		const boundedTarget = getBoundedRailTarget(
			{
				scrollLeft: rail.scrollLeft,
				targetScrollLeft: baseTarget,
				maxScrollLeft,
				cardSpan,
			},
			normalizedDelta,
		);
		const snapTarget = getNearestRailSnapTarget(
			boundedTarget,
			getRailCardSnapTargets(rail, maxScrollLeft),
			cardSpan * RAIL_SNAP_DISTANCE_RATIO,
			maxScrollLeft,
		);
		const nextTarget = snapTarget ?? boundedTarget;

		if (Math.abs(nextTarget - rail.scrollLeft) <= RAIL_REST_DISTANCE) {
			clearWheelScrollState();
			return;
		}

		event.preventDefault();
		startRailAnimation(rail, nextTarget, cardSpan, direction);
	}

	function animateRailScroll(timestamp: number) {
		const rail = railRef.current;

		if (railMotionPhaseRef.current === 'closing' || !rail) {
			scrollAnimationFrameRef.current = null;
			return;
		}

		const elapsed = timestamp - animationStartTimeRef.current;
		const progress = clamp(elapsed / animationDurationRef.current, 0, 1);
		const easedProgress = easeOutRailMotion(progress);
		rail.scrollLeft =
			animationStartLeftRef.current +
			(targetScrollLeftRef.current - animationStartLeftRef.current) * easedProgress;

		if (progress >= 1) {
			rail.scrollLeft = targetScrollLeftRef.current;
			scrollAnimationFrameRef.current = null;
			wheelDirectionRef.current = 0;
			setRailMotionPhase('idle');
			return;
		}

		scrollAnimationFrameRef.current = window.requestAnimationFrame(animateRailScroll);
	}

	function getRailCardSpan(rail: HTMLDivElement) {
		const firstCard = rail.querySelector<HTMLElement>('.category-accordion__card');

		if (!firstCard) {
			return Math.max(1, rail.clientWidth);
		}

		const railStyles = window.getComputedStyle(rail);
		const gap = parseFloat(railStyles.columnGap || railStyles.gap || '0') || 0;
		return Math.max(1, firstCard.getBoundingClientRect().width + gap);
	}

	function getRailCardSnapTargets(rail: HTMLDivElement, maxScrollLeft: number) {
		const railRect = rail.getBoundingClientRect();
		const railCenter = railRect.left + railRect.width / 2;

		return Array.from(
			rail.querySelectorAll<HTMLElement>('.category-accordion__card'),
			(card) => {
				const cardRect = card.getBoundingClientRect();
				const cardCenter = cardRect.left + cardRect.width / 2;
				return clamp(rail.scrollLeft + cardCenter - railCenter, 0, maxScrollLeft);
			},
		);
	}

	function handleRailPointerDown() {
		clearWheelScrollState();
	}

	function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
		if (railMotionPhaseRef.current === 'closing') {
			return;
		}

		const rect = event.currentTarget.getBoundingClientRect();
		const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
		const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
		const rotateY = (pointerX - 50) / 8;
		const rotateX = (50 - pointerY) / 10;

		event.currentTarget.style.setProperty('--pointer-x', `${pointerX}%`);
		event.currentTarget.style.setProperty('--pointer-y', `${pointerY}%`);
		event.currentTarget.style.setProperty('--rotate-x', `${rotateX}deg`);
		event.currentTarget.style.setProperty('--rotate-y', `${rotateY}deg`);
	}

	function handlePointerLeave(event: PointerEvent<HTMLButtonElement>) {
		event.currentTarget.style.setProperty('--pointer-x', '50%');
		event.currentTarget.style.setProperty('--pointer-y', '50%');
		event.currentTarget.style.setProperty('--rotate-x', '0deg');
		event.currentTarget.style.setProperty('--rotate-y', '0deg');
	}

	return (
		<div className="category-accordion">
			<button
				ref={entryButtonRef}
				className="category-accordion__entry"
				type="button"
				onClick={openAccordion}
			>
				<span className="category-accordion__entry-label">{ACCORDION_COPY.entryLabel}</span>
				<span className="category-accordion__entry-title">
					<strong>{selectedVisual?.title ?? ACCORDION_COPY.allRecordsTitle}</strong>
					<em>
						{currentCount} {ACCORDION_COPY.recordLabel}
					</em>
				</span>
				<span className="category-accordion__entry-hint">
					{ACCORDION_COPY.entryHint}
				</span>
			</button>

			<a className="category-accordion__all-link" href={buildCategoryHref()}>
				{ACCORDION_COPY.allPostsLabel} · {totalCount}
			</a>

			{open && (
				<div
					className={[
						'category-accordion__overlay',
						isClosing ? 'is-closing' : '',
					]
						.filter(Boolean)
						.join(' ')}
					data-scroll-native
					role="dialog"
					aria-modal="true"
					aria-labelledby={CATEGORY_DIALOG_TITLE_ID}
					onClick={(event) => {
						if (event.target === event.currentTarget) {
							requestCloseAccordion();
						}
					}}
				>
					<div
						ref={panelRef}
						className="category-accordion__panel"
						onClick={handlePanelClick}
					>
						<button
							ref={closeButtonRef}
							className="category-accordion__close"
							type="button"
							aria-label={ACCORDION_COPY.closeLabel}
							data-category-accordion-control
							onClick={requestCloseAccordion}
						>
							×
						</button>

						<header className="category-accordion__heading">
							<p>{ACCORDION_COPY.dialogEyebrow}</p>
							<h2 id={CATEGORY_DIALOG_TITLE_ID}>{ACCORDION_COPY.dialogTitle}</h2>
						</header>

						<div
							className="category-accordion__rail-frame"
							data-scroll-native
							onWheel={handleRailWheel}
							onPointerDown={handleRailPointerDown}
						>
							<div
								className={[
									'category-accordion__rail',
									isWheelScrolling ? 'is-wheel-scrolling' : '',
								]
									.filter(Boolean)
									.join(' ')}
								data-scroll-native
								ref={railRef}
							>
								{visuals.map((visual, index) => {
									const isPreselected = preselectedId === visual.id;
									const isActive = selectedCategoryId === visual.id;
									const postCount = postCounts[visual.id];

									return (
										<button
											key={visual.id}
											className={[
												'category-accordion__card',
												isPreselected ? 'is-preselected' : '',
												isActive ? 'is-current' : '',
											]
												.filter(Boolean)
												.join(' ')}
											type="button"
											data-tone={visual.tone}
											style={
												{
													'--card-index': index,
													'--image-position': visual.imagePosition,
													'--image-scale': visual.imageScale,
													'--image-active-scale': visual.imageScale + 0.04,
												} as CSSProperties
											}
											aria-label={`${visual.title}，${postCount} ${ACCORDION_COPY.cardCountSuffix}。${
												isPreselected ? ACCORDION_COPY.confirmHint : ACCORDION_COPY.selectHint
											}`}
											aria-current={isActive ? 'page' : undefined}
											aria-pressed={isPreselected}
											onClick={() => handleCardClick(visual.id)}
											onPointerMove={handlePointerMove}
											onPointerLeave={handlePointerLeave}
										>
											<span className="category-accordion__card-inner">
												<img
													className="category-accordion__image"
													src={visual.image.src}
													width={visual.image.width}
													height={visual.image.height}
													alt=""
													loading="lazy"
												/>
												<span className="category-accordion__card-shade" aria-hidden="true" />
												<span className="category-accordion__card-title">
													<span className="category-accordion__card-title-prefix">
														{visual.cardInscription.prefix}
													</span>
													<span className="category-accordion__card-title-name">
														{visual.cardInscription.name}
													</span>
												</span>
												<span className="category-accordion__card-copy">
													<strong>{visual.title}</strong>
													<span>{visual.description}</span>
													<em>
														{postCount} {ACCORDION_COPY.recordLabel} ·{' '}
														{ACCORDION_COPY.cardConfirmText}
													</em>
												</span>
												{isActive && (
													<span className="category-accordion__current-mark">
														{ACCORDION_COPY.currentLabel}
													</span>
												)}
											</span>
										</button>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function getFocusableElements(container: HTMLElement | null) {
	if (!container) {
		return [];
	}

	return Array.from(
		container.querySelectorAll<HTMLElement>(
			[
				'a[href]',
				'button:not([disabled])',
				'input:not([disabled])',
				'select:not([disabled])',
				'textarea:not([disabled])',
				'[tabindex]:not([tabindex="-1"])',
			].join(', '),
		),
	).filter((element) => element.offsetParent !== null || element === document.activeElement);
}

function clamp(value: number, min: number, max: number) {
	return Math.min(Math.max(value, min), max);
}
