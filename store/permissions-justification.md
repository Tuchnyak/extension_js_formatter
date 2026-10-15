# Permission justification (draft)

Where it goes: Chrome Web Store dashboard → Privacy practices → the justification field for each permission.
Each section below is the text for one field. The permissions are exactly those in the manifest of version 1.0.0.

## contextMenus

Adds one item, "Format selected JSON", to the right-click menu when text is selected. Clicking it opens the selected text in the extension's viewer page, formatted. The menu is not used for anything else.

## storage

- Saves two settings on the user's device in chrome.storage.local: the chosen theme (system, light or dark) and the on/off state of automatic formatting.
- Uses chrome.storage.session to hand the text selected through the context menu to the viewer tab. The viewer reads it and deletes it immediately; it is held in memory only and is never written to disk or sent anywhere.

## Host access: content script on all URLs ("Read and change all your data on all websites")

The extension formats JSON responses that the user opens directly in a tab (for example an API URL). A JSON response can be served from any host, including APIs and local development servers, so the set of sites cannot be known in advance and cannot be limited to a list.

What the content script does:
- It runs at document end in the top frame only.
- Its first action is to check the document's content type. If it is not application/json, text/json or a +json type, it exits at once. It does not read the page, store anything, or contact anything.
- On a JSON document it reads the text that the browser already displays, parses and renders it locally, and replaces the page with the formatted view. The text never leaves the page.

Why narrower access does not work: activeTab would require the user to click the extension on every JSON page, which removes the purpose of automatic formatting; no URL pattern can match "responses that happen to be JSON". The user can switch automatic formatting off at any time in the viewer, and can use Chrome's site access controls for the extension.

No remote code is loaded, and the extension makes no network requests.
