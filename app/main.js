/*jslint browser: true, node: true, debug: true*/
/* global Buffer */

// The width and height of the captured photo. We will set the
// width to the value defined here, but the height will be
// calculated based on the aspect ratio of the input stream.
var width  = 480,
    height = 0,

    // |streaming| indicates whether or not we're currently streaming
    // video from the camera. Obviously, we start at false.
    streaming = false,

    // The various HTML elements we need to configure or control.
    preview     = document.querySelector("#preview"),
    video       = document.querySelector("#video"),
    canvas      = document.querySelector("#canvas"),
    photo       = document.querySelector("#photo"),
    ratio       = null,
    aspectRatio = null,

    // GUI window
    gui = require('nw.gui'),
    win = gui.Window.get(),

    // Capture
    capturedFramesRaw  = [],
    capturedFramesList = [],
    captureFrame       = document.querySelector("#captureFrame"),
    deleteLastFrame    = document.querySelector("#deleteLastFrame"),
    noOfFrames         = null,
    lastFrame          = null,
    curFrame           = 0,

    // Playback
    scrollFrames               = null,
    frameRate                  = 15,
    isPlaying                  = false,
    sidebar                    = document.querySelector("#sidebar"),
    btnSidebarToggle           = document.querySelector("#btn-sidebar-toggle"),
    collapsedSidebar           = document.querySelector("#collapsedSidebar"),
    playback                   = document.querySelector("#playback"),
    loopCheck                  = document.querySelector("#loopCheckbox"),
    playbackButton             = document.querySelector("#playbackFrames"),
    stopPlaybackButton         = document.querySelector("#stopPlayback"),
    pausePlaybackButton        = document.querySelector("#pausePlayback"),
    inputChangeFR              = document.querySelector("#input-fr-change"),
    backCapturedFrameButton    = document.querySelector("#backCapturedFrame"),
    forwardCapturedFrameButton = document.querySelector("#forwardCapturedFrame"),

    // Individual frames
    btnFrameDelete = document.querySelectorAll(".btn-frame-delete"),

    // Status bar
     statusBarFrameNum  = document.querySelector("#noOfFrames"),
     statusBarFrameRate = document.querySelector("#currentFrameRate"),

    // Export frames
    fs                    = require('fs'),
    frameExportDirectory  = null,
    exportedFramesList    = [],
    curDirDisplay         = document.querySelector("#currentDirectoryName"),
    changeDirectoryButton = document.querySelector("#changeDirectoryButton"),

    // Onion skin
    onionSkinFrame     = null,
    isOnionSkinEnabled = false,
    onionSkinPanel     = document.querySelector("#options-onion-skin"),
    onionSkinToggle    = document.querySelector("#btn-onion-skin-toggle"),
    onionSkinWindow    = document.querySelector("#onion-skinning-frame"),
    onionSkinOpacity   = document.querySelector("#input-onion-skin-opacity"),
    onionSkinPercent   = document.querySelector("#onion-skin-percentage"),

    // Notification bar
    notifyBar    = document.querySelector(".notification"),
    notifyBarMsg = document.querySelector(".notification #msg");


function openAnimator() {
    var frameExportDirectory = _getDefaultDirectory();
    win.resizeTo(1050, 700);
    win.setPosition('center');
}

/**
 * Check if we can display the latest news feed
 * and if we cannot, say so.
 */
function canDisplayNews() {
    "use strict";
    if (!window.navigator.onLine) {
        document.querySelector("#news").innerHTML = "This feature requires an internet connection.";
    }
}

