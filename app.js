var maxFps = 90;
var prev = null;
var overflow = { hmd: 0, game: 0 };

function init() {
    var $info = $("#info");
    var $bars = $("#bars");
    var bars = [];
    var socket = null;
    var socketAlive = false;

    for (i = 0; i < 8; i++) {
        $bars.append('<div class="barcontainer"><div id="bar' + i + '" class="bar"></div></div>');
        bars[i] = $("#bar" + i);
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
                bars[0].css("height", data.cpuLoadAvg + "px");
                bars[1].css("height", data.cpuLoadMax + "px");
                bars[2].css("height", data.cpuRam + "px");
                bars[3].css("height", data.cpuTemp + "px");
                bars[4].css("height", data.gpuLoad + "px");
                bars[5].css("height", data.gpuRam + "px");
                bars[6].css("height", data.gpuTemp + "px");
                bars[7].css("height", data.gpuVideoLoad + "px");
            })
        if (socketAlive) {
            var payload = {
                "key": "CumulativeStats"
            };
            socket.send(JSON.stringify(payload));
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