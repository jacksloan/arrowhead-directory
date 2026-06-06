<script lang="ts">
	import {
		Accordion,
		AccordionItem,
		AccordionTrigger,
		AccordionContent
	} from '$lib/components/ui/accordion/index.js';
</script>

<svelte:head>
	<title>FAQ — Arrowhead Directory</title>
</svelte:head>

<div class="mx-auto max-w-prose">
	<h1 class="mb-2 text-2xl font-bold">Frequently Asked Questions</h1>
	<p class="mb-8 text-sm text-muted-foreground">
		Everything you need to know about finding and managing business listings.
	</p>

	<Accordion type="multiple" class="rounded-lg border">
		<AccordionItem value="sign-in">
			<AccordionTrigger class="px-5">How do I sign in?</AccordionTrigger>
			<AccordionContent class="px-5">
				<p>Click the person icon in the top-right corner, enter your email address, then click <strong>Send link</strong>. You'll receive a magic link in your inbox — click it and you're signed in automatically.</p>
				<p>No password required, ever. The link is valid for 24 hours. Check your spam folder if it doesn't arrive within a few minutes.</p>
			</AccordionContent>
		</AccordionItem>

		<AccordionItem value="no-password">
			<AccordionTrigger class="px-5">Do I need to create an account or password?</AccordionTrigger>
			<AccordionContent class="px-5">
				<p>No. Arrowhead Directory uses passwordless sign-in — just your email address. There's nothing to sign up for and nothing to remember.</p>
			</AccordionContent>
		</AccordionItem>

		<AccordionItem value="edit-listing">
			<AccordionTrigger class="px-5">How do I edit my business listing?</AccordionTrigger>
			<AccordionContent class="px-5">
				<p>Sign in using the email address that appears on your listing. Once signed in, find your business in the directory — an <strong>Edit listing</strong> button will appear inside your business card. Click it to update your name, phone number, website, address, description, and services. Changes appear immediately.</p>
			</AccordionContent>
		</AccordionItem>

		<AccordionItem value="claim-listing">
			<AccordionTrigger class="px-5">How does the directory know which listing is mine?</AccordionTrigger>
			<AccordionContent class="px-5">
				<p>Your listing is matched to your email address. When you sign in, the directory compares your email to the one on file for each business. If they match, the edit controls appear for that listing.</p>
				<p>If your listing has a different email address on it, <a href="/about">contact the admin</a> to get it corrected.</p>
			</AccordionContent>
		</AccordionItem>

		<AccordionItem value="not-listed">
			<AccordionTrigger class="px-5">My business isn't in the directory — how do I get added?</AccordionTrigger>
			<AccordionContent class="px-5">
				<p>Reach out to the admin on the <a href="/about">About page</a>. Once your listing is created with your email address, you can sign in and manage it yourself.</p>
			</AccordionContent>
		</AccordionItem>

		<AccordionItem value="what-can-edit">
			<AccordionTrigger class="px-5">What information can I update on my listing?</AccordionTrigger>
			<AccordionContent class="px-5">
				<p>You can update your business name, phone numbers, website, address, and description. If your category or services list needs to change, contact the admin.</p>
			</AccordionContent>
		</AccordionItem>

		<AccordionItem value="magic-link-expired">
			<AccordionTrigger class="px-5">My magic link expired or didn't work — what do I do?</AccordionTrigger>
			<AccordionContent class="px-5">
				<p>Magic links are valid for 24 hours and can only be used once. If yours expired or didn't work, just request a new one from the sign-in screen. Make sure to open the most recent email if you requested the link more than once.</p>
			</AccordionContent>
		</AccordionItem>
	</Accordion>
</div>
