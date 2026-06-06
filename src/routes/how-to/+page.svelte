<svelte:head>
	<title>How-To — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-prose">
	<h1 class="mb-6 text-2xl font-bold">How-To</h1>

	<div class="flex flex-col gap-8">
		<!-- Logging in -->
		<section class="rounded-lg border p-6">
			<h2 class="mb-3 text-lg font-semibold">Logging In</h2>
			<p class="mb-4 text-sm text-muted-foreground">
				Arrowhead Directory uses passwordless sign-in. There's nothing to create or remember — just
				your email address.
			</p>
			<ol class="flex flex-col gap-3 text-sm text-muted-foreground">
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">1</span>
					<span>Click the person icon in the top-right corner of any page.</span>
				</li>
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">2</span>
					<span>Enter your email address and click <strong class="text-foreground">Send link</strong>.</span>
				</li>
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">3</span>
					<span>Open your email and click the magic link. It's valid for 24 hours.</span>
				</li>
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">4</span>
					<span>You'll be signed in automatically and returned to the directory.</span>
				</li>
			</ol>
			<p class="mt-4 text-xs text-muted-foreground">
				Check your spam folder if the email doesn't arrive within a few minutes.
			</p>
		</section>

		<!-- Claiming / editing a listing -->
		<section class="rounded-lg border p-6">
			<h2 class="mb-3 text-lg font-semibold">Managing Your Business Listing</h2>
			<p class="mb-4 text-sm text-muted-foreground">
				If your business is already in the directory, you can claim it and keep your information
				up to date. Your listing is matched to your email address.
			</p>
			<ol class="flex flex-col gap-3 text-sm text-muted-foreground">
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">1</span>
					<span>Sign in using the email address that appears on your business listing.</span>
				</li>
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">2</span>
					<span>Find your business in the directory. An <strong class="text-foreground">Edit</strong> button will appear next to your listing.</span>
				</li>
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">3</span>
					<span>Click <strong class="text-foreground">Edit</strong> to update your name, phone number, website, services, and more.</span>
				</li>
				<li class="flex gap-3">
					<span class="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">4</span>
					<span>Save your changes — they appear in the directory immediately.</span>
				</li>
			</ol>
		</section>

		<!-- Not in the directory -->
		<section class="rounded-lg border p-6">
			<h2 class="mb-3 text-lg font-semibold">Not Listed Yet?</h2>
			<p class="mb-4 text-sm text-muted-foreground">
				If your business isn't in the directory, reach out to the admin to get added. Once your
				listing is created with your email address, you can sign in and edit it yourself.
			</p>
			<a
				href="/about"
				class="text-sm text-primary underline-offset-4 hover:underline"
			>Contact the admin on the About page</a>
		</section>
	</div>
</div>
