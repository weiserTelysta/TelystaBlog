import {
	DEFAULT_HOME_PROFILE,
	HOME_PROFILES,
	type HomeProfile,
} from '../config/pages/homeProfiles';

export function getWeightedHomeProfile(random: () => number = Math.random): HomeProfile {
	const enabledProfiles = HOME_PROFILES.filter((profile) => profile.enabled !== false);

	if (enabledProfiles.length === 0) {
		return DEFAULT_HOME_PROFILE;
	}

	const weightedProfiles = enabledProfiles.map((profile) => ({
		profile,
		weight: Math.max(profile.weight ?? 1, 0),
	}));
	const totalWeight = weightedProfiles.reduce((total, item) => total + item.weight, 0);

	if (totalWeight <= 0) {
		return enabledProfiles[0] ?? DEFAULT_HOME_PROFILE;
	}

	let roll = random() * totalWeight;

	for (const item of weightedProfiles) {
		roll -= item.weight;

		if (roll <= 0) {
			return item.profile;
		}
	}

	return weightedProfiles.at(-1)?.profile ?? DEFAULT_HOME_PROFILE;
}