function startup() {
    noOfFrames     = capturedFramesRaw.length;
    lastFrame      = capturedFramesRaw[noOfFrames - 1];
    onionSkinFrame = capturedFramesList[capturedFramesList.length];
    isPlaying      = false;

    //Set up captured frame display
    updateframeslist();

    //Check if a default directory has been set
    checkdefaultdirectory();

    //Load the top menu
    loadMenu();

    // Set default frame rate
    inputChangeFR.value = frameRate;


    navigator.getMedia = navigator.getUserMedia || navigator.webkitGetUserMedia;

    navigator.getMedia(
        {
            video: true,
            audio: false
        },
        function (stream) {
            //start streaming add play preview stream
            preview.src = window.URL.createObjectURL(stream);
            preview.play();
            // start steaming and play hidden video of correct resolution
            video.src = window.URL.createObjectURL(stream);
            video.play();
        },
        function (err) {
            console.error("Could not find a camera to use!");
            notifyError("Could not find a camera to use!");
        }
    );

    video.addEventListener('canplay', function () {
        if (!streaming) {
            height = video.videoHeight / (video.videoWidth / width);

            video.setAttribute('width', width);
            video.setAttribute('height', height);
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            streaming = true;
            ratio = width / height;
            aspectRatio = ratio.toFixed(2);
            console.log("height: " + height);
            console.log("width: " + width);
            console.log("Aspect ratio: " + aspectRatio);

            notifySuccess("Camera successfully connected.");
        }
    }, false);


/*==========================================================
=============== LISTENERS ==================================
===============================================================*/


    //Listen if capture frame button pressed
    captureFrame.addEventListener("click", function (ev) {
        ev.preventDefault();
        takePicture2();
    });

    //Listen if undo last frame button pressed
    deleteLastFrame.addEventListener("click", function (ev) {
        ev.preventDefault();
        deleteFrame(curFrame);
    });

    // Toggle onion skin
    onionSkinToggle.addEventListener("click", _toggleOnionSkin);

    // Change onion skin opacity
    onionSkinOpacity.addEventListener("input", _onionSkinChangeAmount);

    //listen if playback button is pressed
    playbackButton.addEventListener("click", function (ev) {
        ev.preventDefault();
        //check pics have been taken
        if (noOfFrames > 0) {
            if (isPlaying === false) {
                playbackframes();
            } else {
                console.warn("Pressing play did nothing as already playing!");
            }

        } else {
            console.warn("Pressing play did nothing as no pictures have been taken!");
        }
    });

    //listen if stop playback button is pressed
    stopPlaybackButton.addEventListener("click", function (ev) {
        ev.preventDefault();
        //check pics have been taken
        if (noOfFrames > 0) {
            if (loopCheck.checked) {
                stopitwhenlooping();
            } else {
                stopit();
            }
        } else {
            console.warn("Pressing stop did nothing as no pictures have been taken!");
        }
    });

    //listen if pause playback button is pressed
    pausePlaybackButton.addEventListener("click", function (ev) {
        ev.preventDefault();
        //check pics have been taken
        if (noOfFrames > 0) {
            if (isPlaying === true) {
                pauseit();
            } else {
                console.warn("Pressing pause did nothing as not playing!");
            }
        } else {
            console.warn("Pressing pause did nothing as no pictures have been taken!");
        }
    });

    // Listen for frame rate changes
    inputChangeFR.addEventListener("change", function () {
        "use strict";
        frameRate = parseInt(this.value, 10);
        document.getElementById("currentFrameRate").innerHTML = "Playback is currently at " + this.value + " fps";
        stopitwhenlooping();
    });

    //listen if left arrow button is pressed
    backCapturedFrameButton.addEventListener("click", function (ev) {
        ev.preventDefault();
        scrollFrames--;
        updateframeslist();
    });

    //listen if right arrow button is pressed
    forwardCapturedFrameButton.addEventListener("click", function (ev) {
        ev.preventDefault();
        scrollFrames++;
        updateframeslist();
    });

    // Individual frame deletion
    for (var i = 0; i < btnFrameDelete.length; i++) {
      btnFrameDelete[i].addEventListener("click", function(ev) {
        var frameID = capturedFramesRaw.indexOf(ev.target.previousElementSibling.getAttribute("src"));
        deleteFrame(frameID);
      });
    }

    // Toggle the sidebar visibility
    btnSidebarToggle.addEventListener("click", function(ev) {
      ev.preventDefault();
      sidebar.classList.toggle("hidden");
      collapsedSidebar.classList.toggle("shrink");
    });

    clearPhoto();
}


/**
 * Fill the canvas with an indication that
 * no frames hace been captured.
 */
