# Contributing

If you'd like to contribute to this project, please first raise an
issue proposing your contribution before creating a pull request.

In contributing code you must be able to provide that code under the
GPLv3 License (As specified in the COPYING file).

For any files modified, please add your name to the copyright notice
at the top of the file, E.g.:

```
   Copyright (C)
       2025 Erik Swanson
       20XX <YOUR NAME>
```

Additionally, add you name and email to `Contributors.txt`.

# TODOS

The following are potential improvements for this
extension. Contributions on these features / improvements would be
appreciated.

**Broad Todos**

- [ ] Compatability with Chrome / Manifest v3

**UI / UX improvements**

- [ ] "Restore latest" button for databases
- [ ] Ability to view / browse records (maybe just a sample of records)
- [ ] More info on indexes: column name, uniqueness, autoincrement info, multi-index
  - Consider the format used in
    [Dexie's Schema Definitions](https://dexie.org/docs/Version/Version.stores()#detailed-schema-syntax)
- [ ] Toggle filtering from just the current orgin to all origins and
      back
- [ ] General UI structure / design improvements

**Code Improvements**

- [ ] Improved error handling during indexeddb operations
- [ ] Fix "processing" state implemented for DB "delete" action not
      persistent after closing / reopening extension.
      - Potential fix: create a core function to do processing, add it
        to a bunch of async processes. But add a "debounce" so it only
        shows the message if processing takes longer than XXms.
- [ ] Improve performance of indexeddb delete operations
  - Follow up on https://bugzilla.mozilla.org/show_bug.cgi?id=1878312
    even though it's marked as resolved, it seems there's been a
    regression
- [ ] Testing
  - [ ] Automated tests
  - [ ] More manual tests / examples
- [ ] Logging
  - [ ] Clean up existing logging
  - [ ] Create a more structured logging implementation
