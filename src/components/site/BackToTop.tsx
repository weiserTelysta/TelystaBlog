import { useEffect, useState } from 'react';
import { SITE_CHROME_CONFIG } from '../../config/interactions/siteChrome';
import { scrollToTop } from '../../lib/scrollRuntime';
import './BackToTop.scss';

export default function BackToTop() {
	const [visible, setVisible] = useState(false);
	const [modalOpen, setModalOpen] = useState(false);
	const [compact, setCompact] = useState(false);

	useEffect(() => {
		const updateVisibility = () => {
			setVisible(window.scrollY > SITE_CHROME_CONFIG.backToTop.showAfter);
		};

		updateVisibility();
		window.addEventListener('scroll', updateVisibility, { passive: true });

		return () => {
			window.removeEventListener('scroll', updateVisibility);
		};
	}, []);

	useEffect(() => {
		const root = document.documentElement;
		const updateModalState = () => {
			setModalOpen(root.classList.contains('has-modal-open'));
		};
		const observer = new MutationObserver(updateModalState);

		updateModalState();
		observer.observe(root, { attributes: true, attributeFilter: ['class'] });

		return () => {
			observer.disconnect();
		};
	}, []);

	useEffect(() => {
		const updateCompactState = () => {
			const resourcePage = document.querySelector<HTMLElement>('.resource-page');

			if (!resourcePage) {
				setCompact(false);
				return;
			}

			const rightEdge = resourcePage.getBoundingClientRect().right;
			setCompact(rightEdge + 72 > window.innerWidth);
		};

		updateCompactState();
		window.addEventListener('resize', updateCompactState);
		window.addEventListener('scroll', updateCompactState, { passive: true });

		return () => {
			window.removeEventListener('resize', updateCompactState);
			window.removeEventListener('scroll', updateCompactState);
		};
	}, []);

	const isVisible = visible && !modalOpen;
	const className = [
		'back-to-top',
		isVisible ? 'is-visible' : '',
		compact ? 'is-compact' : '',
	].filter(Boolean).join(' ');

	return (
		<>
			<button
				className={className}
				type="button"
				aria-label={SITE_CHROME_CONFIG.backToTop.ariaLabel}
				aria-hidden={!isVisible}
				tabIndex={isVisible ? 0 : -1}
				onClick={scrollToTop}
			>
				<span className="back-to-top__line" aria-hidden="true" />
				<span className="back-to-top__label">{SITE_CHROME_CONFIG.backToTop.label}</span>
				<span className="back-to-top__mark" aria-hidden="true" />
			</button>
		</>
	);
}