function clearPhoto() {
    "use strict";
    var context = canvas.getContext("2d");
    context.fillStyle = "#aaa";
    context.fillRect(0, 0, canvas.width, canvas.height);
    console.log("Canvas cleared");
}

/**
 * Update the frame displays and frame stats.
 */
function updateFrameDisplays() {
    "use strict";
    // Get a link to the last captured frame
    var curFrameData = capturedFramesRaw[curFrame - 1];

    // Display number of captured frames and current frame rate in status bar
    statusBarFrameNum.innerHTML = `${curFrame} ${curFrame === 1 ? "frame" : "frames"} captured`;
    statusBarFrameRate.innerHTML = `Playback is currently at ${frameRate} fps`;

    // Update onion skinning frame
    onionSkinWindow.setAttribute("src", curFrameData);

    // Display the image preview only if we can
    // TODO Display more than five
    // TODO Change to blank image if frame is deleted
    if (curFrame <= 5) {
      document.querySelector(`#lastCapturedFrame${curFrame}`).setAttribute("src", curFrameData);
    }

    // TODO Restore scrolling
}

    //update the various places frames appear when a picture is taken or deleted
    function updateframeslist() {
        //update number of frames taken
        noOfFrames = capturedFramesRaw.length;
        //update name of last frame captured
        lastFrame = capturedFramesRaw[noOfFrames - 1];

        // Update onion skin frame
        onionSkinWindow.setAttribute("src", lastFrame);

        //update frames preview (Thank you Anon)
        if(capturedFramesRaw.length > 4) {
            document.getElementById("lastCapturedFrame1").setAttribute("src", capturedFramesRaw[scrollFrames - 5]);
        } else {
            document.getElementById("lastCapturedFrame1").setAttribute("src", "blanksquare.png");
        }


        if(capturedFramesRaw.length > 3) {
            document.getElementById("lastCapturedFrame2").setAttribute("src", capturedFramesRaw[scrollFrames - 4]);
        } else {
            document.getElementById("lastCapturedFrame2").setAttribute("src", "blanksquare.png");
        }

        if(capturedFramesRaw.length > 2) {
            document.getElementById("lastCapturedFrame3").setAttribute("src", capturedFramesRaw[scrollFrames - 3]);
        } else {
            document.getElementById("lastCapturedFrame3").setAttribute("src", "blanksquare.png");
        }

        if(capturedFramesRaw.length > 1) {
            document.getElementById("lastCapturedFrame4").setAttribute("src", capturedFramesRaw[scrollFrames - 2]);
        } else {
            document.getElementById("lastCapturedFrame4").setAttribute("src", "blanksquare.png");
        }

        if(capturedFramesRaw.length > 0) {
            document.getElementById("lastCapturedFrame5").setAttribute("src", capturedFramesRaw[scrollFrames - 1]);
        } else {
            document.getElementById("lastCapturedFrame5").setAttribute("src", "blanksquare.png");
        }

       // console.info('There are now: ' + noOfFrames + ' frames');

        //download indivdual frames WIP
       /* var check = document.getElementById("downloadCheckbox");
        if(check.checked){
        document.getElementById("debug1").innerHTML = "<a download href='" + lastFrame + "'>Download last frame</a>";
        }*/

        //display number of frames captured in status bar
        if (noOfFrames==1){
            document.getElementById("noOfFrames").innerHTML = noOfFrames + " frame captured";
        }else{
            document.getElementById("noOfFrames").innerHTML = noOfFrames + " frames captured";
        }
        //display current frame rate in status bar
        document.getElementById("currentFrameRate").innerHTML = "Playback is currently at " + frameRate.toString() + " fps";


        console.log("Scrollframes: " + scrollFrames);
    }

    function updatedeleteicons() {

    }

/**
 * Delete an individual frame.
 *
 * @param {Number} id The frame ID to delete.
 */
