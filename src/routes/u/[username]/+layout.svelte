<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import { Avatar } from '@skeletonlabs/skeleton-svelte';
	import { BookOpen, ExternalLink, Layers, LoaderCircle, RotateCw } from '@lucide/svelte';
	import { player } from '$lib/player.svelte';
	import SearchForm from '$lib/components/SearchForm.svelte';

	let { children } = $props();

	const username = $derived(page.params.username ?? '');
	$effect(() => {
		player.open(username);
	});

	const tabs = $derived([
		{
			label: 'Openings',
			href: resolve('/u/[username]', { username }),
			icon: BookOpen,
			active: !/\/(blunders|review)/.test(page.url.pathname)
		},
		{
			label: 'Blunders',
			href: resolve('/u/[username]/blunders', { username }),
			icon: Layers,
			active: /\/(blunders|review)/.test(page.url.pathname)
		}
	]);

	const RATINGS = ['rapid', 'blitz', 'bullet', 'daily'] as const;
</script>

<svelte:head>
	<title>{player.profile?.username ?? username} · Skill Issue</title>
</svelte:head>

<main class="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
	{#if player.status === 'missing'}
		<section class="flex max-w-lg flex-col gap-4 card preset-filled-surface-100-900 p-5">
			<h1 class="h4">No chess.com player called “{username}”</h1>
			<p class="text-muted">Check the spelling and try again.</p>
			<SearchForm />
		</section>
	{:else if player.status === 'error'}
		<section
			class="flex max-w-lg flex-col items-start gap-3 card preset-filled-surface-100-900 p-5"
		>
			<h1 class="h4">Couldn’t load {username}</h1>
			<p class="text-muted">{player.error}. chess.com may be busy; try again in a moment.</p>
			<button
				type="button"
				class="btn preset-filled-primary-500"
				onclick={() => player.open(username)}
			>
				<RotateCw class="size-4" /> Try again
			</button>
		</section>
	{:else}
		<!-- Who this is, their ratings, and how many games are loaded -->
		<header class="flex flex-wrap items-center gap-4">
			<Avatar class="size-14 shrink-0">
				{#if player.profile?.avatar}
					<Avatar.Image src={player.profile.avatar} alt="" />
				{/if}
				<Avatar.Fallback>{username.slice(0, 2).toUpperCase()}</Avatar.Fallback>
			</Avatar>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<h1 class="flex flex-wrap items-center gap-2 h3">
					{#if player.profile?.title}
						<span class="badge preset-filled-warning-500 text-xs">{player.profile.title}</span>
					{/if}
					{player.profile?.username ?? username}
					{#if player.profile}
						<!-- eslint-disable svelte/no-navigation-without-resolve -- chess.com, not this app -->
						<a
							href={player.profile.url}
							target="_blank"
							rel="noreferrer"
							class="btn-icon btn-icon-sm hover:preset-tonal"
							aria-label="Open profile on chess.com"><ExternalLink class="size-4" /></a
						>
						<!-- eslint-enable svelte/no-navigation-without-resolve -->
					{/if}
				</h1>
				<div class="flex flex-wrap gap-2 text-sm">
					{#each RATINGS as kind (kind)}
						{#if player.ratings[kind]}
							<span class="badge preset-tonal capitalize">{kind} {player.ratings[kind]}</span>
						{/if}
					{/each}
				</div>
			</div>
			<p class="flex w-full items-center gap-2 text-sm text-muted sm:w-auto" aria-live="polite">
				{#if player.status === 'loading'}
					<LoaderCircle class="size-4 animate-spin" />
					{player.loadingLabel}
					{#if player.games.length}· {player.games.length} games{/if}
				{:else if player.status === 'ready'}
					{player.games.length} recent games
				{/if}
			</p>
		</header>

		<nav class="flex gap-1 border-b border-surface-200-800" aria-label="Sections">
			{#each tabs as tab (tab.label)}
				<a
					href={tab.href}
					aria-current={tab.active ? 'page' : undefined}
					class="-mb-px flex items-center gap-2 border-b-2 border-transparent px-4 py-2 font-medium text-muted hover:text-surface-950-50 aria-[current=page]:border-primary-500 aria-[current=page]:text-surface-950-50"
				>
					<tab.icon class="size-4" />
					{tab.label}
				</a>
			{/each}
		</nav>

		{@render children()}
	{/if}
</main>
