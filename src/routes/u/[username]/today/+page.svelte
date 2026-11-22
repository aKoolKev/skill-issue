<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Progress } from '@skeletonlabs/skeleton-svelte';
	import { BookOpen, Cpu, Flame, Layers, LoaderCircle, PartyPopper, Play } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import { buildSession, currentStreak, doneToday, type Step } from '$lib/daily';
	import CardDrill from '$lib/components/CardDrill.svelte';
	import LessonPlayer from '$lib/components/LessonPlayer.svelte';

	// Today's session: a handful of due blunder cards with an opening line or two mixed in.
	// Finishing it counts toward the streak.
	let steps = $state<Step[]>([]);
	let index = $state(0);
	let started = $state(false);
	let cardsRight = $state(0);
	let linesClean = $state(0);
	let lineDone = $state(false);

	const username = $derived(page.params.username ?? '');
	const plan = $derived(
		buildSession(player.cards, player.progress, player.openings, player.linesProgress)
	);
	const planCards = $derived(plan.filter((s) => s.kind === 'card').length);
	const planLines = $derived(plan.length - planCards);
	/** About a minute a card and two a line */
	const minutes = $derived(Math.max(1, planCards + planLines * 2));
	const streak = $derived(currentStreak(player.streak));
	const step = $derived(steps[index]);
	const doneCards = $derived(steps.filter((s) => s.kind === 'card').length);
	const doneLines = $derived(steps.length - doneCards);
	const finished = $derived(started && index >= steps.length);
	const ready = $derived(player.status === 'ready' && player.book);

	function start() {
		steps = plan;
		index = 0;
		cardsRight = 0;
		linesClean = 0;
		lineDone = false;
		started = true;
	}

	function next() {
		lineDone = false;
		index += 1;
		if (index >= steps.length) player.finishDay();
	}

	const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
</script>

<svelte:head>
	<title>Today · Skill Issue</title>
</svelte:head>

<section class="flex flex-col gap-5">
	{#if !started}
		<div class="flex flex-col gap-4 card preset-filled-surface-100-900 p-5">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<h2 class="h4">Today’s session</h2>
				<span
					class="badge flex items-center gap-1.5 text-sm {streak
						? 'preset-tonal-warning'
						: 'preset-tonal'}"
				>
					<Flame class="size-4" />
					{streak ? `${plural(streak, 'day')} in a row` : 'No streak yet'}
				</span>
			</div>
			<p class="text-muted">
				A few minutes a day beats an hour once a month. Each session mixes the blunder cards that
				are due with the opening lines that cost you the most.
			</p>

			{#if !ready}
				<p class="flex items-center gap-2 text-muted">
					<LoaderCircle class="size-4 animate-spin" /> Loading your games…
				</p>
			{:else if !plan.length}
				<p class="font-semibold">
					{doneToday(player.streak)
						? 'Done for today. Come back tomorrow to keep the streak going.'
						: 'Nothing is due right now.'}
				</p>
			{:else}
				<ul class="flex flex-wrap gap-2 text-sm">
					{#if planCards}
						<li class="chip flex items-center gap-1.5 preset-tonal">
							<Layers class="size-4" />
							{plural(planCards, 'blunder card')}
						</li>
					{/if}
					{#if planLines}
						<li class="chip flex items-center gap-1.5 preset-tonal">
							<BookOpen class="size-4" />
							{plural(planLines, 'opening line')}
						</li>
					{/if}
					<li class="chip preset-tonal">About {minutes} min</li>
				</ul>
				<button
					type="button"
					class="btn self-start preset-filled-primary-500 btn-lg"
					onclick={start}
				>
					<Play class="size-5" />
					{doneToday(player.streak) ? 'Practice again' : 'Start'}
				</button>
			{/if}

			{#if ready && !player.cards.length}
				<div class="flex flex-wrap items-center gap-3 border-t border-surface-200-800 pt-4 text-sm">
					<p class="flex-1 text-muted">
						No blunder cards yet, so today is openings only. Let Stockfish check your games to add
						cards.
					</p>
					<a href={resolve('/u/[username]/blunders', { username })} class="btn preset-tonal btn-sm">
						<Cpu class="size-4" /> Find blunders
					</a>
				</div>
			{/if}
		</div>
	{:else if finished}
		<div class="flex flex-col items-start gap-3 card preset-filled-surface-100-900 p-5">
			<p class="flex items-center gap-2 h4">
				<PartyPopper class="size-6 text-primary-600-400" /> Done for today
			</p>
			<p>
				{#if doneCards}{cardsRight} of {doneCards} cards right.{/if}
				{#if doneLines}{linesClean} of {doneLines} lines with no mistakes.{/if}
			</p>
			<p class="flex items-center gap-1.5 font-semibold text-warning-700-300">
				<Flame class="size-5" />
				{plural(currentStreak(player.streak), 'day')} in a row
			</p>
			<div class="flex flex-wrap gap-2">
				<a href={resolve('/u/[username]/blunders', { username })} class="btn preset-tonal"
					>Your blunders</a
				>
				<a href={resolve('/u/[username]', { username })} class="btn preset-tonal">Your openings</a>
			</div>
		</div>
	{:else if step}
		<Progress value={index} max={steps.length} class="flex flex-col gap-1.5">
			<Progress.Label class="text-sm text-muted">Step {index + 1} of {steps.length}</Progress.Label>
			<Progress.Track class="h-2">
				<Progress.Range class="bg-primary-500 transition-[width] duration-300" />
			</Progress.Track>
		</Progress>

		{#key index}
			{#if step.kind === 'card'}
				{@const card = step.card}
				<CardDrill
					{card}
					onanswer={(right) => {
						player.answer(card, right);
						if (right) cardsRight += 1;
					}}
					onnext={next}
				/>
			{:else}
				{@const { line, color } = step}
				<div class="flex flex-col gap-1">
					<p class="text-sm text-muted">
						Opening practice · {line.family} as {color === 'white' ? 'White' : 'Black'}
					</p>
					<h2 class="h4">{line.variation}</h2>
					<p class="text-sm text-muted">Play your side of the line from memory.</p>
				</div>
				<LessonPlayer
					{line}
					{color}
					startMode="practice"
					onfinish={(mistakes) => {
						if (lineDone) return; // only the first run counts
						player.answerLine(color, line.id, mistakes === 0);
						if (mistakes === 0) linesClean += 1;
						lineDone = true;
					}}
				/>
				<div class="flex flex-wrap gap-2">
					<button
						type="button"
						class="btn preset-filled-primary-500"
						disabled={!lineDone}
						onclick={next}
					>
						Next
					</button>
					{#if !lineDone}
						<button type="button" class="btn preset-tonal" onclick={next}>Skip</button>
					{/if}
				</div>
			{/if}
		{/key}
	{/if}
</section>
