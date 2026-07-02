import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { ResourceListItem } from '../../lib/resources/resourceItems';

type ResourceCardProps = {
	resource: ResourceListItem;
	motionIndex: number;
	onSelect: (resource: ResourceListItem, trigger: HTMLButtonElement) => void;
};

const CARD_ENTER_EASE = [0.16, 1, 0.3, 1] as const;
const CARD_LAYOUT_EASE = [0.22, 1, 0.36, 1] as const;

export default function ResourceCard({ resource, motionIndex, onSelect }: ResourceCardProps) {
	const shouldReduceMotion = useReducedMotion();
	const enterDelay = Math.min(motionIndex * 0.032, 0.28);

	return (
		<motion.div
			layout={!shouldReduceMotion}
			layoutId={`resource-card-${resource.id}`}
			className="resource-card-motion"
			style={{ '--resource-card-ratio': String(resource.coverAspectRatio) } as CSSProperties}
			initial={shouldReduceMotion ? false : { opacity: 0, y: 26, filter: 'blur(8px)' }}
			animate={shouldReduceMotion ? undefined : { opacity: 1, y: 0, filter: 'blur(0px)' }}
			exit={shouldReduceMotion ? undefined : { opacity: 0, y: 12, filter: 'blur(4px)' }}
			transition={
				shouldReduceMotion
					? { duration: 0 }
					: {
						opacity: { duration: 0.5, delay: enterDelay, ease: CARD_ENTER_EASE },
						y: { duration: 0.58, delay: enterDelay, ease: CARD_ENTER_EASE },
						filter: { duration: 0.5, delay: enterDelay, ease: CARD_ENTER_EASE },
						layout: { duration: 0.55, ease: CARD_LAYOUT_EASE },
					}
			}
		>
			<button
				type="button"
				className="resource-card"
				onClick={(event) => onSelect(resource, event.currentTarget)}
				aria-label={`View resource ${resource.title}`}
			>
				<span className="resource-card__plate">
					<img src={resource.cover} alt="" loading="lazy" decoding="async" />
				</span>
				<span className="resource-card__content">
					<span className="resource-card__title">{resource.title}</span>
				</span>
			</button>
		</motion.div>
	);
}
