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

  const collapsed = collapseObjects(dbs, ["name", "version"]);
  const metadataColNames = ["store", "indexes", "count"];
  for (const [[dbName, dbVersion], metadata] of collapsed) {
    let tr = document.createElement("tr");

    /* The first `tr` gets db name & version, with rowSpan */
    const tdDbName = document.createElement("td");
    tdDbName.appendChild(document.createTextNode(dbName));
    tdDbName.rowSpan = metadata.length;
    tr.appendChild(tdDbName);

    const tdDbVersion = document.createElement("td");
    tdDbVersion.appendChild(document.createTextNode(dbVersion));
    tdDbVersion.rowSpan = metadata.length;
    tr.appendChild(tdDbVersion);

    /* All `tr`s get the rest of the columns */
    for (meta of metadata) {
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

browser
  .tabs
  .executeScript({ file: "/content_scripts/read_dbs.js"})
  .then((script_result) => {
    console.log("here");
    console.log(script_result[0][0]);
    showDBs(script_result[0]);
  })
