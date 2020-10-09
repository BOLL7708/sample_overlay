function init() {
    var $info = $("#info");
    var $bars = $("#bars");
    var bars = [];

    for (i = 0; i < 8; i++) {
        $bars.append('<div class="barcontainer"><div id="bar' + i + '" class="bar"></div></div>');
        bars[i] = $("#bar" + i);
    }
    console.log(bars);


    loop();

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