function deleteFrame(id) {
    "use strict";
    var confirmDel = confirm("Are you sure you want to delete this frame?");

    // The user wants to delete the frame
    if (confirmDel) {
      curFrame--;
      capturedFramesRaw.splice(id - 1, 1);
      _deleteFile(exportedFramesList[curFrame]);

      console.info(`Deleted frame: ${capturedFramesRaw[id - 1]}. There are now: ${curFrame} frames`);
      updateFrameDisplays();
    }
}

/**
 * Toggle onion skinning on or off.
 */
function _toggleOnionSkin() {
    "use strict";
    // Onion skin is currently enabled, turn it off
    if (isOnionSkinEnabled) {
      isOnionSkinEnabled = false;
      onionSkinToggle.innerHTML = "<span>Off</span>";
      onionSkinToggle.classList.remove("active");
      onionSkinPanel.classList.remove("visible");
      onionSkinWindow.classList.remove("visible");

      // Onion skin is currently disabled, turn it on
    } else {
      isOnionSkinEnabled = true;
      onionSkinToggle.innerHTML = "<span>On</span>";
      onionSkinToggle.classList.add("active");
      onionSkinPanel.classList.add("visible");

      // Display last captured frame
      onionSkinWindow.classList.add("visible");
      onionSkinWindow.setAttribute("src", capturedFramesRaw[curFrame - 1]);
    }
}

// Capture a photo by fetching the current contents of the video
  // and drawing it into a canvas, then converting that to a PNG
  // format data URL. By drawing it on an offscreen canvas and then
  // drawing that to the screen, we can change its size and/or apply
  // other changes before drawing it.
    function takepicture() {
        if (width && height) {
            var context = canvas.getContext('2d');
            canvas.width = width;
            canvas.height = height;
            context.drawImage(video, 0, 0, width, height);

            var data = canvas.toDataURL('image/png');
            photo.setAttribute('src', data);
            //add frame to list of imgs
            capturedFramesList.push("<img class='capturedFramesItem' id='" + noOfFrames + "' src='" + data + "'>");

            //add frame to list of img srcs
            capturedFramesRaw.push(data);

            scrollFrames = capturedFramesRaw.length;

            console.info('Captured frame: ' + data.slice(100, 120) + ' There are now: ' + (noOfFrames + 1) + ' frames');
            updateframeslist();
            saveFrame();
        } else {
            clearPhoto();
        }

    }


function takePicture2() {
    "use strict";
    // We are not able to take a picture
    if (!(width && height)) {
      clearPhoto();

     // We can take a picture
    } else {
        // Draw the image
        var context = canvas.getContext('2d');
        canvas.width = width;
        canvas.height = height;
        context.drawImage(video, 0, 0, width, height);

        // Convert the frame to a PNG
        var data = canvas.toDataURL('image/png');
        photo.setAttribute('src', data);

        // Store the image data and update the current frame
        capturedFramesRaw.push(data);
        curFrame++;
        console.info(`Captured frame: ${data.slice(100, 120)} There are now: ${curFrame} frames`);

        // Update the frame reel
        updateFrameDisplays();

        // Save the frame to disk
        saveFrame(curFrame);
    }
}


//PLAYBACK
    var playbackFrameNo = -1,
        yoplayit;

function playbackframes() {
        yoplayit = setInterval(playit, (1000 / frameRate));
        console.info("Playback started");
}
function playit() {
    isPlaying = true;
    playbackFrameNo++;
    document.getElementById('playback').setAttribute("src",capturedFramesRaw[playbackFrameNo]);
    document.getElementById('currentFrame').innerHTML = "Playing frame " + (playbackFrameNo + 1);
    if((noOfFrames - 1) == playbackFrameNo){
            stopit();
    }
}
function stopit() {
    var loopCheck = document.getElementById("loopCheckbox");

    //reset playback to the first frame
    playbackFrameNo = -1;
    if(loopCheck.checked === true){
        //if loop check is true playback continues from frame 1
        console.info("Playback looped");
    }else{
        isPlaying = false;
        //stop increasing playback frame number
        clearInterval(yoplayit);
        //display final frame in playback window
        document.getElementById('playback').setAttribute("src",lastFrame);
        document.getElementById('currentFrame').innerHTML = "Playing frame " + noOfFrames;
        console.info("Playback stopped");
    }
}
function stopitwhenlooping() {
    isPlaying = false;
    //stop increasing playback frame number
    clearInterval(yoplayit);
    document.getElementById('playback').setAttribute("src",lastFrame);
    document.getElementById('currentFrame').innerHTML = "Playing frame " + noOfFrames;
    //reset playback frame
    playbackFrameNo = -1;
    console.info("Playback stopped with loop on");
}

