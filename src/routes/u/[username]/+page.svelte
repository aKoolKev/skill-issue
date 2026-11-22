<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { SegmentedControl } from '@skeletonlabs/skeleton-svelte';
	import { ChevronRight, LoaderCircle, TrendingDown } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { pointsVsExpected, signed, type Color } from '$lib/games';
	import type { Family } from '$lib/openings';
	import { readLocal, writeLocal } from '$lib/storage';
	import RecordBar from '$lib/components/RecordBar.svelte';

	// Every opening the player has played, as White or as Black: most played first, or the ones
	// costing them the most points against their opponents' ratings first
	let color = $state<Color>('white');
	let sort = $state<'played' | 'cost'>(readLocal<'played' | 'cost'>('openings-sort', 'played'));
	$effect(() => writeLocal('openings-sort', sort));

	/** Fewer games than this and an opening's cost is mostly noise */
	const MIN_GAMES = 3;
	/** Blunders up to this move count as the opening's fault */
	const EARLY_MOVE = 15;

	const cost = (family: Family) => pointsVsExpected(family.games.map((g) => g.game));
	const ofColor = (c: Color) => player.openings.filter((family) => family.color === c);
	const gamesAs = (c: Color) => player.games.filter((game) => game.color === c).length;

	const mine = $derived(ofColor(color));
	const shown = $derived(
		sort === 'cost'
			? [...mine].sort(
					(a, b) =>
						Number(b.games.length >= MIN_GAMES) - Number(a.games.length >= MIN_GAMES) ||
						cost(a) - cost(b)
				)
			: mine
	);
	/** The openings losing the most points, worth fixing first */
	const leaks = $derived(
		mine
			.filter((family) => family.games.length >= MIN_GAMES && cost(family) < -0.5)
			.sort((a, b) => cost(a) - cost(b))
			.slice(0, 3)
	);

	/** Blunder cards from the family's games, early enough to blame the opening */
	const earlyBlunders = (family: Family) => {
		const ids = new Set(family.games.map((g) => g.game.id));
		return player.cards.filter((card) => ids.has(card.gameId) && card.moveNumber <= EARLY_MOVE)
			.length;
	};

	/** The family's most played lines, for a preview under its name */
	function topLines(family: Family) {
		// eslint-disable-next-line svelte/prefer-svelte-reactivity -- a local tally, not state
		const counts = new Map<string, number>();
		for (const { line } of family.games) {
			counts.set(line.variation, (counts.get(line.variation) ?? 0) + 1);
		}
		return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
	}

	const familyHref = (family: Family) =>
		resolve('/u/[username]/openings/[color]/[family]', {
			username: page.params.username ?? '',
			color,
			family: family.slug
		});
	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<section class="flex flex-col gap-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<p class="text-muted">
			Openings from your recent games. Pick one to see its lines and lessons.
		</p>
		<SegmentedControl value={color} onValueChange={(d) => (color = d.value as Color)}>
			<SegmentedControl.Label class="sr-only">Your color</SegmentedControl.Label>
			<SegmentedControl.Control>
				<SegmentedControl.Indicator />
				{#each ['white', 'black'] as const as c (c)}
					<SegmentedControl.Item value={c}>
						<SegmentedControl.ItemText>
							As {c === 'white' ? 'White' : 'Black'}
							<span class="text-xs opacity-70"
								>· {plural(ofColor(c).length, 'opening')} · {plural(gamesAs(c), 'game')}</span
							>
						</SegmentedControl.ItemText>
						<SegmentedControl.ItemHiddenInput />
					</SegmentedControl.Item>
				{/each}
			</SegmentedControl.Control>
		</SegmentedControl>
	</div>

	{#if !player.book || (player.status === 'loading' && !player.games.length)}
		<p class="flex items-center gap-2 text-muted">
			<LoaderCircle class="size-4 animate-spin" /> Loading…
		</p>
	{:else if !shown.length}
		<p class="card preset-filled-surface-100-900 p-5 text-muted">
			No games as {color === 'white' ? 'White' : 'Black'} in the last few months.
		</p>
	{:else}
		{#if leaks.length}
			<div class="flex flex-col gap-3 card border border-error-500/40 p-4">
				<div class="flex items-start gap-3">
					<TrendingDown class="mt-0.5 size-5 shrink-0 text-error-600-400" />
					<div class="flex flex-col gap-1">
						<h2 class="font-bold">Fix these first</h2>
						<p class="text-sm text-muted">
							Openings where you score less than your rating says you should against these
							opponents. Points are wins (1) and draws (½) compared with what was expected.
						</p>
					</div>
				</div>
				<ul class="grid gap-2 sm:grid-cols-3">
					{#each leaks as family (family.slug)}
						<li>
							<a
								href={familyHref(family)}
								class="flex h-full flex-col gap-1 rounded-base preset-tonal p-3 hover:preset-tonal-error"
							>
								<span class="font-semibold">{family.name}</span>
								<span class="text-sm text-error-700-300"
									>{signed(cost(family))} points vs. expected</span
								>
								<span class="text-xs text-muted">{plural(family.games.length, 'game')}</span>
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/if}

		<div class="flex items-center justify-end gap-2 text-sm">
			<span class="text-muted">Sort:</span>
			<SegmentedControl value={sort} onValueChange={(d) => (sort = d.value as typeof sort)}>
				<SegmentedControl.Label class="sr-only">Sort openings</SegmentedControl.Label>
				<SegmentedControl.Control>
					<SegmentedControl.Indicator />
					<SegmentedControl.Item value="played">
						<SegmentedControl.ItemText>Most played</SegmentedControl.ItemText>
						<SegmentedControl.ItemHiddenInput />
					</SegmentedControl.Item>
					<SegmentedControl.Item value="cost">
						<SegmentedControl.ItemText>Costs you most</SegmentedControl.ItemText>
						<SegmentedControl.ItemHiddenInput />
					</SegmentedControl.Item>
				</SegmentedControl.Control>
			</SegmentedControl>
		</div>

		<ul class="grid gap-3 md:grid-cols-2">
			{#each shown as family (family.slug)}
				{@const points = cost(family)}
				{@const early = earlyBlunders(family)}
				<li>
					<a
						href={familyHref(family)}
						class="flex h-full flex-col gap-3 card preset-filled-surface-100-900 p-4 transition-colors hover:preset-filled-surface-200-800"
					>
						<div class="flex items-start justify-between gap-3">
							<h2 class="font-bold">{family.name}</h2>
							<span class="flex shrink-0 items-center gap-1 text-sm text-muted">
								{plural(family.games.length, 'game')}
								<ChevronRight class="size-4" />
							</span>
						</div>
						<RecordBar games={family.games.map((g) => g.game)} />
						<div class="flex flex-wrap gap-x-3 gap-y-1 text-xs">
							<span
								class={points <= -0.5
									? 'text-error-700-300'
									: points >= 0.5
										? 'text-success-700-300'
										: 'text-muted'}
								title="Points scored minus points expected from the ratings"
								>{signed(points)} points vs. expected</span
							>
							{#if early}
								<span class="text-warning-700-300">{plural(early, 'early blunder')}</span>
							{/if}
						</div>
						<div class="flex flex-wrap gap-1.5">
							{#each topLines(family) as [variation, count] (variation)}
								<span class="chip preset-tonal text-xs">{variation} · {count}</span>
							{/each}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
