//region REQUIRES
const express = require("express");
const app = express();
const server = require("http").Server(app);
const path = require("path");
//endregion REQUIRES

//region CONSTANTS
const debug = false;

//Whether or not to use the local version of my library or the github pages one
const localLib = false;

//Either its going to be the port heroku makes us use or it is going to be 2000
const PORT = process.env.PORT || 2000;
//endregion CONSTANTS

//region HELPERFUNCS
const findHost = id => {
	for(let i in HOSTS){
		if(HOSTS[i].groupID == id){
			return i;
		}
	}
	return -1;
}
//endregion HELPERFUNCS

//region VARIABLES
//All of the connected sockets
let SOCKET_LIST = [];

//All of the clients that are connected that are assigned as hosts
let HOSTS = [];
//endregion VARIABLES

//region SETTING_UP_THE_SERVER
//Actually use the port
server.listen(PORT);

//Hey it worked let me know
console.log("server started on port " + PORT);

//When you try to get the default path (/)
app.get("/", (req, res) => {
	//Just give 'em the index.html file don't worry about it
	res.sendFile(__dirname + "/client/index.html");
});

//Either assign the local or CDN version of my library to the shorthand "/methlib" globally
app.all("/methlib/*", (req, res) => {
	if(localLib){
		console.log("Using Local");
		res.sendFile(path.resolve(__dirname + "/../methlib-js/methlib.js"));
	} else {
		console.log("Using CDN");
		res.redirect("https://javakid0826.github.io/Methlib-js/methlib.js");
	}
});

//Do the same thing with "/client" but instead of library just do the client folder where all of the juicy stuff is
app.use("/client", express.static(__dirname + "/client"));
//endregion SETTING_UP_THE_SERVER

const io = require("socket.io")(server, {});

//region SOCKETSTUFF
//When the socket first connects
io.sockets.on("connection", socket => {
	//region SETUP
	//Make the ID equal to the length of the array of sockets so we don't get any duplicates
	socket.id = SOCKET_LIST.length;
	socket.name = "";
	SOCKET_LIST[socket.id] = socket;

	console.log("socket connection");

	//Tell the socket what its new ID is
	socket.emit("ID", {id: socket.id});
	//endregion SETUP

	//region GLOBALEVENTS
	//When a socket disconnects remove it from the array
	socket.on("disconnect", () => {
		console.log(socket.connectedID);
		if(socket.connectedID != undefined){
			console.log(socket.id);
			try {
				HOSTS[socket.connectedID].emit("WeLostOne", {id: socket.id});
			} catch (e) {
				console.log(e);
			}
		}
		delete SOCKET_LIST[socket.id];
	});
	//endregion GLOBALEVENTS

	//Events Coming From Hosts
	//region HOSTEVENTS
	//When someone tries to make a group
	socket.on("MakeAGroup", () => {
		let groupID = HOSTS.length;
		socket.groupID = groupID;
		HOSTS[groupID] = socket;
		socket.emit("YouMadeAGroup", {groupID});
	});

	//When the host tells us to go update the players aswell (because socket.io is stupid and the host can't do it directly)
	socket.on("updatePlayers", data => {
		for(let i of data.sendTo){
			SOCKET_LIST[i].emit("UpdateButForPeasants");
		}
	});

	//When the host generates a question send it to all the players
	socket.on("Ask", data => {
		console.log(data);
		for(let index of data.sendTo){
			SOCKET_LIST[index].emit("AnswerThis", {name: data.name, question: data.question, options: data.options});
		}
	});

	socket.on("YEET", id => {
		console.log(id);
		SOCKET_LIST[id].disconnect();
	});
	//endregion HOSTEVENTS

	//Events Coming From Clients
	//region CLIENTEVENTS
	//When a client tries to connect to a group
	socket.on("ConnectToGroup", data => {
		console.log(data);
		let groupID = findHost(data.groupID);
		if(groupID != -1){
			console.log("Connecting to group");
			if(socket.groupID != undefined){
				delete HOSTS[socket.groupID];
			}
			SOCKET_LIST[socket.id].connectedID = groupID;
			SOCKET_LIST[socket.id].name = data.name;
			socket.emit("AddedToGroup", {groupID});
		}
	});

	//When a client finishes answering the questionnare
	socket.on("answered", data => {
		console.log(data);
		console.log(HOSTS.map(host => host.groupID));
		let groupID = findHost(data.groupID);
		if(groupID != -1){
			let userObj = {name: SOCKET_LIST[data.id].name, id: data.id, answers: data.answers};
			console.log(userObj);
			try {
				HOSTS[groupID].emit("UserDetected", userObj);
			} catch (e) {
				console.log(e);
			}
		}
	});

	//When a client answers a question send the answer back to the host
	socket.on("AnswerQuestion", data => {
		try {
			HOSTS[data.groupID].emit("HeySomeoneAnswered", {answer: data.answer});
		} catch (e) {
			console.log(e);
		}
	})
	//endregion CLIENTEVENTS
});
//endregion SOCKETSTUFF

setInterval(function(){
	for(let i in HOSTS){
		let socket = HOSTS[i];
		socket.emit("update");
	}
}, 1000/60)
