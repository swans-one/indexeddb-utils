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

(async () => {
  const utilsURL = browser.runtime.getURL('modules/indexedDbUtilities.js')
  const {
    idbCursorEach, idbResponse, getOriginOrOpaque
  } = await import(utilsURL);

  /* We only want to install message handlers on the window once */
  if (window.indexedDbUtilsInstallMessageHandlersHasRun) {
    return;
  }
  window.indexedDbUtilsInstallMessageHandlersHasRun = true;

  /* Fetch all records from all objectStores in the database.

     Send a message to the background script with this snapshot and
     associated metadata, so it can be stored in the extension's
     indexeddb.

   */
  async function takeSnapshot(msg) {
    const {dbName, dbVersion} = msg;
    console.log(`Take Snapshot: ${dbName}, ${dbVersion}`);

    let dbcon = await idbResponse(
      window.indexedDB.open(dbName), req => req.result
    );
    const storeNames = [...dbcon.objectStoreNames];
    const storeSnapshots = {};
    for (const storeName of storeNames) {
      const tx = dbcon.transaction(storeName, "readonly");
      const store = tx.objectStore(storeName);
      const all = await idbResponse(store.getAll(), req => req.result);
      storeSnapshots[storeName] = all;
    }
    const records = Object.values(storeSnapshots)
                          .map(snap => snap.length)
                          .reduce((a, b) => a + b, 0);

    browser.runtime.sendMessage({
      command: "snapshot-data",
      target: "background",
      data: {
        "origin": getOriginOrOpaque(),
        "dbName": dbName,
        "dbVersion": dbVersion,
        "created": Date.now(),
        "stores": storeNames,
        "storeCount": storeNames.length,
        "recordCount": records,
        "snapshot": storeSnapshots,
      }
    });
  }

  /* Remove all records, but don't delete the database
   */
  async function clearDb(msg) {
    const {dbName, dbVersion} = msg;
    console.log(`Clear Database: ${dbName}, ${dbVersion}`);

    let dbcon = await idbResponse(
      window.indexedDB.open(dbName), req => req.result
    );
    const storeNames = [...dbcon.objectStoreNames];

    const storeCount = storeNames.length;
    let deleted = 0;

    for (const storeName of storeNames) {
      const tx = dbcon.transaction(storeName, "readwrite");
      const store = tx.objectStore(storeName);
      deleted += await idbCursorEach(
        store, undefined, 0, (cursor, acc) => {
          cursor.delete();
          return acc + 1;
      });
    }
    console.log(`${deleted} records deleted from ${storeCount} stores.`);
  }

  /* Delete the database entirely
   */
  function deleteDb(msg) {
    const {dbName, dbVersion} = msg;
    console.log(`Delete Database: ${dbName}, ${dbVersion}`);
  }

  function getOrigin(msg) {
    console.log("in get origin");
    const origin = getOriginOrOpaque();
    return Promise.resolve(origin);
  }

  browser.runtime.onMessage.addListener((message) => {
    switch (message.command) {
      case "snapshot":
        return takeSnapshot(message);
        break;
      case "clear":
        return clearDb(message);
        break;
      case "delete":
        return deleteDb(message);
        break;
      case "get-origin":
        console.log("get-origin reachable");
        return getOrigin(message);
        console.log("get-origin unreachable");
        break;
      default:
        console.log(
          `Background doesn't understand message type: ${message.command}`
        );
        break;
    }
  })
})();
