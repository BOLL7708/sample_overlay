var maxFps = 0;
var prev = null;
var overflow = { hmd: 0, game: 0 };

var configSystem = [
    { key: "cpuLoadAvg", label: "CPU Load Avg" },
    { key: "cpuLoadMax", label: "CPU Max Core Load" },
    { key: "cpuRam", label: "CPU Memory" },
    { key: "cpuTemp", label: "CPU Temperature" },
    { key: "gpuLoad", label: "GPU Load" },
    { key: "gpuRam", label: "GPU Memory" },
    { key: "gpuVideoLoad", label: "GPU Video Load" },
    { key: "gpuTemp", label: "CPU Load Avg" }
];
var configFps = [
    { key: "fpsHmd", label: "HMD Frame Rate" },
    { key: "fpsGame", label: "Game Frame Rate" }
];
var config = configSystem.concat(configFps);

function init() {
    var $info = $("#info");
    var $bars = $("#bars");
    var bars = [];
    var socket = null;
    var socketAlive = false;

    for (i = 0; i < config.length; i++) {
        $bars.append('<div class="barcontainer"><div id="bar' + i + '" class="bar"></div></div>');
        bars[config[i].key] = $("#bar" + i);
    }
    console.log(bars);

    loop();
    connect();

    function loop() {
        setTimeout(loop, 1000);
        fetch("proxy.php")
            .then(response => response.json())
            .then(json => {
                var data = getData(json);
                for (i = 0; i < configSystem.length; i++) {
                    updateBar(configSystem[i], data);
                }
            })
        if (socketAlive) {
            var payload = {
                "key": "CumulativeStats"
            };
            socket.send(JSON.stringify(payload));
        }
    }

    function updateBar(conf, data) {
        var key = conf.key;
        bars[key].css("height", data[key] + "%");
    }

    function updateFpsBars(data) {
        var max = data.fpsMax;
        data.fpsHmd = data.fpsHmd / max * 100;
        data.fpsGame = data.fpsGame / max * 100;

        for (i = 0; i < this.configFps.length; i++) {
            var conf = this.configFps[i];
            updateBar(conf, data);
        }
    }

    function connect() {
        if (!socketAlive) {
            socketAlive = true;
            socket = new WebSocket("ws://localhost:7708");
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
    var cpu = "Intel Core i9-9900K";
    var ram = "Generic Memory";
    var gpu = "NVIDIA GeForce RTX 2080";

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
            case cpu:
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
            case ram:
                component.Children.forEach(item => {
                    if (item.Text == "Load")
                        result['cpuRam'] = parseFloat(item.Children[0].Value);
                });
                break;
            case gpu:
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
        fpsGame: 0,
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