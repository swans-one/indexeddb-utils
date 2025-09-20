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

function showDBs(dbs) {
  const tbody = document.querySelector("table tbody");
  for (const e of dbs) {
    const tr = document.createElement("tr");
    const colVals = [e.store, e.indexes, e.count, e.name, e.version];
    for (col of colVals) {
      const td = document.createElement("td");
      td.appendChild(document.createTextNode(col));
      tr.appendChild(td)
    }
    tbody.appendChild(tr);
  }
}

browser
  .tabs
  .executeScript({ file: "/content_scripts/read_dbs.js"})
  .then((script_result) => {
    console.log("here");
    console.log(script_result[0][0]);
    showDBs(script_result[0]);
  })
