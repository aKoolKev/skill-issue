<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ArrowLeft, ExternalLink, LoaderCircle } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { findFamily, isColor } from '$lib/family';
	import { nextMoves } from '$lib/openings';
	import { shortDate } from '$lib/games';
	import LessonPlayer from '$lib/components/LessonPlayer.svelte';
	import RecordBar from '$lib/components/RecordBar.svelte';

	// The lesson for one line, with how it has gone in the player's own games
	const color = $derived(isColor(page.params.color) ? page.params.color : 'white');
	const slug = $derived(page.params.family ?? '');
	const line = $derived(player.book?.lines[Number(page.params.line)]);
	const family = $derived(findFamily(player.book, player.openings, color, slug));
	const games = $derived(family?.games.filter((g) => g.line.id === line?.id) ?? []);
	const next = $derived(nextMoves(games).slice(0, 5));

	const RESULT = { win: 'Won', draw: 'Drew', loss: 'Lost' } as const;
</script>

<svelte:head>
	<title>{line?.name ?? 'Lesson'} · Skill Issue</title>
</svelte:head>

<section class="flex flex-col gap-6">
	<a
		href={resolve('/u/[username]/openings/[color]/[family]', {
			username: page.params.username ?? '',
			color,
			family: slug
		})}
		class="btn self-start btn-sm hover:preset-tonal"
	>
		<ArrowLeft class="size-4" />
		{family?.name ?? 'Back'}
	</a>

	{#if !player.book}
		<p class="flex items-center gap-2 text-muted">
			<LoaderCircle class="size-4 animate-spin" /> Loading…
		</p>
	{:else if !line}
		<p class="card preset-filled-surface-100-900 p-5">Couldn’t find that line.</p>
	{:else}
		<header class="flex flex-col gap-1">
			<p class="text-sm text-muted">{line.family} · {line.eco}</p>
			<h2 class="h3">{line.variation}</h2>
		</header>

		<LessonPlayer
			{line}
			{color}
			onfinish={(mistakes) => player.answerLine(color, line.id, mistakes === 0)}
		/>

		<!-- How this line has gone in the player's games -->
		<div class="flex flex-col gap-3 card preset-filled-surface-100-900 p-4">
			<h3 class="h5">In your games</h3>
			{#if !games.length}
				<p class="text-sm text-muted">
					You haven’t reached this exact line as {color} in your recent games.
				</p>
			{:else}
				<p class="text-sm">
					You reached this position in <strong>{games.length}</strong>
					{games.length === 1 ? 'game' : 'games'}.
				</p>
				<div class="max-w-sm"><RecordBar games={games.map((g) => g.game)} /></div>
				{#if next.length}
					<div class="flex flex-col gap-1">
						<p class="text-sm font-semibold">What came next</p>
						<div class="flex flex-wrap gap-1.5">
							{#each next as [san, count] (san)}
								<span class="chip preset-tonal font-mono text-xs">{san} ×{count}</span>
							{/each}
						</div>
					</div>
				{/if}
				<ul class="flex flex-col divide-y divide-surface-200-800 text-sm">
					{#each games.slice(0, 10) as { game } (game.id)}
						<li>
							<!-- eslint-disable svelte/no-navigation-without-resolve -- chess.com, not this app -->
							<a
								href={game.id}
								target="_blank"
								rel="noreferrer"
								class="flex items-center justify-between gap-3 py-2 hover:underline"
							>
								<span>
									<span
										class={game.result === 'win'
											? 'text-success-700-300'
											: game.result === 'loss'
												? 'text-error-700-300'
												: 'text-muted'}>{RESULT[game.result]}</span
									>
									vs {game.opponent.username} ({game.opponent.rating})
								</span>
								<span class="flex shrink-0 items-center gap-1 text-muted">
									<span class="capitalize">{game.timeClass}</span> · {shortDate(game.endTime)}
									<ExternalLink class="size-3.5" />
								</span>
							</a>
							<!-- eslint-enable svelte/no-navigation-without-resolve -->
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</section>
