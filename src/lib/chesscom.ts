// chess.com's free Published-Data API: public, read-only, no key, and it allows calls straight
// from the browser. https://www.chess.com/news/view/published-data-api
// chess.com asks clients not to send requests in parallel, so callers fetch one at a time.

const API = 'https://api.chess.com/pub/player';

/** The username doesn't exist on chess.com */
export class PlayerNotFound extends Error {}

export interface Profile {
	username: string;
	name?: string;
	avatar?: string;
	url: string;
	title?: string;
}

export type Ratings = Partial<Record<'rapid' | 'blitz' | 'bullet' | 'daily', number>>;

/** One game as chess.com sends it (only the fields this app reads) */
export interface RawGame {
	url: string;
	pgn?: string;
	end_time: number;
	time_class: string;
	rules: string;
	initial_setup?: string;
	white: { username: string; rating: number; result: string };
	black: { username: string; rating: number; result: string };
}

async function getJson(url: string) {
	const res = await fetch(url);
	if (res.status === 404) throw new PlayerNotFound();
	if (!res.ok) throw new Error(`chess.com answered ${res.status}`);
	return res.json();
}

const playerUrl = (username: string) => `${API}/${encodeURIComponent(username.toLowerCase())}`;

export async function getProfile(username: string): Promise<Profile> {
	const data = await getJson(playerUrl(username));
	return {
		username: data.username,
		name: data.name,
		avatar: data.avatar,
		url: data.url,
		title: data.title
	};
}

/** Current rating in each time control the player has played */
export async function getRatings(username: string): Promise<Ratings> {
	const data = await getJson(`${playerUrl(username)}/stats`);
	const ratings: Ratings = {};
	for (const kind of ['rapid', 'blitz', 'bullet', 'daily'] as const) {
		const rating = data[`chess_${kind}`]?.last?.rating;
		if (typeof rating === 'number') ratings[kind] = rating;
	}
	return ratings;
}

/** URLs of the player's monthly game archives, oldest first */
export async function getArchives(username: string): Promise<string[]> {
	return (await getJson(`${playerUrl(username)}/games/archives`)).archives ?? [];
}

/** Every game in one monthly archive */
export async function getMonth(archiveUrl: string): Promise<RawGame[]> {
	return (await getJson(archiveUrl)).games ?? [];
}
