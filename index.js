var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var clients = {};
var clientNum = 0;
var players = [];
var playersForKillCounter = [];

var drops = [];

var mouseX = 0;
var mouseY = 0;
var slope = 0;

var killCounterString = "";
var tempKillCounter = 0;
var killCounterArray = [];

const FRAMES_PER_SECOND = 60;

const SHIP_SPEED = 10;
const TANK_ROTATION_SPEED = Math.PI * -.01;
const BULLET_SPEED = 20;

const hitRadius = 20;

const travelAreaRadius = 10000; // IN PIXELS???

app.get('/', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});

app.use(express.static('public'));

http.listen(3000, function(){
  console.log('listening on *:3000');
});

Array.prototype.clean = function(deleteValue) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == deleteValue) {
			this.splice(i, 1);
			i--;
		}
	}
	return this;
};

function makePlayer(startX, startY, startRotation, mySocketId, color) {
	var isLeftPressed = false;
	var isRightPressed = false;
	var isUpPressed = false;
	var isDownPressed = false
	var isSpacePressed = false
	var player = {
		x:startX,
		y:startY,
		mouseX:0,
		mouseY:0,
		username:"",
		alive:true,
		ablets:0,
		windowWidth:0,
		windowHeight:0,
		color:color,
		imgWidth:0,
		imgHeight:0,
		timeBetweenBullets:0,
		killCounter:0,
		rotation:startRotation,
		socket_id:mySocketId,
		bullets:[],
		numShots:1,
		singleShot:true,
		doubleShot:false,
		tripleShot:false,
		quadrupleShot:false,
		quintupleShot:false,
		outOfBounds:false,
		destructTimer:5000*FRAMES_PER_SECOND,
		framesPerSecond:FRAMES_PER_SECOND,
		keypresses:[isLeftPressed, isRightPressed, isUpPressed, isDownPressed, isSpacePressed],
		makeBullet: function(x, y, dx, dy, rotation, playerX, playerY, mouseX, mouseY) {
			var bullet = {
				x:x,
				y:y,
				dx:dx,
				dy:dy,
				rotation: rotation,
				playerX:playerX,
				playerY:playerY,
				mouseX:mouseX,
				mouseY:mouseY,
				rotation:player.rotation,
				time:0
			}
			this.bullets.push(bullet);
		}
	}
	players.push(player);
	playersForKillCounter.push(player);
}

function makeDrop(startX, startY, type) {
	var drop = {
		x:startX,
		y:startY,
		type:type,
		time:0
	}
	drops.push(drop);
}

function getPlayerById(current_socket_id){
	for(var i = 0; i < players.length; i++){
		if(typeof players[i] !== 'undefined'){
			if(players[i].socket_id === current_socket_id){
				return i;
			}
		}
	}
}

function getPlayerByIdTwo(current_socket_id) {
	for(var i = 0; i < playersForKillCounter.length; i++){
		if(typeof playersForKillCounter[i] !== 'undefined'){
			if(playersForKillCounter[i].socket_id === current_socket_id){
				return i;
			}
		}
	}
}

