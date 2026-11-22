<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Progress } from '@skeletonlabs/skeleton-svelte';
	import { ArrowLeft, ArrowRight, Check, PartyPopper, RotateCcw, X } from '@lucide/svelte';
	import { CATEGORIES, type Category, type Concept } from '$lib/data/library';
	import { buildQuiz, library, type Question } from '$lib/library.svelte';
	import ConceptPuzzle from '$lib/components/ConceptPuzzle.svelte';

	// Ten questions mixing three kinds: pick the name for a definition, pick the definition for
	// a name, or solve the concept's puzzle. ?category= keeps it to one category.
	const category = $derived.by(() => {
		const c = page.url.searchParams.get('category');
		return c && c in CATEGORIES ? (c as Category) : undefined;
	});

	let questions = $state<Question[]>([]);
	let index = $state(0);
	let picked = $state<string | null>(null);
	let solved = $state<boolean | null>(null);
	let results = $state<{ concept: Concept; right: boolean }[]>([]);

	function start() {
		questions = buildQuiz(library.progress, category);
		index = 0;
		picked = null;
		solved = null;
		results = [];
	}

	// A new quiz when the category changes (not when answers update the progress)
	$effect(() => {
		void category;
		untrack(start);
	});

	const question = $derived(questions[index]);
	const finished = $derived(questions.length > 0 && index >= questions.length);
	const answered = $derived(picked !== null || solved !== null);
	const score = $derived(results.filter((r) => r.right).length);

	function record(right: boolean) {
		library.answer(question.concept.id, right);
		results = [...results, { concept: question.concept, right }];
	}

	function choose(option: Concept) {
		if (answered) return;
		picked = option.id;
		record(option.id === question.concept.id);
	}

	function next() {
		index += 1;
		picked = null;
		solved = null;
	}

	const optionClass = (option: Concept) => {
		if (!answered) return 'preset-tonal hover:preset-filled-surface-200-800';
		if (option.id === question.concept.id) return 'preset-tonal-success';
		if (option.id === picked) return 'preset-tonal-error';
		return 'preset-tonal opacity-60';
	};
</script>

<svelte:head>
	<title>Quiz · Library · Skill Issue</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-8">
	<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved, plus a query -->
	<a
		href={resolve('/library') + (category ? `?category=${category}` : '')}
		class="btn self-start btn-sm hover:preset-tonal"
	>
		<ArrowLeft class="size-4" /> Library
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	{#if finished}
		<section class="flex flex-col items-start gap-4 card preset-filled-surface-100-900 p-5">
			<p class="flex items-center gap-2 h4">
				<PartyPopper class="size-6 text-primary-600-400" />
				{score} of {results.length} right
			</p>
			{#if results.some((r) => !r.right)}
				<div class="flex flex-col gap-2">
					<p class="text-sm text-muted">Worth a reread (they’ll come back sooner):</p>
					<ul class="flex flex-wrap gap-2">
						{#each results.filter((r) => !r.right) as { concept } (concept.id)}
							<li>
								<a href={resolve('/library/[id]', { id: concept.id })} class="chip preset-tonal"
									>{concept.name}</a
								>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			<button type="button" class="btn preset-filled-primary-500" onclick={start}>
				<RotateCcw class="size-4" /> Another round
			</button>
		</section>
	{:else if question}
		<Progress value={index} max={questions.length} class="flex flex-col gap-1.5">
			<Progress.Label class="text-sm text-muted">
				Question {index + 1} of {questions.length}{category
					? ` · ${CATEGORIES[category].label}`
					: ''}
			</Progress.Label>
			<Progress.Track class="h-2">
				<Progress.Range class="bg-primary-500 transition-[width] duration-300" />
			</Progress.Track>
		</Progress>

		{#key index}
			{#if question.kind === 'puzzle' && question.concept.puzzle}
				<section class="flex flex-col gap-3">
					<h1 class="h4">Puzzle: {question.concept.name}</h1>
					<ConceptPuzzle
						puzzle={question.concept.puzzle}
						onresult={(right) => {
							solved = right;
							record(right);
						}}
					/>
				</section>
			{:else if question.kind !== 'puzzle'}
				<section class="flex max-w-2xl flex-col gap-4">
					<p class="text-sm text-muted">
						{question.kind === 'name' ? 'What’s this called?' : 'What does this mean?'}
					</p>
					<h1 class="h3 text-balance">
						{question.kind === 'name' ? question.concept.summary : question.concept.name}
					</h1>
					<ul class="flex flex-col gap-2">
						{#each question.options as option (option.id)}
							<li>
								<button
									type="button"
									class="btn h-auto w-full justify-start py-3 text-left whitespace-normal {optionClass(
										option
									)}"
									disabled={answered}
									onclick={() => choose(option)}
								>
									{#if answered && option.id === question.concept.id}
										<Check class="size-4 shrink-0" />
									{:else if answered && option.id === picked}
										<X class="size-4 shrink-0" />
									{/if}
									{question.kind === 'name' ? option.name : option.summary}
								</button>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		{/key}

		{#if answered}
			<div class="flex max-w-2xl flex-col gap-3">
				{#if question.kind !== 'puzzle'}
					<p class="text-sm text-muted">{question.concept.body[0]}</p>
				{/if}
				<div class="flex flex-wrap items-center gap-2">
					<button type="button" class="btn preset-filled-primary-500" onclick={next}>
						{index + 1 < questions.length ? 'Next' : 'See results'}
						<ArrowRight class="size-4" />
					</button>
					<a
						href={resolve('/library/[id]', { id: question.concept.id })}
						class="btn hover:preset-tonal">Read about {question.concept.name}</a
					>
				</div>
			</div>
		{/if}
	{/if}
</main>