function pauseit() {
    isPlaying = false;
    clearInterval(yoplayit);
    console.info("Playback paused");
}

/**
 * Change onion skinning opacity.
 *
 * @param {Object} ev Event object from addEventHandler.
 */
function _onionSkinChangeAmount(ev) {
    "use strict";
    // Calculate the percentage opacity value
    var amount = ev.target.value * 5;

    onionSkinPercent.innerHTML = amount + "%";
    onionSkinWindow.style.opacity = amount / 100;
}

/**
 * Set directory to export frames to
 */
function checkdefaultdirectory() {
    frameExportDirectory = _getDefaultDirectory();
    if (frameExportDirectory === null) {
        console.log("no default set");
    } else {
        _displayDirectory(frameExportDirectory);
    }
}

/**
 * Open the system native choose directory dialog.
 *
 * @param {String} The DOM selector to the dialog trigger.
 */
function chooseFile(name) {
    "use strict";
    var chooser = document.querySelector(name);

    chooser.addEventListener("change", function() {
        frameExportDirectory = this.value;
        _displayDirectory(frameExportDirectory);
    });

  chooser.click();
}

/**
 * Display the frame destination directory in the UI.
 *
 * @param {String} dir The directory to display.
 */
function _displayDirectory(dir) {
    "use strict";
    console.log(`Current destination directory is ${dir}`);
    curDirDisplay.innerHTML = dir;
    document.title = `Boats Animator (${dir})`;
}

/**
 * Change default save directory.
 */
function changeDirectory() {
    "use strict";
    chooseFile('#chooseDirectory');
}

/**
 * Set the default save directory.
 */
function setDefaultDirectory() {
    "use strict";
    localStorage.setItem("default_directory", frameExportDirectory);
}

/**
 * Get the default save directory.
 *
 * @return {!String} The stored directory if available, null otherwise.
 */
function _getDefaultDirectory() {
    "use strict";
    return localStorage.getItem("default_directory");
}

/**
* COnverting frames to png
*/
function decodeBase64Image(dataString) {
  var matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/),
    response = {};

  if (matches.length !== 3) {
    return new Error('Invalid input string');
  }

  response.type = matches[1];
  response.data = new Buffer(matches[2], 'base64');

  return response;
}

/**
 * Save the captured frame to the hard drive.
 *
 * @param {Number} id The frame ID to save.
*/
function saveFrame(id) {
    "use strict";
    var fileName = "";

    // 1K+ frames have been captured
    if (id >= 1000) {
      fileName = id.toString();
    }

    // 100 frames have been captured
    else if (id >= 100) {
      fileName = `0${id}`;
    }

    // 10 frames have been captured
    else if (id >= 10) {
      fileName = `00${id}`;

      // Less then 10 frames have been captured
    } else {
      fileName = fileName = `000${id}`;
    }

    // Create an absolute path to the destination location
    var outputPath = `${frameExportDirectory}/${fileName}.png`;

    // Convert the frame from base64-encoded date to a PNG
    var imageBuffer = decodeBase64Image(capturedFramesRaw[id - 1]);

    // Save the frame to disk
    _writeFile(outputPath, imageBuffer.data);

    // Store the location of the exported frame
    exportedFramesList.push(outputPath);
}

/**
 * Write a file from the hard drive.
 *
 * @param {String} file Absolute path to the file to be saved.
 * @param {Binary} data The image data to write.
 */
function _writeFile(file, data) {
    "use strict";
     fs.writeFile(file, data, function(err) {
        if (err) {
            throw err;
        }
        console.log(`Successfully saved " ${file}`);
    });
}

/**
 * Delete a file from the hard drive.
 *
 * @param {String} file Absolute path to the file to be deleted.
 */
