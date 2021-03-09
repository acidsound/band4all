console.log = function () {
  const logElement = document.querySelector("#log");
  logElement.textContent =
    Array.from(arguments)
      .map((o) => (typeof o === "object" && JSON.stringify(o, null, 2)) || o)
      .join(" ") +
    "\n" +
    logElement.textContent;
};

$ = (selectors, events = undefined, callback = undefined) => {
  if (selectors && !events && !callback) {
    return document.querySelector(selectors);
  }
  if (typeof selectors === "string") selectors = [selectors];
  if (typeof events === "string") events = [events];
  for (let s of selectors) {
    for (let e of events) {
      document.querySelector(s).addEventListener(e, callback);
    }
  }
};

document.addEventListener("DOMContentLoaded", function () {
  $("#debug", ["click", "touchstart"], (evt) => {
    if ($("#log").classList.contains("hidden")) {
      $("#log").classList.remove("hidden");
    } else {
      $("#log").classList.add("hidden");
    }
    evt.preventDefault();
  });
  document
    .querySelector(".modal>.dialog>.btnOk")
    .addEventListener("click", async (evt) => {
      document.querySelector(".modal").classList.add("hidden");
      context.state === "suspended" && (await context.resume());
      console.log("audioContext state", context.state);
      document.querySelectorAll("#grid .anchor").forEach((pad) => {
        console.log(pad.getAttribute("data-note"));
        pad.addEventListener(
          "touchstart",
          (e) => {
            const touches = e.changedTouches;
            const key = pad.getAttribute("data-note");
            console.log("Touches", key, touches.length);
            playKey(1, key);
            e.preventDefault();
          },
          false
        );
        pad.addEventListener(
          "touchend",
          (e) => {
            const touches = e.changedTouches;
            const key = pad.getAttribute("data-note");
            console.log("TouchesEnd", key, touches.length);
            playKey(0, key);
            e.preventDefault();
          },
          false
        );  
      });
      window.addEventListener("touchend", function (e) {
        const key = e.target.getAttribute("data-note");
        key && playKey(0, key);
      });
      evt.preventDefault();
    });
});
