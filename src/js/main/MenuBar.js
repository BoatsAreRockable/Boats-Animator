(function() {
  "use strict";
  const { Menu, shell } = require("electron");
  const events = require("events");

  // Main imports
  // const Shortcuts = require("../common/Shortcuts");

  // var controlKey = (process.platform === "darwin" ? "command" : "ctrl");

  class MenuBar {
    constructor() {
      this.eventEmitter = new events.EventEmitter();
      this.animatorItemsEnabled = true;
    }

    /**
     * Displays the top menu
     */
    load() {
      let self = this;

      // Menu items to add
      let menuItems = [
        {
          label: "File",
          submenu: [
            {
              label: "New project...",
              click: function () {
                self._sendClickEvent("newProject");
              },
              accelerator: "CommandOrControl+n"
            },
            {
              label: "Open project...",
              click: function () {
                self._sendClickEvent("openProject");
              },
              accelerator: "CommandOrControl+o"
            },
            {
              label: "Main Menu",
              click: function () {
                self._sendClickEvent("mainMenu");
              },
              accelerator: "CommandOrControl+w"
            },
            { type: "separator" },
            {
              label: "Exit",
              click: function () {
                self._sendClickEvent("exitApp");
              },
              accelerator: "CommandOrControl+q"
            }
          ]
        },
        {
          label: "Edit",
          submenu: [
            {
              label: "Delete last frame",
              click: function () {
                self._sendClickEvent("undoFrame");
              },
              // accelerator: `${Shortcuts.getPrimaryModifiers("undoFrame")}+${Shortcuts.getPrimaryKey("undoFrame")}`
            }
          ]
        },
        {
          label: "Capture",
          submenu: [
            {
              label: "Capture frame",
              click: function () {
                self._sendClickEvent("takePicture");
              },
              // accelerator: `${Shortcuts.getPrimaryModifiers("takePicture")}+${Shortcuts.getPrimaryKey("takePicture")}`
            },
            {
              label: "Confirm take",
              click: function () {
                self._sendClickEvent("confirmTake");
              },
            },
            { type: "separator" },
            {
              label: "Play capture sounds",
              click: function () {
                self._sendClickEvent("audioToggle");
              },
              type: "checkbox",
              checked: true,
              // accelerator: `${Shortcuts.getPrimaryModifiers("audioToggle")}+${Shortcuts.getPrimaryKey("audioToggle")}`
            },
            {
              label: "Change capture destination",
              click: function () {
                self._sendClickEvent("openDirChooseDialog");
              }
            }
          ]
        },
        {
          label: "Playback",
          submenu: [
            {
              label: "Loop playback",
              click: function () {
                self._sendClickEvent("loopPlayback");
              },
              type: "checkbox",
              checked: false,
              // accelerator: `${Shortcuts.getPrimaryModifiers("loopPlayback")}+${Shortcuts.getPrimaryKey("loopPlayback")}`
            },
            { type: "separator" },
            {
              label: "Display first frame",
              click: function () {
                self._sendClickEvent("firstFrame");
              },
              // accelerator: `${Shortcuts.getPrimaryModifiers("firstFrame")}+${Shortcuts.getPrimaryKey("firstFrame")}`
            },
            {
              label: "Display last frame",
              click: function () {
                self._sendClickEvent("lastFrame");
              },
              // accelerator: `${Shortcuts.getPrimaryModifiers("lastFrame")}+${Shortcuts.getPrimaryKey("lastFrame")}`
            }
          ]
        },
        {
          label: "View",
          submenu: [
            { role: "reload" },
            { role: "forceReload" },
            { role: "toggleDevTools" },
            { type: "separator" },
            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
            { type: "separator" },
            { role: "togglefullscreen" }
          ]
        },
        {
          label: "Help",
          submenu: [
            {
              label: "Documentation",
              click: function () {
                shell.openExternal("https://boatsanimator.readthedocs.io/");
              },
              accelerator: "F1"
            },
            {
              label: "Give feedback",
              click: function () {
                shell.openExternal("https://github.com/charlielee/boats-animator/issues");
              }
            },
            { type: "separator" },
            {
              label: "About Boats Animator",
              click: function () {
                self._sendClickEvent("aboutWindow");
              }
            }
          ]
        }
      ];

      // Create top menu and sub-menus
      let menuBar = Menu.buildFromTemplate(menuItems);
      Menu.setApplicationMenu(menuBar);
    }

    /**
     * Toggles whether the menu items specific to the animator window are disabled or not.
     * @param {Boolean} forceState The boolean value to set the checkbox to
     */
    toggleAnimatorItems(forceState = null) {
      let self = this;
      let menu = Menu.getApplicationMenu();
      const toggleableMenus = ["Edit", "Capture", "Playback"];

      self.animatorItemsEnabled = (forceState === null ? !self.animatorItemsEnabled : forceState);

      menu.items.forEach(function(menuItem) {
        if (toggleableMenus.includes(menuItem.label)) {
          menuItem.submenu.items.forEach(function(subMenuItem) {
            subMenuItem.enabled = self.animatorItemsEnabled;
          });
        }
      });
    }

    /**
     * Checks or unchecks a given checkout menu item
     * @param {String} itemName The name of the menu item to change (possible values "captureSounds" or "loopPlayback")
     * @param {Boolean} state The boolean value to set the checkbox to
     */
    toggleCheckbox(itemName, state) {
      const menu = Menu.getApplicationMenu();
      const checkboxItems = {
        captureSounds: menu.items[2].submenu.items[3],
        loopPlayback: menu.items[3].submenu.items[0]
      };

      if (Object.keys(checkboxItems).includes(itemName)) {
        checkboxItems[itemName].checked = state;
      }
    }

    /**
     * Emit an event when a menubar item is clicked
     * @param {String} menuItemName The name of the menu bar item that was clicked
     */
    _sendClickEvent(menuItemName) {
      this.eventEmitter.emit("menubar:click", menuItemName);
    }
  }

  module.exports = MenuBar;
}());