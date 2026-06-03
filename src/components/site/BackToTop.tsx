import { useEffect, useState } from 'react';
import { scrollToTop } from '../../lib/scrollRuntime';
import './BackToTop.scss';

const SHOW_AFTER = 620;

export default function BackToTop() {
	const [visible, setVisible] = useState(false);

	useEffect(() => {
		const updateVisibility = () => {
			setVisible(window.scrollY > SHOW_AFTER);
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
				aria-label="返回顶部"
				aria-hidden={!visible}
				tabIndex={visible ? 0 : -1}
				onClick={scrollToTop}
			>
				<span className="back-to-top__line" aria-hidden="true" />
				<span className="back-to-top__label">Back to top</span>
				<span className="back-to-top__mark" aria-hidden="true" />
			</button>
		</>
	);
}
