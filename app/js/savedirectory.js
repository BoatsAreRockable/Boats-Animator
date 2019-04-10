module.exports = {};

(function() {
  "use strict";
  const fs                 = require("fs"),
        mkdirp             = require("../lib/mkdirp"),
        Notification       = require("../ui/Notification/Notification"),
        SAVE_DIRECTORY_KEY = "ba-save-dir";

  /**
   * Check if the app save directory exists on the file system.
   *
   * @param {String} dir - The directory to check.
   * @returns {Boolean} True if the directory exists, false otherwise.
   */
  function checkDir(dir) {
    return fs.existsSync(dir);
  }

  /**
   * Check if the app save directory has any frames, to prevent them being overwritten.
   *
   * @param {String} dir - The directory to check.
   * @callback Returns true if frames found in the selected directory, otherwise false.
   */
  function checkDirHasNoFrames(dir, cb) {
    var files = fs.readdirSync(dir);

    // Filter files that are frames
    var regex = /\b(frame)(.)+(.png)\b/i;
    var filteredFiles = files.filter((fileName) => {return regex.test(fileName)});

    if (filteredFiles.length > 0) {
      cb(true);
    } else {
      cb(false);
    }
  }

  /**
   * Set the app save directory.
   *
   * @param {String} dir The directory to save.
   * @returns {void}
   */
  function setDir(dir) {
    localStorage.setItem(SAVE_DIRECTORY_KEY, dir);
  }

  /**
   * Get the app save directory.
   *
   * @returns {!String} The stored directory if available, null otherwise.
   */
  function getDir() {
    let dir = localStorage.getItem(SAVE_DIRECTORY_KEY);
    return checkDir(dir) ? dir : null;
  }

  /**
   * Create the app save directory.
   *
   * @param {String} dir - The directory to create.
   * @returns {void}
   */
  function makeDir(dir) {
    mkdirp(dir, function(err) {
      if (err) {
        console.error(err);
        Notification.error(`Failed to create save directory at ${dir}`);
      }
    });
  }


  // Public exports
  module.exports.set   = setDir;
  module.exports.get   = getDir;
  module.exports.make  = makeDir;
  module.exports.check = checkDir;
  module.exports.checkDirHasNoFrames = checkDirHasNoFrames;
}());