function updateFrame(){
	killCounterString = "";
	for (playerIter = 0; playerIter < players.length; playerIter++) {
		if(typeof players[playerIter] !== 'undefined'){
			// Increment timer between bullet fires
			players[playerIter].timeBetweenBullets++;

			if (Math.sqrt((players[playerIter].x*players[playerIter].x) + (players[playerIter].y*players[playerIter].y)) > travelAreaRadius) {
				players[playerIter].outOfBounds = true;
				players[playerIter].destructTimer -= 1000;
			} else {
				players[playerIter].outOfBounds = false;
				players[playerIter].destructTimer = 5000*FRAMES_PER_SECOND;
			}

			if (players[playerIter].destructTimer <= 0) {
				players[playerIter].alive = false;
			}

			if (players[playerIter].keypresses.isUpPressed) {
				players[playerIter].y -= SHIP_SPEED;
			}
			if (players[playerIter].keypresses.isDownPressed) {
				players[playerIter].y += SHIP_SPEED;
			}
			if (players[playerIter].keypresses.isLeftPressed) {
				players[playerIter].x += SHIP_SPEED;
			}
			if (players[playerIter].keypresses.isRightPressed) {
				players[playerIter].x -= SHIP_SPEED;
			}
			if (players[playerIter].keypresses.isSpacePressed) {
				if (players[playerIter].timeBetweenBullets > FRAMES_PER_SECOND/4) { // Firerate
					var originalAngle = -1 * Math.atan2((players[playerIter].mouseY - players[playerIter].windowHeight/2),(players[playerIter].mouseX - players[playerIter].windowWidth/2)) * 180 / Math.PI;
					for (var angleShoot1 = 0; angleShoot1 < players[playerIter].numShots; angleShoot1++) {
						var startingAngle = -5 * (players[playerIter].numShots - (angleShoot1 + (players[playerIter].numShots - 1)/2 + 1));
						var nowAngle = originalAngle + startingAngle;
						var initialDy = Math.sin(nowAngle * Math.PI / 180);
						var initialDx = Math.cos(nowAngle * Math.PI / 180);
						var hypotenuse = Math.sqrt((initialDx*initialDx) + (initialDy*initialDy));
						var factor = hypotenuse/BULLET_SPEED;
						var dy = initialDy / factor;
						var dx = initialDx / factor;
						//console.log("dx/Math.sqrt(dx * dx): " + dx/Math.sqrt(dx * dx));
						//console.log("initialDx: " + initialDx);
						//console.log("dx: " + dx);
						//var rotation = players[playerIter].rotation + Math.acos(dx/Math.sqrt(dx * dx));
						//var rotation = Math.acos(dx/Math.sqrt(dx * dx));
						var rotation = Math.acos(initialDx);
						//console.log("rotation: " + rotation);
						players[playerIter].makeBullet(players[playerIter].x, players[playerIter].y, dx, dy, rotation, players[playerIter].x, players[playerIter].y, players[playerIter].mouseX, players[playerIter].mouseY);
					}
					players[playerIter].timeBetweenBullets = 0;
				}
			}
			if (typeof players[playerIter] !== 'undefined') {
				for (var i = 0; i < players[playerIter].bullets.length; i++) {
					players[playerIter].bullets[i].time++
					if (players[playerIter].bullets[i].time > FRAMES_PER_SECOND*4) {
						delete players[playerIter].bullets[i];
					} else {
						players[playerIter].bullets[i].x += players[playerIter].bullets[i].dx;
						players[playerIter].bullets[i].y -= players[playerIter].bullets[i].dy;
						// Collision detection
						for (var j = 0; j < players.length; j++) {
							if ((typeof players[j] !== 'undefined') && (players[j].alive == true) && (typeof players[playerIter].bullets[i] !== 'undefined') && (typeof players[j] !== 'undefined') && (players[playerIter].bullets[i].x > players[j].x - hitRadius) && (players[playerIter].bullets[i].x <= players[j].x + hitRadius) && (players[playerIter].bullets[i].y > players[j].y - hitRadius) && (players[playerIter].bullets[i].y <= players[j].y + hitRadius) && (j != playerIter)) {
								console.log('Player ' + playerIter + ' hit Player ' + j + '!');
								io.sockets.connected[players[playerIter].socket_id].emit('killConfirmed', 'Kill confirmed.');
								players[playerIter].ablets += 10;
								playersForKillCounter[playerIter].killCounter++;
								players[j].alive = false;
								delete players[playerIter].bullets[i];
							}
						}
					}
				}
			}
			players[playerIter].bullets.clean(undefined);
			if(typeof playersForKillCounter[playerIter] !== 'undefined'){
				killCounterArray[playerIter] = playersForKillCounter[playerIter].killCounter;
			}
		}

		players.clean(undefined);
	}
	for (playerIterTwo = 0; playerIterTwo < playersForKillCounter.length; playerIterTwo++) {
		if(typeof playersForKillCounter[playerIterTwo] !== 'undefined'){
			if (playersForKillCounter[playerIterTwo].username.length > 20) {
				var actualUsername = playersForKillCounter[playerIterTwo].username;
				var shortenedUsername = actualUsername.substring(0, 17) + "...";
				killCounterString += "" + shortenedUsername + ": " + playersForKillCounter[playerIterTwo].killCounter + "<br>";
			} else {
				killCounterString += "" + playersForKillCounter[playerIterTwo].username + ": " + playersForKillCounter[playerIterTwo].killCounter + "<br>";
			}
		}
		playersForKillCounter.clean(undefined);
	}

	// Creating drops
	/*
	var dropNumber = Math.round(Math.random()*360) + 1;
	if (dropNumber == 1) {
		makeDrop(0, 0, "fireRate");
		console.log("Firerate drop");
	} else if (dropNumber == 2) {
		makeDrop(0, 0, "power");
		console.log("Power drop");
	} else if (dropNumber == 3) {
		makeDrop(0, 0, "shield");
		console.log("Shield drop");
	}
	*/

	var game_data = {
		players: players,
		killCounterString: killCounterString,
		drops: drops
	};
	io.sockets.emit('all_data', game_data);
}

