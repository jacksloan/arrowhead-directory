# TODO

- [x] Add columns for phone numbers, e.g. phone_1, phone_1_type, phone_2, phone_2_type, etc. where type is a PG enum of (home, work, mobile, etc.)
  - Make a dropdown for phone number type such that phone number input and phone number type are flexed side by side
- [x] In the edit listing dialog, put website and phone numbers on their own lines
- [x] In the suggested edits page, it should show feedback when the reject/approve buttons are clicked and reload the suggested edits list
- [x] The email obfuscation in the list component should match what's in the card component (should look like a regular email to the user but be obfuscated)
- [x] Even though a business can technically belong to multiple categories, only let the user select 1 category in the category dropdown
- [x] Filters button should open services, categories is already handled by the accordion
- [x] Lookup suggestions approve/reject should show a loading status and refresh when the user clicks
- [x] Reload feature requests list when the user clicks approve/reject and show some loading indicator
- [ ] Directory toolbar redesign (split layout + Add Business button, mobile-friendly) — see docs/directory-toolbar-redesign.md
- [ ] Update FAQ, link is only valid for 1 hour
- [ ] Simplify "suggest an edit" to be simple JSON metadata with only changed fields so it doesn't clobber the existing data
- [ ] Edit business and suggest business dialog should use a shared form component
- [ ] Emails are not currently in the edit/suggest dialogs, need those added in a disabled state (admin can change an email)

## Deferred

- [ ] (deferred) Drop the legacy `businesses.phones text[]` column once structured phones are verified in production: `alter table public.businesses drop column phones;`
  - Note: 1 business ("Nace Hagemann", id 6c80a362-6842-427e-8c09-7b354a3d7513) had 3 numbers; its 3rd (218-491-5767) only lives in the legacy `phones` column and will be lost on drop.
