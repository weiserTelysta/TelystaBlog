import { Fragment, useEffect, useState } from 'react';

const navItems = [
	{ label: 'Blog' },
	{ label: 'About' },
	{ label: 'Friends' },
];

const IDLE_DELAY = 5200;

export default function SiteHeader() {
	const [idle, setIdle] = useState(false);

	useEffect(() => {
		let timer = 0;

		const markActive = () => {
			setIdle(false);
			window.clearTimeout(timer);
			timer = window.setTimeout(() => setIdle(true), IDLE_DELAY);
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
			<a className="site-header__brand" href="/" aria-label="Telysta Blog 首页">
				<span>Telysta Blog</span>
			</a>
			<nav className="site-header__nav" aria-label="主导航">
				{navItems.map((item, index) => (
					<Fragment key={item.href}>
						{index > 0 && (
							<span className="site-header__divider" aria-hidden="true">
								/
							</span>
						)}
						<span className="site-header__nav-item is-disabled" aria-disabled="true">
							{item.label}
						</span>
					</Fragment>
				))}
			</nav>
		</header>
	);
}
