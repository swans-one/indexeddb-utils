browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  console.log("In Background Script Message Handler");
  console.log(msg);
});
