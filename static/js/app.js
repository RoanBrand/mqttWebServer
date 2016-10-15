/**
 * Created by RoanB on 2016-07-13.
 */
var mqttClient;
var colours = ["Green", "Orange", "White", "Blue", "Red", "Yellow", "Purple", "Superbright"];

function enableColor(playerColor) {
    var handle = $('#stats-' + playerColor);
    switch (playerColor) {
        case "Green":
            handle.css({"background-color": "#43a047"});
            break;
        case "Orange":
            handle.css({"background-color": "#ff8f00"});
            break;
        case "White":
            handle.css({"background-color": "#fefefe"});
            break;
        case "Blue":
            handle.css({"background-color": "#2979ff"});
            break;
        case "Red":
            handle.css({"background-color": "#e53935"});
            break;
        case "Yellow":
            handle.css({"background-color": "#ffeb3b"});
            break;
        case "Purple":
            handle.css({"background-color": "#9575cd"});
            break;
        case "Superbright":
            handle.css({"background-color": "#2979ff"});
            break;
    }
}

function incomingMessageHandler(message) {
    switch (message.destinationName) {
        case "GamerDisconnect":
            console.info("Gamer disconnected: " + message.payloadString);
            $('#stats-' + message.payloadString).css({"background-color": "#f5f5f5"});
            break;
        case "GamerJoined":
            enableColor(message.payloadString);
            break;

    }
}

// Start
$(function () {
    $.get("requestjoin", function(resp) {
        var view = $("#contentID");

        if (resp == -1) {
            view.append('<div class="page-header"><h1>Failed to connect</h1></div>');
            return;
        }

        var gamerName = resp.toString();

        mqttClient = new Paho.MQTT.Client(location.hostname, 8000, "", gamerName);

        mqttClient.onMessageArrived = incomingMessageHandler;

        mqttClient.onConnectionLost = function (response) {
            alert("Connection lost");
        };

        var will = new Paho.MQTT.Message(gamerName);
        will.destinationName = "GamerDisconnect";



        var options = {
            willMessage: will,
            keepAliveInterval: 5,
            cleanSession: true,
            onSuccess: function () {
                var joinMsg = new Paho.MQTT.Message(gamerName);
                joinMsg.destinationName = "GamerJoined";
                mqttClient.send(joinMsg);

                // Button
                var html = '<div class="page-header"><h1>Connected! You are ' + gamerName + '</h1></div>';
                html += '<div class="row">';
                html += '<div class="col-xs-4"></div>';
                html += '<div class="col-xs-4">';
                html += '<button id="toggle-led" class="btn btn-primary" style="width: 100%" type="submit">Toggle!</button>';
                html += '</div>';
                html += '<div class="col-xs-4"></div>';
                html += '</div>';
                view.append(html);
                mqttClient.subscribe("GamerJoined");
                mqttClient.subscribe("GamerDisconnect"); // can get confirmation from borker before starting game?

                // Stats
                html = '<div class="panel panel-default" style="margin-top: 30px; margin-bottom: 30px;">';
                for (var i = 0; i < 2; i++) {
                    html += '<div class="row">';
                    for (var j = 0; j < 4; j++) {
                        var colour = colours[4*i + j];
                        html += '<div class="col-xs-3">';
                        html += '<div id="stats-' + colour + '" class="well well-sm">' + colour + '</div>';
                        html += '</div>';
                    }
                    html += '</div>';
                }
                html += '</div>';
                view.append(html);




                $("#toggle-led").click(function () {
                    var msg;
                    switch (gamerName) {
                        case "Green":
                            msg = new Paho.MQTT.Message("0t");
                            break;
                        case "Orange":
                            msg = new Paho.MQTT.Message("1t");
                            break;
                        case "White":
                            msg = new Paho.MQTT.Message("2t");
                            break;
                        case "Blue":
                            msg = new Paho.MQTT.Message("3t");
                            break;
                        case "Red":
                            msg = new Paho.MQTT.Message("4t");
                            break;
                        case "Yellow":
                            msg = new Paho.MQTT.Message("5t");
                            break;
                        case "Purple":
                            msg = new Paho.MQTT.Message("6t");
                            break;
                        case "Superbright":
                            msg = new Paho.MQTT.Message("7t");
                            break;
                    }
                    msg.destinationName = "Q";
                    mqttClient.send(msg);
                });
            },
            onFailure: function () {
                view.append('<div class="page-header"><h1>Failed to connect</h1></div>');
            }
        };

        mqttClient.connect(options);
    });
});
