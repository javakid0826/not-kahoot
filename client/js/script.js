const debug = false;

//region HELPERFUNCS
const renderOptionButtons = function(){
	optionButtons[0].display(ctxt, "#F00");
	optionButtons[1].display(ctxt, "#0F0");
	optionButtons[2].display(ctxt, "#00F");
	optionButtons[3].display(ctxt, "#FF0");

	ctxt.font = "Bold 20px Consolas";
	ctxt.textAlign = "center";
	ctxt.fillStyle = "#000";
	ctxt.fillText(currQuestion.options[0], 125, 350);
	ctxt.fillText(currQuestion.options[1], 175, 450);
	ctxt.fillText(currQuestion.options[2], 325, 350);
	ctxt.fillText(currQuestion.options[3], 375, 450);
}

//Get the mouse position
const getMousePos = (canv, event) =>  {
    var rect = canv.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}
//endregion HELPERFUNCS

//region HOSTFUNCS
const madeGroup = (data) => {
	console.log(data);
	hostID = -1;
	groupID = data.id;
	group = new Group(groupID);
	if(debug){
		addTestPlayers();
	}
}

const newPlayer = (data) => {
	console.log("HEY WE GOT ANOTHER ONE");
	console.log(data);
	group.addPlayer(data.id, data.name, data.answers);
}

const advance = () => {
	if(hostID == -1){
		group.stateStep();
	}
}

const genID = () => {
	socket.emit("MakeAGroup");
}

const removeUser = (name) => {
	for(let user of group.players){
		if(user.name == name){
			socket.emit("YEET", user.id);
		}
	}
}

const removeAllUsers = () => {
	for(let user of group.players){
		socket.emit("YEET", user.id);
	}
}

const snap = () => {
	let randUsers = randomize(group.players);
	for(let i = 0; i < randUsers.length / 2; i++){
		socket.emit("YEET", randUsers[i].id);
	}
}
//endregion HOSTFUNCS

//region CLIENTFUNCS
const addedToGroup = (data) => {
	groupID = data.id;
	hostID = data.hostID;

	let qDiv = $("#questions")[0];
	let form = document.createElement("form");
	form.id = "answers";

	for(let q in questions){
		let questLabel = document.createElement("label");
		questLabel.for = q;
		questLabel.innerHTML = questions[q].question;
		form.appendChild(questLabel);
		for(let a in questions[q].answers){
			form.appendChild(document.createElement("br"));
			let aB = document.createElement("input");
			aB.type = "radio";
			aB.name = q;
			aB.value = a;
			let lab = document.createElement("label");
			lab.innerHTML = aB.outerHTML + " " + questions[q].answers[a];
			form.appendChild(lab);
		}
		form.appendChild(document.createElement("br"));
		form.appendChild(document.createElement("br"));
	}

	let submitButton = document.createElement("input");
	submitButton.type = "button";
	submitButton.value = "Submit Answers";
	submitButton.addEventListener("click", getAnswers);

	form.appendChild(submitButton);

	if(!debug){
		canv.style.display = "none";
		qDiv.appendChild(form);
	}
}

const getAnswers = () => {
	console.log("ANSWERS");
	canv.style.display = "inline-block";
	let form = $("#answers");
	let answers = form.serializeArray();
	socket.emit("answered", {id, answers: answers.map(answer => answer.value), hostID});
	$("#questions").innerHTML = "";
}

const bindID = () =>  {
	let form = $("#idForm").serializeArray();
	let name = form[0].value || "Ben";
	let hostID = form[1].value || 0;
	socket.emit("ConnectToGroup", {id: hostID, name});
	if(debug){
		socket.emit("answered", {hostID, name, answers: [0, 0, 0, 0, 0, 0], id});
	}
}

const answer = (answer) => {
	console.log("I ANSWERED");
	answered = true;
	socket.emit("AnswerQuestion", {answer, hostID});
}
//endregion CLIENTFUNCS

