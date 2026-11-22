<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { CircleCheck, Puzzle, Sparkles } from '@lucide/svelte';
	import { CATEGORIES, CONCEPTS, type Category } from '$lib/data/library';
	import { library } from '$lib/library.svelte';

	// Chess ideas every player should know, grouped by kind, with a quiz to drill them
	const category = $derived.by(() => {
		const c = page.url.searchParams.get('category');
		return c && c in CATEGORIES ? (c as Category) : undefined;
	});
	let query = $state('');

	const shown = $derived(
		CONCEPTS.filter(
			(c) =>
				(!category || c.category === category) &&
				(!query.trim() ||
					`${c.name} ${c.summary}`.toLowerCase().includes(query.trim().toLowerCase()))
		)
	);
	const learnedCount = $derived(CONCEPTS.filter((c) => library.learned(c.id)).length);

	function pick(next?: Category) {
		const url = resolve('/library') + (next ? `?category=${next}` : '');
		// eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved above, plus a query
		goto(url, { replaceState: true, keepFocus: true, noScroll: true });
	}

	const quizHref = $derived(resolve('/library/quiz') + (category ? `?category=${category}` : ''));
	const categories = Object.entries(CATEGORIES) as [Category, (typeof CATEGORIES)[Category]][];
</script>

<svelte:head>
	<title>Library · Skill Issue</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
	<header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
		<div class="flex flex-col gap-1">
			<h1 class="h2">Library</h1>
			<p class="text-muted">
				{CONCEPTS.length} ideas every player should know. {learnedCount} learned so far.
			</p>
		</div>
		<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- resolved, plus a query -->
		<a href={quizHref} class="btn self-start preset-filled-primary-500 btn-lg sm:self-auto">
			<Sparkles class="size-5" /> Quiz me{category ? ` on ${CATEGORIES[category].label}` : ''}
		</a>
	</header>

	<div class="flex flex-col gap-3">
		<div class="flex flex-wrap gap-2" role="group" aria-label="Category">
			<button
				type="button"
				class="chip {!category ? 'preset-filled-primary-500' : 'preset-tonal'}"
				aria-pressed={!category}
				onclick={() => pick()}>All</button
			>
			{#each categories as [id, info] (id)}
				<button
					type="button"
					class="chip {category === id ? 'preset-filled-primary-500' : 'preset-tonal'}"
					aria-pressed={category === id}
					onclick={() => pick(id)}>{info.label}</button
				>
			{/each}
		</div>
		<input
			class="input max-w-sm"
			type="search"
			placeholder="Search, e.g. fork"
			aria-label="Search the library"
			bind:value={query}
		/>
		{#if category}
			<p class="text-sm text-muted">{CATEGORIES[category].about}</p>
		{/if}
	</div>

	{#if shown.length}
		<ul class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each shown as concept (concept.id)}
				<li>
					<a
						href={resolve('/library/[id]', { id: concept.id })}
						class="flex h-full flex-col gap-2 card preset-filled-surface-100-900 p-4 transition-colors hover:preset-filled-surface-200-800"
					>
						<div class="flex items-start justify-between gap-2">
							<h2 class="font-semibold">{concept.name}</h2>
							{#if library.learned(concept.id)}
								<CircleCheck class="size-5 shrink-0 text-success-600-400" aria-label="Learned" />
							{/if}
						</div>
						<p class="text-sm text-muted">{concept.summary}</p>
						<div class="mt-auto flex flex-wrap gap-1.5 pt-1">
							<span class="chip preset-tonal text-xs">{CATEGORIES[concept.category].label}</span>
							{#if concept.puzzle}
								<span class="chip preset-tonal-primary text-xs"
									><Puzzle class="size-3" /> Puzzle</span
								>
							{/if}
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="card preset-filled-surface-100-900 p-5 text-muted">Nothing matches “{query}”.</p>
	{/if}
</main>
