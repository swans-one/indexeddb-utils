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

import {
  idbCursorCollect, idbCursorEach, idbResponse, versionUpgrades
} from '../modules/indexedDbUtilities.js';
import { dbConnect } from '../modules/core.js';


/* Given a list of db summaries from `/content_scripts/read_dbs.js`
   put them into the table listed in */
function showDBs(dbs) {
  const tbody = document.querySelector("#table-page-dbs tbody");

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
   given keys.

   This is useful for making multi-row columns in tables.

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

async function getPageOrigin() {
  return await browser
    .tabs
    .query({active: true, currentWindow: true})
    .then(async (activeTabs) => {
      const tabId = activeTabs[0].id;
      const out = await browser.tabs.sendMessage(tabId, {command: "get-origin"});
      return out;
    });
}

async function refreshSnapshotDisplay(origin) {
  origin = !!origin ? origin : await getPageOrigin();
  const metadata = await getSnapshotMetadata(origin);
  displaySnapshots(origin, metadata);
}

async function getSnapshotMetadata(origin) {
  const dbCon = await dbConnect();
  const tx = dbCon.transaction('snapshots', 'readonly');
  const store = tx.objectStore('snapshots');
  const byOrigin = store.index('by_origin');
  const range = IDBKeyRange.only(origin);

  const snapshotMetadata = await idbCursorCollect(
    byOrigin, range, (v) => {
      const {snapshot: _, ...metadata} = v;
      return metadata;
    }
  );
  return snapshotMetadata;
}


/* Idempotent, first clears anything currently displayed, then
   displays the data given

 */
function displaySnapshots(origin, snapshots) {
  const originNode = document.querySelector("#origin");

  // Clear exisiting
  while (originNode.firstChild) {
    originNode.removeChild(originNode.firstChild);
  }
  // Then add
  originNode.appendChild(document.createTextNode(
    `Snapshots for origin: "${origin}"`
  ));

  const tbody = document.querySelector("#table-snapshots tbody");
  // Clear existing
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  // Then add
  for (const snap of snapshots) {
    const tr = document.createElement("tr");
    tbody.appendChild(tr);
    const colVals = [
      `${snap.dbName} :: v${snap.dbVersion}`,
      new Date(snap.created).toUTCString(),
      snap.recordCount
    ];
    for (const val of colVals) {
      const td = document.createElement("td");
      td.appendChild(document.createTextNode(val))
      tr.appendChild(td);
    }
  }
}

function setupOnclickHandlers(origin) {
  const button = document.querySelector("#button-delete-snapshots");
  button.onclick = () => deleteAllSnapshots(origin);
}

async function deleteAllSnapshots(origin) {
  console.log(`Deleting all snapshots for ${origin}`);

  const dbCon = await dbConnect();
  const tx = dbCon.transaction('snapshots', 'readwrite');
  const store = tx.objectStore('snapshots');
  const byOrigin = store.index('by_origin');
  const range = IDBKeyRange.only(origin);

  const count_deleted = await idbCursorEach(
    byOrigin, range, 0, (cursor, acc) => {
      console.log(`Deleting ${cursor.value}`);
      cursor.delete();
      return acc + 1;
  });
  console.log(`Deleted ${count_deleted} snapshots`);
  refreshSnapshotDisplay(origin);
}

// TODO: Next steps
// - [x] "install message handler" script
//   - [x] Has message handlers for snapshot, clear, delete
//   - [x] Tie up basic message passing for buttons
// - [x] Create an indexedDb database for snapshots here
// - [ ] Implement message functionality for
//   - [x] "snapshot"
//     - [x] Get origin information (window.origin or window.url if opaque origin)
//     - [x] Get db info
//     - [x] Get time info
//     - [x] serialize all the contents of all stores
//     - [x] save the snapshot
//   - [x] "clear"
//   - [ ] "delete"
// - [ ] Create a snapshot view
//   - [x] Basic view
//   - [x] Populated with data
//   - [ ] Tabs for databases versus snapshot
//   - [ ] Toggle filtering to just the current origin
// - [ ] Snapshot removal
//   - [ ] Delete a single snapshot
//   - [x] Delete all snapshots
// - [ ] snapshot restore functionality
//   - [ ] Add a "restore" button to snapshot listings
//   - [ ] Add "restore latest" button to databases
// - [ ] UI improvements
//   - [x] Refresh snapshots when a new one is added (or removed)
//   - [ ] Refresh on-page databases when a new one  is added (or removed)
//   - [ ] Styling improvements


function installPopupMessageHandlers() {
  browser.runtime.onMessage.addListener((message) => {
    console.log("Popup: ", message);
    if (!message?.target || message.target !== "popup") {
      return;
    }

    switch (message.command) {
      case "refresh-snapshot-display":
        console.log("refreshing snapshot display");
        refreshSnapshotDisplay();
        break;
      default:
        console.log(
          `Popup doesn't understand message type: ${message.command}'`
        );
        break;
    }
  });
}


/* Perform all the actual page setup, managing the order of async
   effects.
 */
function setup() {

  async function setupDb() {
    // Make sure any upgrades are run.
    return await dbConnect();
  }

  function setupContentScriptHandlers() {
    return browser
      .tabs
      .executeScript({ file: "/content_scripts/install_message_handlers.js" })
  }

  function setupPageDbs() {
    return browser
      .tabs
      .executeScript({ file: "/content_scripts/read_dbs.js"})
      .then((script_results) => {
        showDBs(script_results[0])
      })
  }

  async function setupPopup() {
    installPopupMessageHandlers();

    // Requires Content Script Handlers set up.
    const origin = await getPageOrigin();
    console.log(origin);
    const snapshotMetadata = await getSnapshotMetadata(origin);
    displaySnapshots(origin, snapshotMetadata);
    setupOnclickHandlers(origin);
  }

  return setupDb()
    .then(setupContentScriptHandlers)
    .then(setupPageDbs)
    .then(setupPopup);
}

setup();
