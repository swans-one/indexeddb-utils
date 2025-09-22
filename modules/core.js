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


/* Core - core utilities for this extension. It includes the following

   - Database utilites - setup versioning & connections to the
     extension-owned indexeddb

 */

import { idbResponse, versionUpgrades } from './indexedDbUtilities.js';

export const DBNAME = 'indexed-db-utils';
export const DBVERSION = 1;

/* Own setup, version & connection to this extension's indexeddb
   databases. Other modules should import and use this function
   to connect, not manage their own connections.
 */
export function dbConnect(version=DBVERSION) {
  return new Promise((resolve, reject) => {
    const dbOpenReq = window.indexedDB.open(DBNAME, version);

    dbOpenReq.onerror = (event) => {
      reject("Error opening indexed-db-utils database");
    }
    dbOpenReq.onsuccess = (event) => {
      resolve(dbOpenReq.result);
    }
    dbOpenReq.onupgradeneeded = (event) => {
      console.log("In indexed-db-utils upgrade needed");
      versionUpgrades(event, {
        0: (db) => {},
        1: (db) => {
          const store = db.createObjectStore(
            "snapshots", {keyPath: "id", autoIncrement: true}
          );
          const originIndex = store.createIndex("by_origin", "origin");
          const dbNameIndex = store.createIndex("by_dbName", "dbName");
          const dbVersionIndex = store.createIndex("by_dbVersion", "dbVersion");
          const createdIndex = store.createIndex("by_created", "created");
          const recordIndex = store.createIndex("by_recordCount", "recordCount");
        },
      })
    }
  });
}
