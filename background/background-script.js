import { idbResponse } from '../modules/indexedDbUtilities.js';
import { dbConnect } from '../modules/core.js';

browser.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  console.log("In Background Script Message Handler");
  console.log(msg);

  switch (msg.command) {
    case "snapshot-data":
      snapshotData(msg);
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
}