//region CLASSES
const Socket = function(socket, isTest = false){
	this.isTestPlayer = isTest;

	//region GLOBALEVENTS
	socket.on("ID", (data) => {
		id = data.id;
	});
	//endregion GLOBALEVENTS

	//region CLIENTEVENTS
	socket.on("AddedToGroup", addedToGroup);

	socket.on("AnswerThis", (data) => {
		if(!this.isTestPlayer){
			answered = false;
			currQuestion = new Question(data.name, data.question, data.options);
			console.log(currQuestion);
			socket.emit("HeyAThingHappend", {hostID, id});
		}
	});

	socket.on("UpdateButForPeasants", (data) => {
		if(debug){
			console.log("ClientUpdating");
		}
		if(!this.isTestPlayer){
			ctxt.clearRect(0, 0, 500, 500);
			if(!answered){
				renderOptionButtons();
			}
		}
	});
	//endregion CLIENTEVENTS

	//region HOSTEVENTS
	//Main update event
	socket.on("update", data => {
		if(debug){
			console.log("HostUpdating");
		}
		id = data.id;
		ctxt.clearRect(0, 0, 500, 500);
		try {
			if(group.state != "AddingPlayers"){
				renderOptionButtons();
			}

			if(group.state == "AddingPlayers"){
				ctxt.fillStyle = "#000000";
				ctxt.fillText(groupID, 100, 400);
				ctxt.fillText(id, 400, 400);
				for(let i in group.players){
					let p = group.players[i];
					ctxt.fillText(p.name, 250, (+i + 1) * 50);
				}
			} else if(group.state == "Asking"){
				let packet = {sendTo: group.players.map((player) => player.id)};
				socket.emit("updatePlayers", packet);

				ctxt.fillStyle = "#000";
				ctxt.font = "Bold 30px Consolas";

				ctxt.fillText(currQuestion.name, 250, 100);

				let questionWords = currQuestion.question.split(" ");
				let questionParts = [""];
				let currPart = 0;
				while (questionWords.length != 0) {
					if(questionParts[currPart].length + questionWords[0].length > lineChars){
						currPart++;
						questionParts[currPart] = "";
					}
					questionParts[currPart]+= " " + questionWords.shift();
				}
				for(let i in questionParts){
					ctxt.fillText(questionParts[i], canv.width / 2, 150 + i * 30);
				}
			} else if(group.state == "Results"){
				for(let i in answerStats){

					let x = 150 + i * 50

					let fillColText = "";
					if(i == 0){
						fillColText = "#F00";
					} else if(i == 1){
						fillColText = "#0F0";
					} else if(i == 2){
						fillColText = "#00F";
					} else {
						fillColText = "#FF0";
					}
					ctxt.fillStyle = fillColText;
					ctxt.fillRect(x, 200 - (answerStats[i] * 20), 30, answerStats[i] * 20);

					let drawChar = "X";

					if(i == currQuestion.getAnswerIndex()){
						drawChar = "\u2713";
					}

					ctxt.fillStyle = "#000";
					ctxt.fillText(drawChar, x + 15, 230);
				}
			}
			ctxt.fillStyle = "#FF0000";
			ctxt.fillRect(advanceButton.pos.x, advanceButton.pos.y, advanceButton.size.x, advanceButton.size.y);
		} catch (e) {
			console.log(e);
		}
	});

	//For when a group is successfully created
	socket.on("YouMadeAGroup", madeGroup);

	//When a new user joins
	socket.on("UserDetected", newPlayer);

	socket.on("HeySomeoneAnswered", data => {
		if(debug){
			console.log(data);
		}
		usersAnswered++;
		answerStats[data.answer]++;
	});

	socket.on("WeLostOne", data => {
		group.removeUser(data.id);
	});
	//endregion HOSTEVENTS

	this.on = (channel, func) => {
		socket.on(channel, func);
	}

	this.emit = (channel, data) => {
		socket.emit(channel, data);
	}

	socket.emit("hello");
}

const Question = function(name, question, options, answer){
	this.question = question;
	this.options = options;
	this.answer = answer;
	this.name = name;

	this.getAnswerIndex = () => {
		for(let i in this.options){
			if(this.options[i] == this.answer){
				return i;
			}
		}
	}
}

const Player = function(id, name, answers) {
	this.id = id;
	this.name = name;
	this.answers = answers;
}

