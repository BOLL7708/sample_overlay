var maxFps = 0;
var prev = null;
var overflow = { hmd: 0, game: 0 };

/* 
    Settings

    vrPort: The port used for OpenVR2WS.
    configDevices: Change these to match what the devices have as titles in OpenHardwareMonitor.
    configSystem: The keys should be correct, edit the labels to your liking.
    configFps: The keys should not be changed, edit the labels to your liking.
    configFrames: The keys should not be changed, edit the labels to your liking.
*/
var vrPort = 7708;
var configDevices = {
    cpu: "Intel Core i9-9900K",
    ram: "Generic Memory",
    gpu: "NVIDIA GeForce RTX 3080"
};
var configSystem = [
    { key: "cpuLoadAvg", label: "CPU Load Avg", unit: "%" },
    { key: "cpuLoadMax", label: "CPU Max Core Load", unit: "%" },
    { key: "cpuRam", label: "CPU Memory", unit: "%" },
    { key: "cpuTemp", label: "CPU Temperature", unit: "°C" },
    { key: "gpuLoad", label: "GPU Load", unit: "%" },
    { key: "gpuRam", label: "GPU Memory", unit: "%" },
    { key: "gpuVideoLoad", label: "GPU Video Load", unit: "%" },
    { key: "gpuTemp", label: "CPU Load Avg", unit: "°C" }
];
var configFps = [
    { key: "fpsHmd", label: "HMD Frame Rate", unit: "" },
    { key: "fpsGame", label: "Game Frame Rate", unit: "" }
];
var configFrames = [
    { key: "framesReprojected", label: "Reprojected frames", unit: "%" },
    { key: "framesDropped", label: "Dropped frames", unit: "%" }
];
var config = configSystem.concat(configFps).concat(configFrames);
// End config

function init() {
    var $bars = $("#bars");
    var bars = [];
    var values = [];
    var socket = null;
    var socketAlive = false;

    for (i = 0; i < config.length; i++) {
        $bars.append(
            '<div class="container">' +
            '<div class="barcontainer"><div id="bar' + i + '" class="bar"></div></div>' +
            '<div id="value' + i + '" class="value"></div>' +
            '<div class="label">' + config[i].label + '</div>') +
            '</div>';
        bars[config[i].key] = $("#bar" + i);
        values[config[i].key] = $("#value" + i);
    }

    loop();
    connect();

    function loop() {
        setTimeout(loop, 1000);
        fetch("proxy.php")
            .then(response => response.json())
            .then(json => {
                var data = getData(json);
                for (i = 0; i < this.configSystem.length; i++) {
                    var conf = this.configSystem[i];
                    var value = data[conf.key];
                    updateBar(conf, value, value);
                }
            })
        if (socketAlive) {
            var payload = {
                "key": "CumulativeStats"
            };
            socket.send(JSON.stringify(payload));
        }
    }

    function updateBar(conf, height, value) {
        var key = conf.key;
        if (isNaN(value)) value = 0;
        bars[key].css("height", height + "%");
        values[key].html(Math.round(value) + conf.unit);
    }

    function updateFpsBars(data) {
        var max = data.fpsMax;
        for (i = 0; i < this.configFps.length; i++) {
            var conf = this.configFps[i];
            var value = data[conf.key];
            var height = value / max * 100;
            updateBar(conf, height, value);
        }
    }

    function updateFramesBars(data) {
        var max = data.framesPresented;
        for (i = 0; i < this.configFrames.length; i++) {
            var conf = this.configFrames[i];
            var height = data[conf.key] / max * 100;
            updateBar(conf, height, height);
        }
    }

    function connect() {
        if (!socketAlive) {
            socketAlive = true;
            socket = new WebSocket("ws://localhost:" + vrPort);
            socket.onopen = function (evt) {
                console.log("WebSocket opened.");
                var payload = {
                    key: "DeviceProperty",
                    device: 0,
                    value: "Prop_DisplayFrequency_Float"
                }
                socket.send(JSON.stringify(payload));
            }
            socket.onclose = function (evt) {
                socketAlive = false;
                console.log("WebSocket closed.");
                setTimeout(connect, 2000);
            }
            socket.onmessage = function (evt) {
                var data = JSON.parse(evt.data);
                switch (data.key) {
                    case "CumulativeStats":
                        var result = getFrames(data.data);
                        updateFpsBars(result);
                        updateFramesBars(result);
                        break;
                    case "DeviceProperty":
                        getDeviceProperties(data.data);
                        break;
                }
            }
            socket.onerror = function (evt) {
                console.error(evt);
            }
        }
    }
}

