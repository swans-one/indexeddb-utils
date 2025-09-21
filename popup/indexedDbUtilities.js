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