const Group = function(id) {
	this.players = [];
	this.id = id;
	this.state = "AddingPlayers";

	this.addPlayer = (id, name, answers) => {
		this.players.push(new Player(id, name, answers));
	}

	this.removeUser = (id) => {
		for(let i in this.players){
			if(this.players[i].id == id){
				this.players.splice(i, 1);
			}
		}
	}

	this.stateStep = () => {
		switch(this.state){
			case "AddingPlayers":
			case "Results":
				usersAnswered = 0;
				answerStats = [0, 0, 0, 0];
				this.state = "Asking";
				this.generateQuestion();
				break;
			case "Asking":
				this.state = "Results";
				break;
		}
	}

	this.generateQuestion = () => {
		let questionIndex = Math.floor(random(questions.length));
		let questionObj = questions[questionIndex];
		let answerOptions = Array.from(questionObj.answers);

		let playerObj = this.players[Math.floor(random(this.players.length))];
		let playerAnswers = playerObj.answers;
		let answerIndex = playerAnswers[questionIndex];

		let question = questionObj.question;
		let answer = questionObj.answers[answerIndex];

		console.log(playerObj);

		let options = [];

		options.push(answer);

		answerOptions.splice(answerIndex, 1);

		answerOptions = randomize(answerOptions);

		options.push(...answerOptions.slice(0, 3));

		options = randomize(options);

		currQuestion = new Question(playerObj.name, question, options, answer);

		let packet = currQuestion;
		packet.sendTo = this.players.map(player => player.id);

		socket.emit("Ask", packet);

		if(debug){
			console.log(currQuestion);
		}
	}
}
//endregion CLASSES

//region CONSTANTS
const canv = document.getElementById("mainCanvas");
const ctxt = canv.getContext("2d");

const socket = new Socket(io());

const lineChars = Math.floor(canv.width / 17);

const questions = [
	{
		question: "What is your favorite color?",
		answers: [
			"Blue",
			"Red",
			"Yellow",
			"White",
			"Black",
			"Purple",
			"Green"
		]
	},
	{
		question: "Is ( ͡° ͜ʖ ͡°) an emoji or an emoticon?",
		answers: [
			"Emoji",
			"Emoticon",
			"Both",
			"Neither",
			"What kind of question is this"
		]
	},
	{
		question: "What color are your eyes?",
		answers: [
			"Blue",
			"Green",
			"Brown",
			"Other"
		]
	},
	{
		question: "How many pairs of shoes do you own?",
		answers: [
			"1-5",
			"6-10",
			"11-20",
			"21-30",
			"30+"
		]
	},
	{
		question: "What is the most common shortcut to open developer tools?",
		answers: [
			"Ctrl + Alt + Shift + I",
			"Ctrl + Alt + I",
			"Ctrl + Shift + I",
			"Alt + Shift + I",
			"Ctrl + I",
			"Alt + I",
			"Shift + I",
			"F12"
		]
	},
	{
		question: "How Stupid do you think these questions are?",
		answers: [
			"Really Stupid",
			"Really Stupid",
			"Really Stupid",
			"Really Stupid"
		]
	}
];

let optionButtons = [];
for(let i = 0; i < 2; i++){
	for(let j = 0; j < 2; j++){
		optionButtons.push(new Button(function() { answer((i * 2) + j) }, i * 250, 300 + j * 100, 250, 100));
	}
}
//endregion CONSTANTS

//region VARIABLES
let id, hostID, groupID, answered, usersAnswered = 0;
let group, currQuestion;
let answerStats = [0, 0, 0, 0];
//endregion VARIABLES

ctxt.font = "Bold 30px Consolas";
ctxt.textAlign = "center";

let advanceButton = new Button(advance);

$("document").ready(function(){
	if(debug){
		genID();
	}
});

//Binding the click event on the canv
canv.addEventListener("click", function (e) {
    let mousePos = getMousePos(canv, e);

	for(let optButton of optionButtons){
		if(optButton.wasClicked(mousePos)) {
			optButton.onClick();
		}
	}

    if (advanceButton.wasClicked(mousePos)) {
        advanceButton.onClick();
    }
}, false);

const addTestPlayers = () => {
	for(let i = 0; i < 5; i++){
		let answerIndices = [];
		for(let q in questions){
			answerIndices[q] = Math.floor(random(questions[q].answers.length));
		}
		let p = new Socket(io(), true);
		p.emit("ConnectToGroup", {id: groupID, name: "user" + i});
		p.on("ID", (data) => {
			console.log(data.id);
			newPlayer({id: data.id, name: "user" + i, answers: answerIndices});
		});
	}
}
