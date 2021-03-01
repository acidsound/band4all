document.addEventListener("DOMContentLoaded", function () {
  document
    .querySelector(".modal>.dialog>.btnOk")
    .addEventListener("click", async () => {
      document.querySelector(".modal").classList.add("hidden");
      context.state === "suspended" && (await context.resume());
      console.log("audioContext state", context.state);
      for (let downEvent of ["keydown"]) {
        //, 'mousedown', 'touchstart']
        window.addEventListener(downEvent, function (e) {
          const key = keyMap[e.which] || e.target.getAttribute("data-note");
          playDrum(1, key);
        });
      }
      ["keyup"].map((
        upEvent //, 'mouseup', 'touchend']
      ) =>
        window.addEventListener(upEvent, function (e) {
          const key = keyMap[e.which] || e.target.getAttribute("data-note");
          playDrum(0, key);
        })
      );
    });
});
