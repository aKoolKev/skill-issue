<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ArrowLeft, GraduationCap, LoaderCircle } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { findFamily, isColor } from '$lib/family';
	import { linesToKnow, type LineStats } from '$lib/openings';
	import { numbered, pointsVsExpected, signed } from '$lib/games';
	import { readLocal } from '$lib/storage';
	import { lineKey } from '$lib/daily';
	import { TOP_BOX } from '$lib/review';
	import RecordBar from '$lib/components/RecordBar.svelte';

	// One opening family as one color: the lines the player has reached, then the main
	// variations they haven't, each with a lesson.
	const color = $derived(isColor(page.params.color) ? page.params.color : 'white');
	const family = $derived(
		findFamily(player.book, player.openings, color, page.params.family ?? '')
	);
	const lines = $derived(player.book && family ? linesToKnow(player.book, family) : []);
	const cost = (stats: LineStats) => pointsVsExpected(stats.games.map((g) => g.game));
	// Same order as the openings list: by cost if that's what the player picked there
	const byCost = readLocal<string>('openings-sort', 'played') === 'cost';
	const played = $derived.by(() => {
		const list = lines.filter((l) => l.games.length);
		return byCost ? list.sort((a, b) => cost(a) - cost(b)) : list;
	});
	const practiced = (stats: LineStats) => player.linesProgress[lineKey(color, stats.line.id)]?.box;
	const unplayed = $derived(lines.filter((l) => !l.games.length && l.main));
	const others = $derived(lines.filter((l) => !l.games.length && !l.main));

	let showAll = $state(false);
	const MAIN_LIMIT = 8;

	/** The moves of a line, shortened for a preview */
	const preview = (stats: LineStats) =>
		stats.line.moves.map((san, ply) => (ply % 2 === 0 ? numbered(ply, san) : san)).join(' ');

	const lessonHref = (stats: LineStats) =>
		resolve('/u/[username]/openings/[color]/[family]/[line]', {
			username: page.params.username ?? '',
			color,
			family: page.params.family ?? '',
			line: String(stats.line.id)
		});
</script>

<svelte:head>
	<title>{family?.name ?? 'Opening'} · Skill Issue</title>
</svelte:head>

{#snippet lineRow(stats: LineStats)}
	<li>
		<a
			href={lessonHref(stats)}
			class="flex flex-col gap-2 card preset-filled-surface-100-900 p-4 transition-colors hover:preset-filled-surface-200-800 sm:flex-row sm:items-center sm:gap-4"
		>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<p class="font-semibold">
					{stats.line.variation}
					<span class="ml-1 text-xs font-normal text-muted">{stats.line.eco}</span>
				</p>
				<p class="truncate font-mono text-xs text-muted">{preview(stats)}</p>
			</div>
			{#if stats.games.length}
				<div class="flex w-full flex-col gap-1 sm:w-40">
					<p class="text-sm">
						Played <strong>{stats.games.length}×</strong>
						<span
							class="text-xs {cost(stats) <= -0.5
								? 'text-error-700-300'
								: cost(stats) >= 0.5
									? 'text-success-700-300'
									: 'text-muted'}"
							title="Points scored minus points expected from the ratings"
							>{signed(cost(stats))}</span
						>
					</p>
					<RecordBar games={stats.games.map((g) => g.game)} compact />
				</div>
			{/if}
			<span class="btn self-start preset-tonal btn-sm sm:self-center">
				<GraduationCap class="size-4" />
				{#if practiced(stats) === undefined}
					Learn
				{:else if (practiced(stats) ?? 0) >= TOP_BOX - 1}
					Known
				{:else}
					Level {practiced(stats)}/{TOP_BOX}
				{/if}
			</span>
		</a>
	</li>
{/snippet}

<section class="flex flex-col gap-6">
	<a
		href={resolve('/u/[username]', { username: page.params.username ?? '' })}
		class="btn self-start btn-sm hover:preset-tonal"
	>
		<ArrowLeft class="size-4" /> All openings
	</a>

	{#if !player.book}
		<p class="flex items-center gap-2 text-muted">
			<LoaderCircle class="size-4 animate-spin" /> Loading openings…
		</p>
	{:else if !family}
		<p class="card preset-filled-surface-100-900 p-5">Couldn’t find that opening.</p>
	{:else}
		<header class="flex flex-col gap-2">
			<h2 class="h3">
				{family.name}
				<span class="text-base font-normal text-muted"
					>as {color === 'white' ? 'White' : 'Black'}</span
				>
			</h2>
			{#if family.games.length}
				<div class="max-w-sm"><RecordBar games={family.games.map((g) => g.game)} /></div>
			{/if}
		</header>

		{#if played.length}
			<div class="flex flex-col gap-3">
				<h3 class="h5">Lines you’ve played</h3>
				<ul class="flex flex-col gap-2">
					{#each played as stats (stats.line.id)}
						{@render lineRow(stats)}
					{/each}
				</ul>
			</div>
		{/if}

		{#if unplayed.length}
			<div class="flex flex-col gap-3">
				<h3 class="h5">Main variations to know</h3>
				<p class="-mt-2 text-sm text-muted">
					The named variations of the {family.name}, shortest first. Worth knowing even if they
					haven’t come up yet.
				</p>
				<ul class="flex flex-col gap-2">
					{#each showAll ? [...unplayed, ...others] : unplayed.slice(0, MAIN_LIMIT) as stats (stats.line.id)}
						{@render lineRow(stats)}
					{/each}
				</ul>
				{#if !showAll && unplayed.length + others.length > MAIN_LIMIT}
					<button
						type="button"
						class="btn self-start preset-tonal btn-sm"
						onclick={() => (showAll = true)}
					>
						Show all {unplayed.length + others.length} lines
					</button>
				{/if}
			</div>
		{/if}
	{/if}
</section>