function getData(data) {
    var pc = data.Children[0];
    var result = {
        cpuLoadMax: 0,
        cpuLoadAvg: 0,
        cpuRam: 0,
        cpuTemp: 0,
        gpuLoad: 0,
        gpuVideoLoad: 0,
        gpuRam: 0,
        gpuTemp: 0,
    };
    pc.Children.forEach(component => {
        switch (component.Text) {
            case configDevices.cpu:
                component.Children.forEach(property => {
                    switch (property.Text) {
                        case "Temperatures":
                            property.Children.forEach(item => {
                                if (item.Text == "CPU Package")
                                    result['cpuTemp'] = parseFloat(item.Value);
                            });
                            break;
                        case "Load":
                            property.Children.forEach(item => {
                                if (item.Text == "CPU Total")
                                    result['cpuLoadAvg'] = parseFloat(item.Value);
                                else {
                                    let value = parseFloat(item.Value);
                                    if (value > result['cpuLoadMax'])
                                        result['cpuLoadMax'] = value;
                                }
                            });
                            break;
                    }
                });
                break;
            case configDevices.ram:
                component.Children.forEach(item => {
                    if (item.Text == "Load")
                        result['cpuRam'] = parseFloat(item.Children[0].Value);
                });
                break;
            case configDevices.gpu:
                component.Children.forEach(property => {
                    switch (property.Text) {
                        case "Temperatures":
                            result['gpuTemp'] = parseFloat(property.Children[0].Value);
                            break;
                        case "Load":
                            property.Children.forEach(item => {
                                switch (item.Text) {
                                    case "GPU Core":
                                        result['gpuLoad'] = parseFloat(item.Value);
                                        break;
                                    case "GPU Memory":
                                        result['gpuRam'] = parseFloat(item.Value);
                                        break;
                                    case "GPU Video Engine":
                                        result['gpuVideoLoad'] = parseFloat(item.Value);
                                        break;
                                }
                            });
                            break;
                    }
                });
                break;
        }
    });
    return result;
}

function getDeviceProperties(data) {
    switch (data.name) {
        case "Prop_DisplayFrequency_Float":
            this.maxFps = Math.round(data.value);
            break;
    }
}

function getFrames(data) {
    var result = {
        framesPresented: data.framesPresented,
        framesReprojected: data.framesReprojected,
        framesDropped: data.framesDropped,
        framesTime: data.systemTimeMs,
        fpsMax: 0,
        fpsHmd: 0,
        fpsGame: 0
    }
    if (result.framesPresented == 0)
        return result;
    if (this.prev == null) this.prev = result;

    let delta = result.framesTime - this.prev.framesTime;
    let presented = result.framesPresented - this.prev.framesPresented;
    let reprojected = result.framesReprojected - this.prev.framesReprojected;
    let dropped = result.framesDropped - this.prev.framesDropped;
    let secs = 1000 / delta;
    let fpsHmd = Math.ceil(presented * secs);
    let fpsGame = Math.ceil((presented - reprojected - dropped) * secs);

    // Due to unstable frame rate reporting this smooths the value out.
    if (fpsHmd < this.maxFps)
        fpsHmd += this.overflow.hmd;
    this.overflow.hmd = 0;
    if (fpsHmd > this.maxFps)
        this.overflow.hmd = fpsHmd - this.maxFps;
    if (fpsGame < this.maxFps)
        fpsGame += this.overflow.game;
    this.overflow.game = 0;
    if (fpsGame > this.maxFps)
        this.overflow.game = fpsGame - this.maxFps;

    result.fpsMax = this.maxFps;
    result.fpsHmd = this.zorm(fpsHmd, this.maxFps);
    result.fpsGame = this.zorm(fpsGame, this.maxFps);
    this.prev = result;
    return result;
}

function zorm(val, max) {
    if (val > max)
        return max;
    if (val < 0)
        return 0;
    if (isNaN(val))
        return 0;
    return val;
}