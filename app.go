package main

import (
	"fmt"
	MQTT "github.com/eclipse/paho.mqtt.golang"
	"log"
	"net/http"
	"os"
	"sync"
	"time"
	"runtime"
	"os/exec"
)

func openSystemBrowser(url string) error {
	var cmd string
	var args []string

	switch runtime.GOOS {
	case "windows":
		cmd = "cmd"
		args = []string{"/c", "start"}
	case "darwin":
		cmd = "open"
	default: //  linux, *bsd
		cmd = "xdg-open"
	}
	args = append(args, url)
	return exec.Command(cmd, args...).Start()
}

// Gamer Status
const (
	Unassigned = iota
	WaitForJoin
	Joined
)

type players struct {
	colors      [8]string
	gamerStatus [8]int
}

func initGame() *players {
	g := players{}
	g.colors = [8]string{"Green", "Orange", "White", "Blue", "Red", "Yellow", "Purple", "Superbright"}
	return &g
}

var game *players
//var playerJoinedEvent chan string
var lock sync.RWMutex

// define a function for the default message handler
var f MQTT.MessageHandler = func(client MQTT.Client, msg MQTT.Message) {
	fmt.Printf("TOPIC: %s\n", msg.Topic())
	p := string(msg.Payload())
	fmt.Printf("MSG: %s\n", p)

	switch msg.Topic() {
	case "GamerDisconnect":
		for slot, player := range game.colors {
			if p == player {
				fmt.Println("client disconnected:", player)
				game.gamerStatus[slot] = Unassigned
				return
			}
		}
	case "GamerJoined":
		lock.Lock()
		defer lock.Unlock()
		for slot, status := range game.gamerStatus {
			if status == WaitForJoin && p == game.colors[slot] {
				game.gamerStatus[slot] = Joined
				return
			}
		}
	}
}

// Give a chance for gamer to connect
func joinGamer(slotToAssign int) {
	time.Sleep(time.Second * 2)
	lock.Lock()
	defer lock.Unlock()
	if game.gamerStatus[slotToAssign] == WaitForJoin {
		game.gamerStatus[slotToAssign] = Unassigned
	}
}

func subscribeBackend(c MQTT.Client, topic string) {
	if token := c.Subscribe(topic, 0, nil); token.Wait() && token.Error() != nil {
		fmt.Println(token.Error())
		os.Exit(1)
	}
}

func main() {
	opts := MQTT.NewClientOptions().AddBroker("tcp://localhost:1883")
	opts.SetClientID("backend")
	opts.SetDefaultPublishHandler(f)

	// create and start a client using the above ClientOptions
	c := MQTT.NewClient(opts)
	if token := c.Connect(); token.Wait() && token.Error() != nil {
		panic(token.Error())
	}
	defer c.Disconnect(250)

	subscribeBackend(c, "GamerDisconnect")
	subscribeBackend(c, "GamerJoined")

	// Setup Game
	game = initGame()
	//playerJoinedEvent = make(chan string)
	lock = sync.RWMutex{}
/*
	go func() {
		for {
			time.Sleep(time.Second)
			fmt.Println(game.gamerStatus)
		}
	}()*/

	generateGamerId := func(w http.ResponseWriter, r *http.Request) {
		lock.Lock()
		defer lock.Unlock()

		for slot, status := range game.gamerStatus {
			if status == Unassigned {
				fmt.Fprintf(w, "%s", game.colors[slot])
				game.gamerStatus[slot] = WaitForJoin
				go joinGamer(slot)
				return
			}
		}

		fmt.Fprintf(w, "%d", -1) // no open slot
	}
	http.HandleFunc("/requestjoin", generateGamerId)

	log.Println("Starting Web Server")
	http.Handle("/", http.FileServer(http.Dir("./static")))
	go func() {
		time.Sleep(time.Second*2)
		openSystemBrowser("http://localhost")
	}()
	log.Fatal(http.ListenAndServe(":80", nil))
}
