import { idbResponse } from '../modules/indexedDbUtilities.js';
import { dbConnect } from '../modules/core.js';

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
      break;
    case "snapshot-delete":
      console.log("snapshot-delete", msg);
      break;
    default:
      console.log(`Unknown message: ${msg.command}`);
      break;
  }
});

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
