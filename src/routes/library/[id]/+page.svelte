<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { ArrowLeft, ChevronLeft, ChevronRight, CircleCheck } from '@lucide/svelte';
	import { byId, CATEGORIES, CONCEPTS, parseMark } from '$lib/data/library';
	import { library } from '$lib/library.svelte';
	import Board from '$lib/components/Board.svelte';
	import ConceptPuzzle from '$lib/components/ConceptPuzzle.svelte';

	// One idea: what it is, an example, and a puzzle to try when there is one
	const concept = $derived(byId.get(page.params.id ?? ''));
	const siblings = $derived(CONCEPTS.filter((c) => c.category === concept?.category));
	const at = $derived(siblings.findIndex((c) => c.id === concept?.id));
	const prev = $derived(siblings[at - 1]);
	const next = $derived(siblings[at + 1]);
	const orientation = (fen: string) => (fen.split(' ')[1] === 'b' ? 'black' : 'white');
</script>

<svelte:head>
	<title>{concept?.name ?? 'Library'} · Skill Issue</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
	<!-- eslint-disable svelte/no-navigation-without-resolve -- resolved, plus a query -->
	<a
		href={resolve('/library') + (concept ? `?category=${concept.category}` : '')}
		class="btn self-start btn-sm hover:preset-tonal"
	>
		<ArrowLeft class="size-4" /> Library
	</a>
	<!-- eslint-enable svelte/no-navigation-without-resolve -->

	{#if !concept}
		<p class="card preset-filled-surface-100-900 p-5">Couldn’t find that one.</p>
	{:else}
		<header class="flex flex-col gap-2">
			<div class="flex flex-wrap items-center gap-2">
				<span class="chip preset-tonal text-xs">{CATEGORIES[concept.category].label}</span>
				{#if library.learned(concept.id)}
					<span class="chip preset-tonal-success text-xs"
						><CircleCheck class="size-3" /> Learned</span
					>
				{/if}
			</div>
			<h1 class="h2">{concept.name}</h1>
			<p class="text-lg text-balance">{concept.summary}</p>
		</header>

		<div class="flex max-w-prose flex-col gap-3 text-muted">
			{#each concept.body as paragraph, i (i)}
				<p>{paragraph}</p>
			{/each}
		</div>

		{#if concept.diagram}
			<figure class="flex max-w-md flex-col gap-2">
				<Board
					fen={concept.diagram.fen}
					orientation={orientation(concept.diagram.fen)}
					arrows={(concept.diagram.marks ?? []).map(parseMark)}
				/>
				<figcaption class="text-sm text-muted">{concept.diagram.caption}</figcaption>
			</figure>
		{/if}

		{#if concept.puzzle}
			<section class="flex flex-col gap-3">
				<h2 class="h4">Try it</h2>
				{#key concept.id}
					<ConceptPuzzle
						puzzle={concept.puzzle}
						onresult={(right) => library.answer(concept.id, right)}
					/>
				{/key}
			</section>
		{/if}

		<nav class="flex flex-wrap justify-between gap-2 border-t border-surface-200-800 pt-4">
			{#if prev}
				<a href={resolve('/library/[id]', { id: prev.id })} class="btn hover:preset-tonal">
					<ChevronLeft class="size-4" />
					{prev.name}
				</a>
			{:else}
				<span></span>
			{/if}
			{#if next}
				<a href={resolve('/library/[id]', { id: next.id })} class="btn hover:preset-tonal">
					{next.name}
					<ChevronRight class="size-4" />
				</a>
			{/if}
		</nav>
	{/if}
</main>
