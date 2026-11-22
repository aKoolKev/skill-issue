<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Progress } from '@skeletonlabs/skeleton-svelte';
	import { ArrowLeft, PartyPopper, RotateCcw } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { session } from '$lib/review';
	import type { Card } from '$lib/analysis';
	import { cardFilter, filterLabel } from '$lib/tactics';
	import CardDrill from '$lib/components/CardDrill.svelte';

	// A review session: each card shows the position before a blunder; play the move you should
	// have played. Right answers push a card further out; misses come back at the end of the
	// session and sooner next time. ?type=, ?phase= or ?kind=missed-win drills just those cards.
	let queue = $state<Card[]>([]);
	let index = $state(0);
	/** Distinct cards in the session; misses re-added at the end come after these */
	let size = $state(0);
	let started = $state(false);
	let firstTry = $state(0);
	let missedOnce = $state<Set<string>>(new Set());

	const filter = $derived(cardFilter(page.url.searchParams));
	const pool = $derived(player.cards.filter(filter.test));

	function start(all = false) {
		queue = all
			? [...pool]
					.sort((a, b) => (player.progress[a.id]?.box ?? 0) - (player.progress[b.id]?.box ?? 0))
					.slice(0, 20)
			: session(pool, player.progress);
		size = queue.length;
		index = 0;
		firstTry = 0;
		missedOnce = new Set();
		started = true;
	}

	// Start once the saved cards have loaded
	$effect(() => {
		if (!started && pool.length) start();
	});

	const card = $derived(queue[index]);
	const finished = $derived(started && index >= queue.length);

	function answered(right: boolean) {
		if (!card) return;
		const repeat = missedOnce.has(card.id);
		if (right && !repeat) firstTry += 1;
		// Only the first answer in a session counts toward the card's schedule
		if (!repeat) player.answer(card, right);
		if (!right && !repeat) {
			missedOnce = new Set([...missedOnce, card.id]);
			queue = [...queue, card]; // try it again at the end
		}
	}
</script>

<svelte:head>
	<title>Review · Skill Issue</title>
</svelte:head>

<section class="flex flex-col gap-5">
	<a
		href={resolve('/u/[username]/blunders', { username: page.params.username ?? '' })}
		class="btn self-start btn-sm hover:preset-tonal"
	>
		<ArrowLeft class="size-4" /> Blunders
	</a>

	{#if filter.label}
		<p class="-mt-2 text-sm text-muted">Drilling: <strong>{filterLabel(filter)}</strong></p>
	{/if}

	{#if !pool.length}
		<div class="flex flex-col items-start gap-3 card preset-filled-surface-100-900 p-5">
			<p>No cards yet. Check some games for blunders first.</p>
			<a
				href={resolve('/u/[username]/blunders', { username: page.params.username ?? '' })}
				class="btn preset-filled-primary-500">Find blunders</a
			>
		</div>
	{:else if started && !queue.length}
		<div class="flex flex-col items-start gap-3 card preset-filled-surface-100-900 p-5">
			<p class="font-semibold">All caught up. Nothing is due right now.</p>
			<button type="button" class="btn preset-filled-primary-500" onclick={() => start(true)}>
				<RotateCcw class="size-4" /> Practice anyway
			</button>
		</div>
	{:else if finished}
		<div class="flex flex-col items-start gap-3 card preset-filled-surface-100-900 p-5">
			<p class="flex items-center gap-2 h4">
				<PartyPopper class="size-6 text-primary-600-400" /> Session done
			</p>
			<p>
				{firstTry} of {size} right on the first try.
				{#if missedOnce.size}The {missedOnce.size} you missed will come back sooner.{/if}
			</p>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="btn preset-filled-primary-500" onclick={() => start()}>
					<RotateCcw class="size-4" /> Another round
				</button>
				<a
					href={resolve('/u/[username]/blunders', { username: page.params.username ?? '' })}
					class="btn preset-tonal">Back to cards</a
				>
			</div>
		</div>
	{:else if card}
		<Progress value={index} max={queue.length} class="flex flex-col gap-1.5">
			<Progress.Label class="text-sm text-muted">
				{#if index < size}
					Card {index + 1} of {size}
				{:else}
					Second try: {index - size + 1} of {queue.length - size}
				{/if}
			</Progress.Label>
			<Progress.Track class="h-2">
				<Progress.Range class="bg-primary-500 transition-[width] duration-300" />
			</Progress.Track>
		</Progress>

		{#key `${index}:${card.id}`}
			<CardDrill {card} onanswer={answered} onnext={() => (index += 1)} />
		{/key}
	{/if}
</section>
