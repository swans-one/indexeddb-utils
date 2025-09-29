# IndexedDB Utils

IndexedDB provides a convenient feature for upgrading database
schemas, however, it doesn't provide any method for downgrading this
schema.

This browser extension provides utilities that let you easily perform
the following operations that are useful when developing and testing
indexeddb upgrades locally:

- Snapshot the curret state of the data for a table
- Delete a table or database
- Restore a given snapshot into the database


## IndexedDB background

The way indexeddb is structured, you are making a sequence of
monotonically increasing versions. This works well as you're deploying
code across clients who may be updating at different
schedules. I.e. one user of your website logs in every day and gets
each new version right as it rolls out, where another user logs in
once a month and could get 3 new versions at the same time.

A built in assumption of this structure is that each new version works
as expected, and leaves the whole database in a good state. This is a
really difficult assumption to uphold. For production changes, we can
hopefully do a good enough job of testing that rollbacks can be
structured as rollforwards. But what about during development?

During development, if you're using indexeddb, you need to have data
loaded in a local database to test / develop. And when you're
developing or testing version upgrades, it would be really easy to get
the database into a version where you've messed up the data. You'd
really rather roll back that change rather than ship a ton of partial
/ broken / intermediate versions.

However, IndexedDb doesn't ship with a concept of version
rollbacks. The suggestion of doing rollbacks using a rollforward isn't
practical for development. It's also not practical to just be
extremely careful in developing new versions such that you don't


# Todos:

- [x] Create a small test page / script
- [x] Read in what the current databases & tables are on the page
- [x] Take a snapshot of a current database / table
- [x] Delete all data from a database / table
- [ ] Restore a snapshot

Future Development:

- [ ] Better schema information beyond index names:
  - column name, unique, autoincrementing, multi-index, etc
- [ ] Value browser for data in the db
- [ ] Figure out why deleting an indexedDB database in firefox is so
      slow.
  - [ ] Even though https://bugzilla.mozilla.org/show_bug.cgi?id=1878312
        is marked as resolved
- [ ] Better error handling for snapshot restoration? Not sure if
      needed.
