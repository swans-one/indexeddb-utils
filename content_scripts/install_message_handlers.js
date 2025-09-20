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

(() => {
  /* We only want to install message handlers on the window once */
  if (window.indexedDbUtilsInstallMessageHandlersHasRun) {
    return;
  }
  window.indexedDbUtilsInstallMessageHandlersHasRun = true;

  function takeSnapshot(msg) {
    const {dbName, dbVersion} = msg;
    console.log(`Take Snapshot: ${dbName}, ${dbVersion}`);
  }
  function clearDb(msg) {
    const {dbName, dbVersion} = msg;
    console.log(`Clear Database: ${dbName}, ${dbVersion}`);
  }
  function deleteDb(msg) {
    const {dbName, dbVersion} = msg;
    console.log(`Delete Database: ${dbName}, ${dbVersion}`);
  }

  browser.runtime.onMessage.addListener((message) => {
    switch (message.command) {
      case "snapshot":
        takeSnapshot(message);
        break;
      case "clear":
        clearDb(message);
        break;
      case "delete":
        deleteDb(message);
        break;
      default:
        console.log(`Unknown message: ${message.command}`);
        break;
    }
  })
})();
