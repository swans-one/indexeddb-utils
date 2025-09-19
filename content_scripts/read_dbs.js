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
  function idbResponse(request, onSuccess) {
    return new Promise((resolve, reject) => {
      request.onerror = (ev) => {
        reject(`IDBRequest Error: ${ev.target.error}`);
      }
      request.onsuccess = (ev) => {
        resolve(onSuccess(ev.target));
      }
    });
  }

  return await window.indexedDB.databases().then(async dbs => {
    let summaries = [];
    for (const {name: dbName, version: dbVersion} of dbs) {

      let dbcon = await idbResponse(window.indexedDB.open(dbName), req => {
        return req.result;
      });

      const storeNames = [...dbcon.objectStoreNames];

      for (storeName of storeNames) {
        const tx = dbcon.transaction(storeName, "readonly");
        const store = tx.objectStore(storeName);
        const indexes = [...store.indexNames].join(", ");
        const count = await idbResponse(store.count(), req => req.result);

        summaries.push({
          name: dbName,
          version: dbVersion,
          store: storeName,
          indexes: indexes,
          count: count,
        })
      }
    }
    return summaries;
  });
})();
