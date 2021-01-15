# Sample Overlay
This is a small sample overlay using OpenHardwareMonitor and OpenVR2WS to visualize system performance.

## Prerequisits
### OpenHardwareMonitor
* Download and run OpenHardwareMonitor: https://openhardwaremonitor.org/
* Open the window, check `Menu > Options > Remove Web Server > Run`
* If you change the port, make sure to also update `$port` in `proxy.php`.
### OpenVR2WS
* Download and run OpenVR2WS: https://github.com/BOLL7708/OpenVR2WS
* Run SteamVR and then OpenVR2WS
* If you change the port, make sure to also update `vrPort` in `app.js`.

## Usage
The idea is to modify the CSS to make this look like you want it to. 

You are obviously free to change it however you like though.

See `app.js` for settings regarding your hardware.

To show it off in your stream, add it as a browser source in whichever capture suite you prefer.