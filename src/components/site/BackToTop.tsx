import { useEffect, useState } from 'react';
import { SITE_CHROME_CONFIG } from '../../config/interactions/siteChrome';
import { scrollToTop } from '../../lib/scrollRuntime';
import './BackToTop.scss';

export default function BackToTop() {
	const [visible, setVisible] = useState(false);

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

	return (
		<>
			<button
				className={`back-to-top${visible ? ' is-visible' : ''}`}
				type="button"
				aria-label={SITE_CHROME_CONFIG.backToTop.ariaLabel}
				aria-hidden={!visible}
				tabIndex={visible ? 0 : -1}
				onClick={scrollToTop}
			>
				<span className="back-to-top__line" aria-hidden="true" />
				<span className="back-to-top__label">{SITE_CHROME_CONFIG.backToTop.label}</span>
				<span className="back-to-top__mark" aria-hidden="true" />
			</button>
		</>
	);
}