function _deleteFile(file) {
    "use strict";
    fs.unlink(file, function (err) {
        if (err) {
            throw err;
        }
        console.log(`Successfully deleted " ${file}`);
        notifySuccess("File successfully deleted.");
    });
}

/**
 * Hide the current notification.
 *
 * @param {String} msgType Class name of the message type
 *                         (e.g., info) displayed.
 */
function _notifyClose(msgType) {
  "use strict";
  // Time in seconds before the notification should go away
  var timeout = 2.5;

  // Hide the notification bar
  window.setTimeout(function() {
      notifyBar.classList.add("hidden");
  }, 1000 * timeout);

  // Clear the styling a bit later.
  // Without this, the styling is removed before
  // the bar is hidden.
  window.setTimeout(function() {
      notifyBar.classList.remove(msgType);
      notifyBarMsg.innerHTML = "";
  }, 1200 * timeout);
}

/**
 * Display a success notification.
 *
 * @param {String|Nunber} [msg=""] The message to display.
 */
function notifySuccess(msg) {
  "use strict";
  msg = msg || "";

  notifyBarMsg.innerHTML = msg;
  notifyBar.classList.add("success");
  notifyBar.classList.remove("hidden");

  _notifyClose("success");
}

/**
 * Display an information notification.
 *
 * @param {String|Nunber} [msg=""] The message to display.
 */
function notifyInfo(msg) {
  "use strict";
  msg = msg || "";

  notifyBarMsg.innerHTML = msg;
  notifyBar.classList.add("info");
  notifyBar.classList.remove("hidden");

  _notifyClose("info");
}

/**
 * Display an error notification.
 *
 * @param {String|Nunber} [msg=""] The message to display.
 */
function notifyError(msg) {
  "use strict";
  msg = msg || "";

  notifyBarMsg.innerHTML = msg;
  notifyBar.classList.add("error");
  notifyBar.classList.remove("hidden");

  _notifyClose("error");
}

/**
 * Display top menu
 */
function loadMenu() {
    // Create menu
    var menu = new gui.Menu({ type: 'menubar' });

    // Create sub-menus
    var fileMenuItems = new gui.Menu(),
        editMenuItems = new gui.Menu(),
        captureMenuItems = new gui.Menu();


    //File menu items
    fileMenuItems.append(new gui.MenuItem({
      label: "New project...",
      click: function() {
      },
        key: "n",
        modifiers: "ctrl",
    }));
    fileMenuItems.append(new gui.MenuItem({
      label: "Open project...",
      click: function() {
      },
        key: "o",
        modifiers: "ctrl",
    }));

    //Edit menu items
    editMenuItems.append(new gui.MenuItem({
      label: "Delete last frame",
        icon: "icons/delete.png",
      click: function() {
        deleteFrame(curFrame);
      },
      key: "z",
      modifiers: "ctrl",
    }));
    editMenuItems.append(new gui.MenuItem({ type: 'separator' }));
    editMenuItems.append(new gui.MenuItem({
      label: "Preferences",
        icon: "icons/settings.png",
      click: function() {
          btnSidebarToggle.click();
      },
      key: "p",
      modifiers: "ctrl",
    }));

    //Capture menu items
    captureMenuItems.append(new gui.MenuItem({
      label: "Capture frame",
        icon: "icons/capture.png",
      click: function() {
        takepicture();
      },
      key: "c",
      modifiers: "ctrl",
    }));

    // Append sub-menus to main menu
    menu.append(
        new gui.MenuItem({
            label: 'File',
            submenu: fileMenuItems // menu elements from menuItems object
        })
    );
    menu.append(
        new gui.MenuItem({
            label: 'Edit',
            submenu: editMenuItems // menu elements from menuItems object
        })
    );
    menu.append(
        new gui.MenuItem({
            label: 'Capture',
            submenu: captureMenuItems // menu elements from menuItems object
        })
    );

    // Append Menu to Window
    gui.Window.get().menu = menu;
}
/**
 * Development Functions
 */
function dev() {
    win.showDevTools();
}

function reload() {
    win.reloadDev();
}
