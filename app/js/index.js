/*jslint browser: true, node: true, debug: true*/
/* global Buffer, process */

// Launcher window
var launcherVersion = document.querySelector("#app-version"),
    
    // GUI window
    gui = require("nw.gui"),
    win = gui.Window.get(),
    
    // Node.js APIs
    fs = require("fs");

/**
 * Occurs when "New Project" is pressed
 */
function openAnimator() {
    "use strict";
    gui.Window.open("animator.html", {
        position: "center",
        width: 1050,
        height: 715,
        min_width: 590,
        min_height: 500,
        toolbar: false,
        focus: true,
        icon: "icons/icon.png",
    });
    win.close();
}

/**
 * Check if we can display the latest news feed
 * and if we cannot, say so.
 */
function canDisplayNews() {
    "use strict";
    var NewsFeed = require("./js/feed"),
    feed = new NewsFeed({
      url: "http://charlielee.uk/category/boats-animator/feed/",
      selectors: {
        container: document.querySelector(".container-news")
      }
    });
    feed.get();
}

/**
 * Development Functions
 */
function dev() {
    "use strict";
    win.showDevTools();
}

function reload() {
    "use strict";
    win.reloadDev();
}

/**
 * Get version number from package.json
 */
fs.readFile("package.json", "utf8", function (err, data) {
    "use strict";
    if (err) throw err;
    var datajsoned = JSON.parse(data);
    launcherVersion.innerHTML = datajsoned.version;
});