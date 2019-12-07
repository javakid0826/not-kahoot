const canv = document.getElementById("mainCanvas");
const ctxt = canv.getContext("2d");
const socket = io();

let host = false;

let gID, id, group = new Group(), hostID;
let users = [], userIds = [];

socket.emit("hello");

ctxt.font = "Bold 50px Consolas";

let advanceButton = new Button(advance);

//Binding the click event on the canv
canv.addEventListener("click", function (e) {
    let mousePos = getMousePos(canv, e);

    if (advanceButton.wasClicked(mousePos)) {
        advanceButton.onClick();
    }
}, false);

//Get the mouse position
function getMousePos(canv, event) {
    var rect = canv.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

socket.on("update", (data) => {
	id = data.id;

	ctxt.fillStyle = "#000000";
	ctxt.clearRect(0, 0, 500, 500);
	ctxt.fillText(gID, 100, 400);
	ctxt.fillText(id, 400, 400);
	for(let i in group.players){
		let p = group.players[i];
		ctxt.fillText(p.name, 250, i + 1);
		console.log(i + 1);
	}
	ctxt.fillStyle = "#FF0000";
	ctxt.fillRect(advanceButton.pos.x, advanceButton.pos.y, advanceButton.size.x, advanceButton.size.y);
});

socket.on("createdGroup", (data) => {
	gID = data.id;
	host = true;
	group = new Group(gID);
});

socket.on("userConnected", newPlayer);

socket.on("connectedToGroup", (data) => {
	console.log(data);
	gID = data.id;
	host = false;
	hostID = data.hostID;
});

socket.on("YELL", () => {
	console.log("AHH");
});

function newPlayer(data){
	users.push(data.name);
	userIds.push(data.id);
	group.addPlayer(data.id, data.name);
}

function advance(){
	if(host){
		if(group.state == 0){
			group.assignRoles();
			socket.emit("updatePlayers", {players: group.getPlayers()});
		}
		group.stateStep();
	}
}

function bindID() {
	let form = $("#idForm").serializeArray();
	let name = form[0].value;
	let id = form[1].value;
	socket.emit("connectToGroup", {id, name});
}

function genID(){
	socket.emit("createGroup");
}

function Player(id, name){
	this.id = id;
	this.name = name;
}

function Group(id = 0) {
	this.players = [];
	this.id = id;
	this.state = 0;

	this.addPlayer = function(ID, name){
		this.players.push(new Player(ID, name));
	}

	this.assignRoles = function(){
		this.players = randomizeArray(this.players);
		this.players[0].role = "M";
		this.players[1].role = "M";
		this.players[2].role = "D";
		this.players[3].role = "H";
	}

	this.stateStep = function(){
		if(this.state == "Day"){
			this.state = "Mafia";
		} else if(this.state == "Mafia"){
			this.state = "Detect";
		} else if(this.state == "Detective"){
			this.state = "Heal";
		} else if(this.state == "Heal"){
			this.state = "Day";
		} else {
			this.state = "Day";
		}
		console.log(this.state);
	}

	this.getPlayers = function(){
		return this.players;
	}
}

function addTestPlayers(){
	for(let i = 0; i < 5; i++){
		newPlayer({id: i, name: "user" + i});
	}
}
