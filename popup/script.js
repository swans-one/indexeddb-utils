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

import { idbResponse, versionUpgrades } from '../modules/indexedDbUtilities.js';


/* Given a list of db summaries from `/content_scripts/read_dbs.js`
   put them into the table listed in */
function showDBs(dbs) {
  const tbody = document.querySelector("table tbody");

  const collapsed = collapseObjects(dbs, ["name", "version"]);
  const metadataColNames = ["store", "indexes", "count"];
  for (const [[dbName, dbVersion], metadata] of collapsed) {
    let tr = document.createElement("tr");

    /* The first `tr` gets db name & version, with rowSpan */
    const tdDbName = document.createElement("td");
    tdDbName.appendChild(document.createTextNode(dbName));
    tdDbName.rowSpan = metadata.length;
    tdDbName.classList.add("database-name");
    const div = document.createElement("div");
    tdDbName.appendChild(div);
    addButtons(div, dbName, dbVersion);
    tr.appendChild(tdDbName);

    const tdDbVersion = document.createElement("td");
    tdDbVersion.appendChild(document.createTextNode(dbVersion));
    tdDbVersion.rowSpan = metadata.length;
    tr.appendChild(tdDbVersion);

    /* All `tr`s get the rest of the columns */
    for (const meta of metadata) {
      for (const colName of metadataColNames) {
        const td = document.createElement("td")
        td.appendChild(document.createTextNode(meta[colName]));
        tr.appendChild(td);
      }
      tbody.appendChild(tr);

      /* Create the next row inside this loop so we don't keep adding
      name and version */
      tr = document.createElement("tr");
    }
  }
}

/*
   Collapse a list of objects based on shared values for the
   given keys

   For example, the following list of objects:

   ```
   let objList = [
   {"a": 1, "b": 2},
   {"a": 1, "b": 3},
   {"a": 6, "b": 4},
   {"a": 6, "b": 5},
   ];
   let result = collapseObjects(objList, ["a"]);
   ```

   Would be collapsed into this list:

   ```
   [
   [[1], [{"a": 1, "b": 2}, {"a": 1, "b": 3}]],
   [[6], [{"a": 6, "b": 4}, {"a": 6, "b": 5}]],
   ]
   ```
 */
function collapseObjects(objList, keys, eqFn) {
  eqFn = !!eqFn ? eqFn : (a, b) => a === b;

  if (keys.length < 1) {
    throw new Error("Must provide at least one key");
  }

  const output = [];

  for (const obj of objList) {
    const collapseVals = keys.map(k => obj[k]);
    const matchIndex = output.findIndex(e => {
      let outputVals = e[0];
      return outputVals
        .map((v, i) => eqFn(v, collapseVals[i]))
        .every(x => x);
    });
    if (matchIndex >= 0) {
      output[matchIndex][1].push(obj);
    } else {
      output.push([collapseVals, [obj]]);
    }
  }
  return output;
}

function addButtons(inside, dbName, dbVersion) {
  /* onclick handler for buttons that sends the appropriate message */
  function sendMessage(clickEvent) {
    const {command, dbName, dbVersion} = clickEvent.target.dataset;
    browser
      .tabs
      .query({ active: true, currentWindow: true})
      .then((activeTabs) => {
        // There should only be one active tab
        const tabId = activeTabs[0].id;
        browser.tabs.sendMessage(
          tabId, {command: command, dbName: dbName, dbVersion: dbVersion}
        );
      });
  }

  const buttons = ["snapshot", "clear", "delete"];
  for (const buttonCommand of buttons) {
    const button = document.createElement("button")
    button.onclick = sendMessage;
    button.dataset.command = buttonCommand;
    button.dataset.dbName = dbName;
    button.dataset.dbVersion = dbVersion;
    button.appendChild(document.createTextNode(buttonCommand))
    inside.appendChild(button)
  }
}

function setupSnapshotIndexedDb(version) {
  return new Promise((resolve, reject) => {
    const dbOpenReq = window.indexedDB.open('indexed-db-utils', version);

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

// TODO: Next steps
// - [x] "install message handler" script
//   - [x] Has message handlers for snapshot, clear, delete
//   - [x] Tie up basic message passing for buttons
// - [x] Create an indexedDb database for snapshots here
// - [ ] Implement message functionality for
//   - [ ] "snapshot"
//     - [ ] Get origin information (window.origin or window.url if opaque origin)
//     - [x] Get db info
//     - [x] Get time info
//     - [ ] serialize all the contents of all stores
//   - [ ] "clear"
//   - [ ] "delete"
// - [ ] Create a snapshot view
//   - [x] Basic view
//   - [ ] Tabs for databases versus snapshot
// - [ ] snapshot restore functionality
//   - [ ] Add a "restore" button to snapshot listings
//   - [ ] Add "restore latest" button to databases

const db = await setupSnapshotIndexedDb(1);


browser
  .tabs
  .executeScript({ file: "/content_scripts/install_message_handlers.js" })
  .then((script_result) => {});

browser
  .tabs
  .executeScript({ file: "/content_scripts/read_dbs.js"})
  .then((script_result) => {
    showDBs(script_result[0]);
  })
