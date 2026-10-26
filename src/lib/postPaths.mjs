// Article folders may use singular names while category IDs and published URLs stay stable.
const directoryByCategory = { letters: 'letter', portraits: 'portrait' };
const categoryByDirectory = { letter: 'letters', portrait: 'portraits' };

export function postDirectoryForCategory(category) {
	return directoryByCategory[category] ?? category;
}

export function postCategoryForDirectory(directory) {
	return categoryByDirectory[directory] ?? directory;
}
