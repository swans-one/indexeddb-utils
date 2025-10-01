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
import {
  dbConnect, popupConfirm, promisePopupConfirm, sendContentScriptMessage
} from '../modules/core.js';

/* Idempotent
 */
function refreshDisplayDBs() {
    return browser
      .tabs
      .executeScript({ file: "/content_scripts/read_dbs.js"})
      .then((script_results) => {
        showDBs(script_results[0])
      })
}

/* Given a list of db summaries from `/content_scripts/read_dbs.js`
   put them into the table listed in */
function showDBs(dbs) {
  const tbody = document.querySelector("#table-page-dbs tbody");

  /* First clear, then populate */
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  const collapsed = collapseObjects(dbs, ["name", "version"]);
  const metadataColNames = ["store", "indexes", "count"];
  for (const [[dbName, dbVersion], metadata] of collapsed) {
    let tr = document.createElement("tr");

    /* The first `tr` gets db name & version, with rowSpan */
    const tdDbName = document.createElement("td");
    const pDbName = document.createElement("p");
    pDbName.appendChild(document.createTextNode(dbName))
    tdDbName.appendChild(pDbName);
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

/* Add buttons to the database rows */
function addButtons(inside, dbName, dbVersion) {
  /* onclick handler for buttons that sends the appropriate message */
  function sendMessage(clickEvent) {
    const {command, dbName, dbVersion} = clickEvent.target.dataset;
    sendContentScriptMessage({command, dbName, dbVersion});
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

function getPageOrigin() {
  return sendContentScriptMessage({command: "get-origin"});
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

  function sortDateDesc(a, b) {
    return b.created - a.created;
  }

  const snapshotMetadata = await idbCursorCollect(
    byOrigin, range, (v) => {
      const {snapshot: _, ...metadata} = v;
      return metadata;
    }
  );
  snapshotMetadata.sort(sortDateDesc)
  return snapshotMetadata;
}


/* Add nodes for the buttons on a snapshot element */
function snapshotButtons(inside, snapshotKey) {
  const buttons = [
    { text: "restore", command: "kickoff-snapshot-restore" },
    { text: "delete", command: "snapshot-delete"},
  ]
  for (const button of buttons) {
    const b = document.createElement("button");
    b.appendChild(document.createTextNode(button.text));
    b.dataset.snapshotKey = snapshotKey;
    b.dataset.command = button.command;
    b.onclick = (ev) => {
      const { command, snapshotKey } = ev.target.dataset;
      browser.runtime.sendMessage({
        target:"background",
        command,
        snapshotKey: Number(snapshotKey),
      });
    }
    inside.appendChild(b);
  }
}

/* Idempotent, first clears anything currently displayed, then
   displays the data given
 */
function displaySnapshots(origin, snapshots) {
  // == Origin Info ==
  const originNode = document.querySelector("#origin");
  // Clear exisiting
  while (originNode.firstChild) {
    originNode.removeChild(originNode.firstChild);
  }
  // Then add
  originNode.appendChild(document.createTextNode(
    `Snapshots for origin: "${origin}"`
  ));

  // == Snapshot Table ==
  const tbody = document.querySelector("#table-snapshots tbody");
  // Clear existing
  while (tbody.firstChild) {
    tbody.removeChild(tbody.firstChild);
  }

  // Then add
  for (const snap of snapshots) {
    const tr = document.createElement("tr");
    tbody.appendChild(tr);

    const dbDiv = document.createElement("div");
    dbDiv.appendChild(document.createTextNode(
      `${snap.dbName} :: v${snap.dbVersion}`
    ));
    const buttonDiv = document.createElement("div");
    dbDiv.appendChild(buttonDiv);
    snapshotButtons(buttonDiv, snap.id);

    const colNodes = [
      dbDiv,
      document.createTextNode(new Date(snap.created).toUTCString()),
      document.createTextNode(snap.recordCount)
    ];
        for (const node of colNodes) {
      const td = document.createElement("td");
      td.appendChild(node)
      tr.appendChild(td);
    }
  }
}

function setupOnclickHandlers(origin) {
  const button = document.querySelector("#button-delete-snapshots");
  button.onclick = () => {
    const msg = [
      "This will delete ALL snapshost for the current origin: ",
      `"${origin}"`,
      " It will not delete snapshots from other origins (sites). ",
      "Do you want to delete all snapshots for this origin?"
    ].join("")
    popupConfirm(
      msg,
      () => { deleteAllSnapshots(origin); },
      () => { console.log("Snapshot delete canceled"); }
    );
  };
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
// - [x] Implement message functionality for
//   - [x] "snapshot"
//     - [x] Get origin information (window.origin or window.url if opaque origin)
//     - [x] Get db info
//     - [x] Get time info
//     - [x] serialize all the contents of all stores
//     - [x] save the snapshot
//   - [x] "clear"
//   - [x] "delete"
// - [x] Create a snapshot view
//   - [x] Basic view
//   - [x] Populated with data
// - [ ] Snapshot removal
//   - [ ] Delete a single snapshot
//   - [x] Delete all snapshots
// - [ ] snapshot restore functionality
//   - [x] Add a "restore" button to snapshot listings
//   - [ ] Add "restore latest" button to databases
// - [ ] UI improvements
//   - [x] Refresh snapshots when a new one is added (or removed)
//   - [x] Refresh on-page databases when a one is removed, or cleared
//   - [x] Styling improvements
//     - [x] Better fonts, spacing, etc
//     - [x] Better table styling
//     - [x] Put the buttons in the right places
//     - [x] The window shouldn't shrink when "processing"
//   - [x] Snapshots sorted descending
//   - [ ] Tabs for databases versus snapshot
//   - [ ] Toggle filtering to just the current origin
// - [ ] console.log usage audit
// - [ ] Data flow improvements
//   - [ ] "processing" state - should always reflect reality?
//     - [ ] core function for doing "processing"
//     - [ ] With "debounce" so popup doesn't flicker
//     - [ ] More things use processing state
//     - [ ] Opening the popup reflects the current state
// - [ ] Clean up this todo list
//   - [ ] Migrate any remaining todos to contributing.md
//   - [ ] Delete this list

function installPopupMessageHandlers() {
  browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Popup: ", message);
    if (!message?.target || message.target !== "popup") {
      return;
    }

    switch (message.command) {
      case "refresh-snapshot-display":
        console.log("refreshing snapshot display");
        refreshSnapshotDisplay();
        break;
      case "popup-confirm":
        return promisePopupConfirm(message.message)
        break;
      case "refresh-db-display":
        return refreshDisplayDBs();
      default:
        console.log(
          `Popup doesn't understand message type: ${message.command}'`
        );
        break;
    }
  });

  async function toggleProcessingState(processing) {
    const main = document.querySelector("#main-contents");
    const notif = document.querySelector("#processing")

    if (processing) {
      main.classList.add("hidden");
      notif.classList.remove("hidden");
    } else {
      await refreshDisplayDBs();
      main.classList.remove("hidden");
      notif.classList.add("hidden");
    }
  }

  browser.storage.local.onChanged.addListener((changes) => {
    console.log(changes);
    const { processing: processingChange, ...rest } = changes;
    const processing = processingChange.newValue;
    console.log(`Local Storage onChanged. Processing ${processing}`);

    toggleProcessingState(processing);
  })
}


/* Perform all the actual page setup, managing the order of async
   effects.
 */
function setup() {

  async function setupExtensionDb() {
    // Make sure any upgrades are run.
    return await dbConnect();
  }

  function setupContentScriptHandlers() {
    return browser
      .tabs
      .executeScript({ file: "/content_scripts/install_message_handlers.js" })
  }

  function setupPageDbs() {
    return refreshDisplayDBs();
  }

  async function setupPopup() {
    installPopupMessageHandlers();

    // Requires Content Script Handlers set up.
    const origin = await getPageOrigin();
    const snapshotMetadata = await getSnapshotMetadata(origin);
    displaySnapshots(origin, snapshotMetadata);
    setupOnclickHandlers(origin);
  }

  return setupExtensionDb()
    .then(setupContentScriptHandlers)
    .then(setupPageDbs)
    .then(setupPopup);
}

setup();
