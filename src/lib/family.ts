import type { Color } from './games';
import { slugify, type Book, type Family } from './openings';

/**
 * The family a URL points at: the player's own (with their games), or, if they haven't played
 * it as that color, the family from the opening list with no games so its lines still show.
 */
export function findFamily(
	book: Book | null,
	openings: Family[],
	color: Color,
	slug: string
): Family | null {
	const own = openings.find((family) => family.color === color && family.slug === slug);
	if (own) return own;
	const line = book?.lines.find((line) => slugify(line.family) === slug);
	return line ? { name: line.family, color, slug, games: [] } : null;
}

export const isColor = (value: string | undefined): value is Color =>
	value === 'white' || value === 'black';
