(function () {
  "use strict";
  const { ipcRenderer } = require("electron");

  // Common imports
  const ConfirmDialog = require("../ui/ConfirmDialog");

  // Main imports
  const Take = require("./Take");
  const Playback = require("../core/Playback");

  // UI imports
  const FrameRate = require("../ui/FrameRate");
  const Notification = require("../../common/Notification");
  const PlaybackCanvas = require("../ui/PlaybackCanvas");
  const PreviewOverlay = require("../core/PreviewOverlay");
  const StatusBar = require("../ui/StatusBar");

  // The various HTML elements we need to configure or control.
  const btnCaptureFrame = document.querySelector("#btn-capture-frame");
  const btnDeleteLastFrame = document.querySelector("#btn-delete-last-frame");
  const btnDeleteFrame = document.querySelector("#btn-delete-frame");
  const preview = document.querySelector("#preview");
  const previewAreaEl = document.querySelector("#preview-area");
  const frameModLeftControls = document.querySelector("#left-controls");

  const btnDirectoryChange = document.querySelector("#btn-dir-change");
  const btnConformTake = document.querySelector("#btn-conform-take");
  const curDirDisplay = document.querySelector("#currentDirectoryName");

  const numberOfFramesSelect = document.querySelector("#number-of-frames-select")

  /** Represents a project (a series of takes) */
  class Project {
    /**
     * Constructor for a project.
     * @param {String} title The project's title
     */
    constructor(title) {
      this.frameRate = new FrameRate(15);
      this.currentMode = null;
      this.currentTake = null;
      this.playback = null;
      this.saveDirPath = null;
      // Indicates whether or not we're currently streaming
      // video from the camera. Obviously, we start at false.
      this.streaming = false;
      this.title = title;
      this.takes = [];

      this.numberOfFramesToCapture = numberOfFramesSelect.value; 

      console.log(`Created new project: ${this.title}`);
    }

    /**
     * The event listeners for a project
     */
    setListeners() {
      let self = this;

      self.playback = new Playback(self);

      // Initialises the preview window
      preview.addEventListener("play", function () {
        PlaybackCanvas.setDimensions(preview.videoWidth.toString(), preview.videoHeight.toString())
        self.streaming = true;

        // Reload preview overlays
        PreviewOverlay.drawAll();

        // Enable onion skin
        self.currentTake.onionSkin.setVisibility(true);
      });

      // Detect preview ending
      preview.addEventListener("suspend", function () {
        self.streaming = false;

        // Reload preview overlays
        PreviewOverlay.drawAll();

        // Disable onion skin
        self.currentTake.onionSkin.setVisibility(false);
      });

      // Change Number of Frames Selected 
      numberOfFramesSelect.addEventListener("change", function() {
        self.numberOfFramesToCapture = numberOfFramesSelect.value; 
      })

      // Capture a frame
      btnCaptureFrame.addEventListener("click", function () { 
        for (let i = 1; i <= self.numberOfFramesToCapture; i++) {
          self.takeFrame();
        }
      });

      // Undo last captured frame
      btnDeleteLastFrame.addEventListener("click", function () {
        self.undoFrame();
      });

      // Delete any frame
      btnDeleteFrame.addEventListener("click", function () {
        self.deleteCurrentSelectedFrame();
      });

      // Change export frame directory
      btnDirectoryChange.addEventListener("click", async () => {
        self.showExportFrameDirDialog()
      });

      // Conform take
      btnConformTake.addEventListener("click", function () {
        self.currentTake.conformTake();
      });
    }

    /**
     * Adds a Take to the project.
     * Returns the new Take.
     */
    addTake() {
      let takeNumber = this.takes.length + 1;
      let take = new Take(takeNumber, this.saveDirPath);
      this.takes.push(take);
      this.currentTake = this.takes[takeNumber - 1];
      return take;
    }

    /**
     * Gets a take by a given take number.
     * @param {Number} takeNumber The number of the take to retrieve.
     */
    getTake(takeNumber) {
      this.currentTake = this.takes[takeNumber - 1];
      return this.currentTake;
    }

    /**
     * Trigger frame capturing.
     */
    takeFrame() {
      var self = this;

      // Take a picture
      if (self.streaming) {
        self.setCurrentMode("capture");

        self.currentTake.captureFrame()
          .then(function () {
            // Scroll to the end of the framereel
            self.currentTake.frameReel.selectLiveViewButton();
          })
          .catch(function (err) {
            Notification.error(err);
          });
      }
    }

    /**
     * Delete the previously taken frame.
     */
    undoFrame() {
      this._deleteFrame(this.currentTake.getTotalFrames());
    }

    /**
     * Delete the current selected frame.
     */
    deleteCurrentSelectedFrame() {
      if (this.currentTake.frameReel.curSelectedFrame) {
        this._deleteFrame(this.currentTake.frameReel.curSelectedFrame);
      } else {
        this.undoFrame();
      }
    }

    /**
     * Checks the export frame directory exists and prompt to select one if not.
     */
    async checkExportFrameDir() {
      let exportFrameDir = await ipcRenderer.invoke("settings:get", "projectDefaults.exportFrameDir");

      // There is no set save directory or the directory does not exist
      if (!exportFrameDir) {
        this.showExportFrameDirDialog();
      } else {
        this._updateExportFrameDirText(exportFrameDir);
      }
    }

    /**
     * Opens the choose export frame directory dialog.
     */
    async showExportFrameDirDialog() {
      let newDir = await ipcRenderer.invoke("settings:show-export-frame-dir-dialog");
      console.log(`Export frame dir changed to: ${newDir}`);

      if (newDir) {
        this._updateExportFrameDirText(newDir);
      }
    }

    /**
     * Updates the save directory displayed the the UI
     * @param {String} newDir The new directory
     */
    _updateExportFrameDirText(newDir) {
      this.saveDirPath = newDir;
      this.currentTake.saveDirPath = newDir;
      curDirDisplay.innerHTML = newDir;

      // The title of the window
      document.title = `Boats Animator (${newDir})`;
    }

    /**
     * Delete an individual frame.
     *
     * @param {Number} id The frame ID to delete.
     */
    _deleteFrame(id) {
      // Make sure there is a frame to delete
      if (this.currentTake.getTotalFrames() > 0) {
        // Display warning alert to confirm deletion
        ipcRenderer.invoke("settings:show-confirm-dialog", `Are you sure you want to delete frame ${id}?`)
          .then((response) => {
            if (response) {
              // Remove the frame from the take
              this.currentTake.deleteFrame(id);
              this.setCurrentMode("capture");
              console.info(`Total frames captured: ${this.currentTake.getTotalFrames()}`);
            }
          });
      } else {
        Notification.error("There are no captured frames to delete!");
      }
    }

    getCurrentMode() {
      return this.currentMode;
    }

    setCurrentMode(modeName) {
      this.currentMode = modeName;
      this._switchMode(modeName);
    }

    /**
     * Toggle between playback and capture windows.
     *
     * Possible values are CaptureWindow and PlaybackWindow.
     */
    _switchMode(newModeName) {
      var takeInst = this.currentTake;

      if (newModeName === "capture") {
        // Update preview area
        previewAreaEl.classList.toggle("capture-mode", true);
        previewAreaEl.classList.toggle("playback-mode", false);
        // Update frame management buttons
        frameModLeftControls.classList.toggle("capture-mode", true);
        frameModLeftControls.classList.toggle("playback-mode", false);

        // Stop playback
        this.playback.videoStop();
        // Update status bar and frame reel
        StatusBar.setCurrentFrame(takeInst.getTotalFrames() + 1);
        StatusBar.setCurrentMode("Capture");
        takeInst.frameReel.selectLiveViewButton();

      } else if (newModeName === "playback") {
        // Update preview area
        previewAreaEl.classList.toggle("capture-mode", false);
        previewAreaEl.classList.toggle("playback-mode", true);
        // Update frame management buttons
        frameModLeftControls.classList.toggle("capture-mode", false);
        frameModLeftControls.classList.toggle("playback-mode", true);

        // Update statusbar and frame reel
        StatusBar.setCurrentMode("Playback");
        takeInst.frameReel.selectLiveViewButton(false);
      }

      console.log(`Switched to: ${newModeName} mode`);
    }
  }

  module.exports = Project;
}());