function encodeHTML(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/\//g, '-');
}

io.on('connection', function(socket){
	io.sockets.emit('connected', "Someone connected.");

	var myColor = '#'+(Math.random()*0xFFFFFF<<0).toString(16);

	var max = Math.floor(travelAreaRadius/(Math.sqrt(2)));
	var min = -max;
	var randStartX = Math.floor(Math.random() * (max - min + 1)) + min; // IN PIXELS???
	var randStartY = Math.floor(Math.random() * (max - min + 1)) + min; // IN PIXELS???
	console.log(randStartX + ", " + randStartY);

	makePlayer(randStartX, randStartY, 0, socket.id, myColor);
	makeDrop(randStartX, randStartY, "fireRate");
	console.log("Firerate drop");

	console.log("a user connected: " + socket.id);
	socket.on('username', function(message) {
		players[getPlayerById(socket.id)].username = encodeHTML(message);
		console.log("username of socket.id " + socket.id + ": " + message);
	});

	socket.on('disconnect', function(){
		console.log("a user disconnected: " + socket.id);
		players.splice(getPlayerById(socket.id),1);
		playersForKillCounter.splice(getPlayerByIdTwo(socket.id),1);
	});

	var indexForShots = getPlayerById(socket.id);

	socket.on('respawn', function() {
		var max = Math.floor(travelAreaRadius/(Math.sqrt(2)));
		var min = -max;
		var randSpawnX = Math.floor(Math.random() * (max - min + 1)) + min; // IN PIXELS???
		var randSpawnY = Math.floor(Math.random() * (max - min + 1)) + min; // IN PIXELS???
		players[indexForShots].x = randSpawnX;
		players[indexForShots].y = randSpawnY;
	});

	socket.on('boughtDoubleShot', function() {
		players[indexForShots].numShots = 2;
		players[indexForShots].singleShot = false;
		players[indexForShots].doubleShot = true;
		players[indexForShots].tripleShot = false;
		players[indexForShots].quadrupleShot = false;
		players[indexForShots].quintupleShot = false;
	});

	socket.on('boughtTripleShot', function() {
		players[indexForShots].numShots = 3;
		players[indexForShots].singleShot = false;
		players[indexForShots].doubleShot = false;
		players[indexForShots].tripleShot = true;
		players[indexForShots].quadrupleShot = false;
		players[indexForShots].quintupleShot = false;
	});

	socket.on('boughtQuadrupleShot', function() {
		players[indexForShots].numShots = 4;
		players[indexForShots].singleShot = false;
		players[indexForShots].doubleShot = false;
		players[indexForShots].tripleShot = false;
		players[indexForShots].quadrupleShot = true;
		players[indexForShots].quintupleShot = false;
	});

	socket.on('boughtQuintupleShot', function() {
		players[indexForShots].numShots = 5;
		players[indexForShots].singleShot = false;
		players[indexForShots].doubleShot = false;
		players[indexForShots].tripleShot = false;
		players[indexForShots].quadrupleShot = false;
		players[indexForShots].quintupleShot = true;
	});

	socket.on('user_input_state', function(data){
		try {
			var index = getPlayerById(socket.id);
			io.sockets.connected[socket.id].emit('yourIndex', index);
			players[index].keypresses.isLeftPressed = data[0];
			players[index].keypresses.isRightPressed = data[1];
			players[index].keypresses.isUpPressed = data[2];
			players[index].keypresses.isDownPressed = data[3];
			players[index].keypresses.isSpacePressed = data[4];
			players[index].mouseX = data[5];
			players[index].mouseY = data[6];
			players[index].windowWidth = data[7];
			players[index].windowHeight = data[8];
			players[index].rotation = data[9];
			players[index].imgWidth = data[10];
			players[index].imgHeight = data[11];
			players[index].alive = data[12];
		} catch (e) {
			console.log(e);
		}
	});
});

//setInterval(function(){updateFrame();}, (1000/FRAMES_PER_SECOND));
setInterval(function(){updateFrame();}, 16);


