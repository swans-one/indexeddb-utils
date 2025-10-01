import { idbResponse } from '../modules/indexedDbUtilities.js';
import { dbConnect, sendContentScriptMessage } from '../modules/core.js';

browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg?.target || msg.target !== "background") {
    return;
  }

  switch (msg.command) {
    case "snapshot-data":
      return snapshotData(msg);
      break;
    case "start-processing-notif":
      return startProcessing(msg);
      break;
    case "end-processing-notif":
      return endProcessing(msg);
      break;
    case "kickoff-snapshot-restore":
      console.log("kickoff-snapshot-restore", msg);
      return kickoffSnapshotRestore(msg.snapshotKey);
      break;
    case "snapshot-delete":
      console.log("snapshot-delete", msg);
      return snapshotDelete(msg);
      break;
    default:
      console.log(`Unknown message: ${msg.command}`);
      break;
  }
});

async function snapshotDelete(msg) {
  const dbCon = await dbConnect();
  const tx = dbCon.transaction('snapshots', 'readwrite');
  const store = tx.objectStore('snapshots');
  const response = idbResponse(
    store.delete(msg.snapshotKey), req => req.result
  );
  browser.runtime.sendMessage({
    target: "popup",
    command: "refresh-snapshot-display",
  })
  return response;
}

/* Fetch the full snapshot from extension owned indexeddb and send it
   to the content script to perform the actual restore logic.
 */
async function kickoffSnapshotRestore(keyId) {
  const dbCon = await dbConnect();
  const tx = dbCon.transaction('snapshots', 'readonly');
  const store = tx.objectStore('snapshots');
  const snapshot = await idbResponse(store.get(keyId), req => req.result);
  return sendContentScriptMessage({command: "restore-snapshot", snapshot });
}

/* Set a local storage variable to show we're processing a request

   The actual UI logic for this lives in the popup script.js event
   listener for `browser.storage.local.onChanged`

 */
async function startProcessing(msg) {
  console.log("got start-processing message");
  browser.storage.local.set({processing: true});
}

/* Unset the local storage variable.

   The actual UI logic for this lives in the popup script.js event
   listener for `browser.storage.local.onChanged`

 */
async function endProcessing(msg) {
  console.log("got end-processing message");
  browser.storage.local.set({processing: false});
}

/*
   Save the snapshot data into the extension's indexeddb
 */
async function snapshotData(msg) {
  const dbCon = await dbConnect();
  console.log(dbCon);

  const tx = dbCon.transaction('snapshots', 'readwrite');
  tx.oncomplete = (ev) => {
    console.log("snapshot-data transaction completed");
  }
  tx.onerror = (ev) => {
    console.log("snapshot-data transaction failed");
  }

  const store = tx.objectStore('snapshots');
  await idbResponse(store.add(msg.data), req => undefined);

  browser.runtime.sendMessage({
    target: "popup",
    command: "refresh-snapshot-display",
  });
}
