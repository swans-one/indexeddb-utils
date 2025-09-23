/*
   IndexedDB-Utils - A browser extension to simplify indexedDB management tasks

   Copyright (C) 2025 Erik Swanson

   This program is free software: you can redistribute it and/or modify
   it under the terms of the GNU General Public License as published by
   the Free Software Foundation, either version 3 of the License, or
   (at your option) any later version.

   This program is distributed in the hope that it will be useful,
   but WITHOUT ANY WARRANTY; without even the implied warranty of
   MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
   GNU General Public License for more details.

   You should have received a copy of the GNU General Public License
   along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


/*
   Convert an IDBRequest object into a promise with a
   function to run onSuccess.

   Means that you can use async/await syntax with
   many indexedDB funcions.

   Example:

   ```
   const records = await idbResponse(store.count(), req => req.result);
   ```
 */
export function idbResponse(request, onSuccess) {
  return new Promise((resolve, reject) => {
    request.onerror = (ev) => {
      reject(`IDBRequest Error: ${ev.target.error}`);
    }
    request.onsuccess = (ev) => {
      resolve(onSuccess(ev.target));
    }
  });
}

/* Async function which collects the results of iterating over a
   cursor into a list.

   `cursorTarget` :: Either an IDBObjectStore or IDBIndex to iterate
   through.

   `range` (optional) :: An IDBKeyRange to restrict the cursor to. If
   not provided will iterate through all objects.

   `valFn` (optional) :: A function to transform the returned value
   before adding to the list, it will be called with one argument:
   `cursor.value`. If not provided, it defaults to the identity
   function.

 */
export function idbCursorCollect(cursorTarget, range, valFn) {
  valFn = !!valFn ? valFn : (x) => x;

  return new Promise((resolve, reject) => {
    const collection = [];
    cursorTarget.openCursor(range).onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) {
        collection.push(valFn(cursor.value));
        cursor.continue();
      } else {
        resolve(collection);
      }
    }
  });
}


/* Iterate through all the elements of a cursor and perform operations
   on them. Optionally allows accumulating results in an accumulator.

   `cursorTarget` :: Either an IDBObjectStore or IDBIndex to iterate
   through.

   `range` (optional) :: An IDBKeyRange to restrict the cursor to. If
   not provided will iterate through all objects.

   `opFn` (optional) :: If provided this function will be passed the
   cursor object and an accumulator. It can perform any operation on
   the cursor and store any information in the accumulator.

   `acc` (optional) :: An optional value to be passed in as the
   accumulator. If not provided, it will default to undefined.

 */
export function idbCursorEach(cursorTarget, range, acc, opFn) {
  opFn = !!opFn ? opFn : (record, acc) => acc + 1;
  acc = !!opFn ? acc : 0;

  return new Promise((resolve, reject) => {
    let accumulator = acc;
    cursorTarget.openCursor(range).onsuccess = (ev) => {
      const cursor = ev.target.result;
      if (cursor) {
        accumulator = opFn(cursor, accumulator);
        cursor.continue();
      } else {
        resolve(accumulator);
      }
    }
  });
}

/*
   Manage version upgrade functions for an onupgradeneeded handler.

   The goals is that new versions of the database can be added by
   adding more keys to the object being passed into the upgradeFns
   parameter. Each new key is a new version, and the value is a
   function which upgrades from the previous version.

   When a client needs to upgrade, they will run each new function
   in order.

   Example:

   ```
   dbOpenRequest.onupgradeneeded = (event) => {

   const db = event.target.result;

   versionUpgrades(event, {
   0: (db) => {},
   1: (db) => {
   let store = db.createObjectStore(...);
   let idx = store.createIndex(...);
   store.put({...})
   },
   2: (db) => {
   let store = db.createObjectStore(...);
   let idx = store.createIndex(...);
   store.put({...})
   }
   })
   ```
 */
export function versionUpgrades(event, upgradeFns) {
  const db = event.target.result;
  const current = event.oldVersion;
  const requested = event.newVersion;

  const versions = Object.keys(upgradeFns).map(Number).sort();
  if (!versions.includes(current)) {
    throw new Error(`upgradeFns missing current version: ${current}`);
  }
  if (!versions.includes(requested)) {
    throw new Error(`upgradeFns missing requested version: ${requested}`);
  }
  const versionsSlice = versions.slice(versions.indexOf(current) + 1);
  for (const v of versionsSlice) {
    upgradeFns[v](db);
    console.log(`Successfully upgraded ${db.name} to version: ${v}`);
  }
}


/*

   Return a string that reflects the "same origin" policy of
   indexeddb.

   Most webpages will use the http origin, consisting of a schema +
   domain + port, e.g. "https://example.com".

   However, some origins are considered "opaque", namely when it's
   unclear if the origin can be simplified, e.g. a file.

   The browser identifies opaque origins by returning `null` for
   `window.origin`. In these cases we will use the full URL as the
   origin, and will tag the origin as opaque.

 */
export function getOriginOrOpaque() {
  let origin = window.origin;
  if (origin === "null") {
    origin = `[opaque](${window.location.href})`;
  }
  return origin;
}
