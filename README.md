# Sample Overlay
This is a small sample overlay using OpenHardwareMonitor and OpenVR2WS to visualize system performance.

![Screenshot](https://i.imgur.com/KSYKvbg.png)

## Prerequisites
### OpenHardwareMonitor
This provides the system performance of your PC.
* Download and run [OpenHardwareMonitor](https://openhardwaremonitor.org/)
* Open the window, check `Menu > Options > Remote Web Server > Run`
* If you change the port, make sure to also update `$port` in `proxy.php`
### OpenVR2WS
This provides the game performance of the running VR title.
* Download and run [OpenVR2WS](https://github.com/BOLL7708/OpenVR2WS)
* Run SteamVR and then OpenVR2WS
* If you change the port, make sure to also update `vrPort` in `app.js`
### Web Server
This is needed to proxy requests over PHP to avoid cross-origin issues in JavaScript.
* Install a local web server with PHP, in this example [XAMPP](https://www.apachefriends.org/download.html)
* Run the `XAMPP Control Panel` as administrator, and register Apache as a service with the left-most checkbox.
* Start Apache with the `Start` button

## Usage
Put the files in your webserver root so PHP can run, in XAMPP it's the `htdocs` folder.

See `app.js` for settings regarding your hardware and update accordingly.

Modify the `styles.css` (or anything else) to make it look like you want it to.

To show it off in your stream, add it as a browser source in whichever capture suite you prefer.
