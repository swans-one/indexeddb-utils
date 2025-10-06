# IndexedDB Utils

**Snapshot and restore** for developers using indexeddb.

This Firefox Add-on gives you a tool to managed indexeddb databases
that is particularly useful during development:

- View info about databases, objectStores, indexes and record counts
  on a given site.
- Take snapshots of the data in an IndexedDB database
- Delete an IndexedDB database
- Clear data from an IndexedDB database
- Restore snapshots back to the database.

![Screenshot of the IndexedDB Utils extension popup, showing the interface being used on the Mozilla Developer Network homepage.](/assets/IndexedDB-Utils-2025-10-01.png)

Get the Firefox Add-on here: https://addons.mozilla.org/en-US/firefox/addon/indexeddb-utils/

# Snapshot, Delete, Restore

The *Snapshot -> Delete -> Restore* workflow is especially useful
during the development of IndexedDB version upgrades.

The problem: IndexedDB ships with a built in method for updating
client schemas:
[`onupgradeneeded`](https://developer.mozilla.org/en-US/docs/Web/API/IDBOpenDBRequest/upgradeneeded_event). However,
it doesn't have a built-in way to downgrade schema versions. During
development this can mean it's easy to end up in a state where your
local indexeddb database is upgraded to a version with bugs, and you
have no easy way to fix it.

The solution, using the IndexedDB Utils extension:

1. Take a snapshot of the database
2. Write your version update code
3. Test your version update. If it works great! Otherwise:
4. Delete the DB, rollback your code changes, and reload the page
5. Restore the data you had in your local database, and go back to (2)

# Privacy / Security

All snapshots are kept in an extension-managed IndexedDB database
within your browser. This means that your snapshot data never leaves
your browser.

This extension does not use any third party libraries and does not
itself make any fetch requests.

# License

This project is licensed under the GPLv3. See COPYING for more
details.

# Contributing

If you would like to contribute see Contributing.md for more
details. Before making a pull request, please first open an issue to
discuss.
