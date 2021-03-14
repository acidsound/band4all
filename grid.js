const debug = false

console._log = console.log

console.log = function () {
  if (debug)
    console._log(...arguments)
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

let lastNote;
const generatePad = () => {
  const st = 40;
  const ed = st + 9 * 5 - 1;
  const scales = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const padPanel = document.getElementById("grid");
  const padElement = padPanel.querySelector("li");
  for (let key = st; key <= ed; key++) {
    let padItem = padElement.cloneNode(true);
    let keyName = scales[(key % 12)];
    let pad = padItem.querySelector(".anchor");
    pad.setAttribute("data-note", key);
    pad.querySelector(".key").textContent = `${keyName.padEnd(2, " ")}${~~(key / 12)}`;
    pad.addEventListener(
      "touchstart",
      (e) => {
        const touches = e.changedTouches;
        lastNote = key;
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
        console.log("TouchesEnd", key, touches.length);
        playKey(0, key);
        playKey(0, lastNote);
        e.preventDefault();
      },
      false
    );
    padPanel.append(padItem);
    padElement.remove();
  }
  /* handle move event */
  document.querySelectorAll("#grid .anchor").forEach((pad) =>
    pad.addEventListener(
      "touchmove",
      (e) => {
        if (e.changedTouches.length && e.changedTouches[0]) {
          const moved = e.changedTouches[0]
          const movedEl = document.elementFromPoint(moved.clientX, moved.clientY);
          if (movedEl != null && movedEl.classList.contains('anchor')) {
            const key = movedEl.getAttribute('data-note')
            if (key !== lastNote) {
              playKey(0, lastNote);
              lastNote = key
              playKey(1, key)
            }
          }
        }
      },
      false
    ));
}
document.addEventListener("DOMContentLoaded", function () {
  const isDebug = new URLSearchParams(location.search).get("debug");
  if (!isDebug) {
    console.log = console._log;
    document.getElementById("debug").remove();
  }
  generatePad();
  isDebug && $("#debug", ["click", "touchstart"], (evt) => {
    if ($("#log").classList.contains("hidden")) {
      $("#log").classList.remove("hidden"); init
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
      window.addEventListener("touchend", function (e) {
        const key = e.target.getAttribute("data-note");
        key && playKey(0, key);
      });
      evt.preventDefault();
    });
});
