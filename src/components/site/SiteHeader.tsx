import { Fragment, useEffect, useState } from 'react';
import { SITE_CONFIG } from '../../config/site';
import { SITE_CHROME_CONFIG } from '../../config/interactions/siteChrome';

export default function SiteHeader() {
	const [idle, setIdle] = useState(false);

	useEffect(() => {
		let timer = 0;

		const markActive = () => {
			setIdle(false);
			window.clearTimeout(timer);
			timer = window.setTimeout(() => setIdle(true), SITE_CHROME_CONFIG.header.idleDelay);
		};

		markActive();

		const events: Array<keyof WindowEventMap> = ['pointermove', 'keydown', 'scroll', 'focus'];
		events.forEach((event) => window.addEventListener(event, markActive, { passive: true }));

		return () => {
			window.clearTimeout(timer);
			events.forEach((event) => window.removeEventListener(event, markActive));
		};
	}, []);

	return (
		<header className={`site-header glass-surface glass-surface--thin${idle ? ' is-idle' : ''}`}>
			<a className="site-header__brand" href="/" aria-label={`${SITE_CONFIG.name} ${SITE_CHROME_CONFIG.header.homeLabel}`}>
				<span>{SITE_CONFIG.name}</span>
			</a>
			<nav className="site-header__nav" aria-label={SITE_CHROME_CONFIG.header.navigationLabel}>
				{SITE_CONFIG.navItems.map((item, index) => {
					const href = 'href' in item ? item.href : undefined;

					return (
						<Fragment key={item.label}>
							{index > 0 && (
								<span className="site-header__divider" aria-hidden="true">
									/
								</span>
							)}
							{href ? (
								<a className="site-header__nav-item" href={href}>
									{item.label}
								</a>
							) : (
								<span className="site-header__nav-item is-disabled" aria-disabled="true">
									{item.label}
								</span>
							)}
						</Fragment>
					);
				})}
			</nav>
		</header>
	);
}
