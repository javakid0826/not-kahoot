const express = require("express");
const app = express();
const server = require("http").Server(app);

const PORT = process.env.PORT || 2000;

server.listen(PORT);
console.log("server started on port " + PORT);

app.get("/", (req, res) => {
	res.sendFile(__dirname + "/client/index.html");
});

app.use("/client", express.static(__dirname + "/client"));

let SOCKET_LIST = [];

let HOSTS = [];

const io = require("socket.io")(server, {});

io.sockets.on("connection", (socket) => {
	socket.id = SOCKET_LIST.length;
	SOCKET_LIST[socket.id] = socket;

	console.log("socket connection");

	socket.on("hello", (data) => {
		console.log("HI");
	});

	socket.on("disconnect", () => {
		delete SOCKET_LIST[socket.id];
	});

	socket.on("connectToGroup", (data) => {
		let hostID = connectToGroup(data.id);
		if(hostID != false){
			delete HOSTS[socket.id];
			let userObj = {name: data.name, id: socket.id};
			HOSTS[hostID].emit("userConnected", userObj);
			socket.emit("connectedToGroup", {id: data.id, hostID});
		}
	});

	socket.on("createGroup", () => {
		socket.groupID = HOSTS.length;
		HOSTS[socket.id] = socket;
		socket.emit("createdGroup", {id: socket.groupID});
	});

	socket.on("updatePlayers", (data) => {
		for(let i in data.players){
			SOCKET_LIST[data.players[i].id].emit("YELL");
		}
	});
});

function connectToGroup(id){
	for(let i in HOSTS){
		if(HOSTS[i].groupID == id){
			return i;
		}
	}
	return false;
}

setInterval(function(){
	for(let i in SOCKET_LIST){
		let socket = SOCKET_LIST[i];
		socket.emit("update", {id: socket.id});
	}
}, 1000/60)
