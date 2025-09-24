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
    default:
      console.log(`Unknown message: $msg.command`);
      break;
  }
});


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
