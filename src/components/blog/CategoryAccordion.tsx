import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, MouseEvent, PointerEvent, WheelEvent } from 'react';
import { BLOG_PAGE_CONFIG } from '../../lib/blogPageConfig';
import {
	buildCategoryHref,
	type BlogCategoryId,
	type CategoryPostCount,
} from '../../lib/blogCategories';
import type { BlogCategoryVisual } from '../../lib/blogCategoryVisuals';
import './CategoryAccordion.scss';

const ACCORDION_COPY = BLOG_PAGE_CONFIG.categoryAccordion;
const CATEGORY_DIALOG_TITLE_ID = ACCORDION_COPY.dialogTitleId;
const CLOSE_ANIMATION_MS = 200;
const WHEEL_SCROLL_FACTOR = 1.75;
const WHEEL_EASE = 0.18;
const WHEEL_REST_DISTANCE = 0.5;
const SNAP_MAX_DISTANCE = 48;

type RailMotionPhase = 'idle' | 'wheel' | 'settling' | 'closing';

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
	const targetScrollLeftRef = useRef(0);
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
			railResizeObserverRef.current = new ResizeObserver(updateRailEdgeSpace);
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
		setWheelScrolling(phase === 'wheel' || phase === 'settling');
	}

	function startRailAnimation() {
		if (scrollAnimationFrameRef.current !== null) {
			return;
		}

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
		setRailMotionPhase('idle');
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

		const maxScrollLeft = getRailMaxScrollLeft(rail);
		const canScroll = maxScrollLeft > 1;
		const isMostlyVerticalWheel = Math.abs(event.deltaY) > Math.abs(event.deltaX);
		const isAtStart = rail.scrollLeft <= 1;
		const isAtEnd = rail.scrollLeft >= maxScrollLeft - 1;
		const isScrollingLeft = event.deltaY < 0;
		const isScrollingRight = event.deltaY > 0;

		if (!canScroll || event.shiftKey || !isMostlyVerticalWheel || event.deltaY === 0) {
			return;
		}

		if ((isAtStart && isScrollingLeft) || (isAtEnd && isScrollingRight)) {
			return;
		}

		event.preventDefault();

		if (railMotionPhaseRef.current === 'idle') {
			targetScrollLeftRef.current = rail.scrollLeft;
		}

		targetScrollLeftRef.current = clamp(
			targetScrollLeftRef.current + event.deltaY * WHEEL_SCROLL_FACTOR,
			0,
			maxScrollLeft,
		);

		setRailMotionPhase('wheel');
		startRailAnimation();
	}

	function animateRailScroll() {
		const rail = railRef.current;

		if (railMotionPhaseRef.current === 'closing' || !rail) {
			scrollAnimationFrameRef.current = null;
			return;
		}

		const distance = targetScrollLeftRef.current - rail.scrollLeft;

		if (Math.abs(distance) <= WHEEL_REST_DISTANCE) {
			rail.scrollLeft = targetScrollLeftRef.current;
			scrollAnimationFrameRef.current = null;

			if (railMotionPhaseRef.current === 'wheel') {
				const settleTarget = getNearestCardSettleTarget(rail);

				if (settleTarget !== null) {
					targetScrollLeftRef.current = settleTarget;
					setRailMotionPhase('settling');
					startRailAnimation();
					return;
				}

				setRailMotionPhase('idle');
				return;
			}

			if (railMotionPhaseRef.current === 'settling') {
				setRailMotionPhase('idle');
				return;
			}

			setRailMotionPhase('idle');
			return;
		}

		rail.scrollLeft += distance * WHEEL_EASE;
		scrollAnimationFrameRef.current = window.requestAnimationFrame(animateRailScroll);
	}

	function getNearestCardSettleTarget(rail: HTMLDivElement) {
		const cards = Array.from(rail.querySelectorAll<HTMLElement>('.category-accordion__card'));

		if (cards.length === 0) {
			return null;
		}

		const railRect = rail.getBoundingClientRect();
		const railCenter = railRect.left + railRect.width / 2;
		let nearestDistance = Number.POSITIVE_INFINITY;
		let nearestCard: HTMLElement | null = null;

		for (const card of cards) {
			const cardRect = card.getBoundingClientRect();
			const cardCenter = cardRect.left + cardRect.width / 2;
			const distance = cardCenter - railCenter;

			if (Math.abs(distance) < Math.abs(nearestDistance)) {
				nearestDistance = distance;
				nearestCard = card;
			}
		}

		if (!nearestCard || Math.abs(nearestDistance) > SNAP_MAX_DISTANCE) {
			return null;
		}

		return clamp(
			rail.scrollLeft + nearestDistance,
			0,
			getRailMaxScrollLeft(rail),
		);
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

						<div className="category-accordion__rail-frame" onWheel={handleRailWheel}>
							<div
								className={[
									'category-accordion__rail',
									isWheelScrolling ? 'is-wheel-scrolling' : '',
								]
									.filter(Boolean)
									.join(' ')}
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
