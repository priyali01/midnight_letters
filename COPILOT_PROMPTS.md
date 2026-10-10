# GitHub Copilot prompt sequence

Use these prompts in GitHub Copilot Chat while the project is open. They are a suggested sequence, not a claim that Copilot has already generated or changed the code. Adapt them to what you actually do and record the real interaction in `COPILOT_LOG.md`.

## Prompt 1 — Understand the project

> Explain how this Midnight Letters app works. Walk me through the HTML structure, CSS layout, and JavaScript data flow. Do not change any files yet. Point out the main functions and how localStorage is used.

## Prompt 2 — Review the user experience

> Review this app for usability and accessibility. Focus on keyboard navigation, visible focus, form validation, mobile layout, and whether the privacy explanation is accurate. List the most important improvements before editing anything.

## Prompt 3 — Make one focused improvement

> Implement the highest-priority accessibility improvement you identified. Keep the current visual style and avoid adding a framework or dependencies. Explain each change you make.

## Prompt 4 — Add a feature

> Add a search box that filters the saved letters by title, body text, and mood. Keep the feature in vanilla JavaScript, make the empty state clear, and ensure the filter works after saving or deleting a letter. Explain how I can test it.

## Prompt 5 — Test edge cases

> Review the JavaScript for edge cases: malformed localStorage data, empty letters, long titles, failed storage writes, and exporting text. Identify bugs and suggest small fixes. Do not rewrite unrelated code.

## Prompt 6 — Prepare for publishing

> Check this project as if it will be submitted for a beginner-friendly coding challenge. Give me a manual test checklist, confirm the README run steps are clear, and list any claims in the README that I should verify myself. Do not invent test results.

## Suggested manual test checklist

- [ ] Open `index.html` in a desktop browser.
- [ ] Open the page at a narrow/mobile width.
- [ ] Rotate writing prompts several times.
- [ ] Select each mood and verify the active state changes.
- [ ] Try submitting an empty letter.
- [ ] Save a letter and refresh the page; verify it remains.
- [ ] Download one letter and open the text file.
- [ ] Export all letters.
- [ ] Delete a letter and verify it is gone after refresh.
- [ ] Use the keyboard to reach and activate the form controls.

Only mark checks as complete after you run them yourself.
