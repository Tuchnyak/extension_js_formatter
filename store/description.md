# Store description (draft)

Where it goes: Chrome Web Store dashboard → Store listing → Description.
Plain text, paste as is. Everything below the line is the text.

---

Curly shows JSON as a readable, collapsible tree. Everything happens on your computer: the extension works offline, makes no network requests and is open source.

Three ways to use it

1. Open a JSON response in a tab (an API URL, a local server) and it is formatted automatically.
2. Click the toolbar icon to open the viewer, paste JSON and press Format (Ctrl/Cmd+Enter).
3. Select JSON text on any web page, right-click and choose "Format selected JSON".

What you get

- Colored syntax with indentation guides; collapse and expand any node with the mouse or the keyboard.
- Expand all and Collapse all.
- Raw and Parsed views: the original text is always one click away.
- Clickable http and https links inside string values.
- Light, dark or system theme, remembered between sessions.
- Clear errors for invalid JSON: the message, the line and column, and a marker under the exact character.
- An on/off switch for automatic formatting of JSON pages, in the viewer.

Privacy

- No network requests, no analytics, no tracking, no accounts.
- Nothing you view is saved or sent anywhere. Only two settings are kept on your device: the theme and the auto-format switch. (Text selected through the right-click menu is held in memory just until the viewer opens it.)
- No third-party code or services; the source code is public.

About the "all websites" permission

To format a JSON page automatically, the extension has to run on pages you open, so Chrome shows the warning "Read and change all your data on all websites". On every page that is not a JSON document the extension stops immediately and does not read the page. You can turn automatic formatting off in the viewer.

Good to know

- Automatic formatting applies to responses served as application/json, text/json or any +json type. JSON served as plain text is not detected; paste it into the viewer instead.
- Very large JSON is handled carefully: above about 2 MB the extension asks before formatting (it can take several seconds per MB), and above 10 MB it shows the raw text only.
- For local files (file://) turn on "Allow access to file URLs" for the extension in chrome://extensions.
- The interface is in English. Requires Chrome 123 or newer.

Source code and license

Curly is free software under the GNU General Public License version 3. The source code is at https://github.com/Tuchnyak/extension_js_formatter. The extension package includes the license and the notices for the third-party components it contains (WXT, MIT license).
