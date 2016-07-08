var app = require('express')();
var express = require('express');
var http = require('http').Server(app);
var io = require('socket.io')(http);

var clients = {};
var clientNum = 0;
var players = [];
var playersForKillCounter = [];

var mouseX = 0;
var mouseY = 0;
var slope = 0;

var killCounterString = "";
var tempKillCounter = 0;
var killCounterArray = [];

const FRAMES_PER_SECOND = 60;

const SHIP_SPEED = 10;
const TANK_ROTATION_SPEED = Math.PI * -.01;
const BULLET_SPEED = 4;

const hitRadius = 20;

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
		ablets:1000000,
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
		keypresses:[isLeftPressed, isRightPressed, isUpPressed, isDownPressed, isSpacePressed],
		rotate:function(rotateLeft) { //rotateLeft is a boolean. If it's true, then the tank will rotate left, otherwise right
			this.rotation += (rotateLeft ? TANK_ROTATION_SPEED : -TANK_ROTATION_SPEED)
		},
		makeBullet: function(x, y, playerX, playerY, mouseX, mouseY, slope) {
			var bullet = {
				x:x,
				y:y,
				playerX:playerX,
				playerY:playerY,
				mouseX:mouseX,
				mouseY:mouseY,
				slope:slope,
				rotation:player.rotation,
				time: 0
			}
			this.bullets.push(bullet);
		}
	}
	players.push(player);
	playersForKillCounter.push(player);
}

function getPlayerById(current_socket_id){
	for(var i = 0; i < players.length; i++){
		if(typeof players[i] !== 'undefined'){
			if(players[i].socket_id === current_socket_id){
				return i;
			}
		}
	}
	//throw "This person: '" + current_socket_id + "' does not have a ship!"
}

function getPlayerByIdTwo(current_socket_id) {
	for(var i = 0; i < playersForKillCounter.length; i++){
		if(typeof playersForKillCounter[i] !== 'undefined'){
			if(playersForKillCounter[i].socket_id === current_socket_id){
				return i;
			}
		}
	}
	//throw "This person: '" + current_socket_id + "' does not have a ship!"
}

function updateFrame(){
	killCounterString = "";
	for (playerIter = 0; playerIter < players.length; playerIter++) {
		if ((players.length == 1) && (typeof players[playerIter] !== 'undefined')) {
			io.sockets.emit('game_over', "It's over.");
		}
		if(typeof players[playerIter] !== 'undefined'){
			// Increment timer between bullet fires
			players[playerIter].timeBetweenBullets++;

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
				if (players[playerIter].timeBetweenBullets > FRAMES_PER_SECOND/50) {
					for (var angleShoot1 = 0; angleShoot1 < players[playerIter].numShots; angleShoot1++) {
						var startingAngle = -5 * (players[playerIter].numShots - 1);
						console.log("startingAngle: " + startingAngle);
						slope = ((players[playerIter].windowHeight/2) - players[playerIter].mouseY)/((players[playerIter].windowWidth/2) - players[playerIter].mouseX);
						var correctSlope;
						if (players[playerIter].x <= players[playerIter].windowWidth/2) {
							correctSlope = 1 * (Math.tan(Math.atan(slope) + (startingAngle + (10 * angleShoot1))));
						} else {
							correctSlope = -1 * (Math.tan(Math.atan(slope) + (startingAngle + (10 * angleShoot1))) + 180);
						}
						players[playerIter].makeBullet(players[playerIter].x, players[playerIter].y, players[playerIter].x, players[playerIter].y, players[playerIter].mouseX, players[playerIter].mouseY, correctSlope);
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
						//if (players[playerIter].numShots == 1) {
							if (players[playerIter].username == "FUCK U") {
								if (players[playerIter].bullets[i].mouseX <= players[playerIter].windowWidth/2) {
									players[playerIter].bullets[i].x -= (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * 40);
									players[playerIter].bullets[i].y -= (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * 40);
								} else {
									players[playerIter].bullets[i].x += (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * 40);
									players[playerIter].bullets[i].y += (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * 40);
								}
							} else {
								if (players[playerIter].bullets[i].mouseX <= players[playerIter].windowWidth/2) {
									players[playerIter].bullets[i].x -= (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
									players[playerIter].bullets[i].y -= (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
								} else {
									players[playerIter].bullets[i].x += (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
									players[playerIter].bullets[i].y += (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
								}
							}
						/*
						} else {
							for (var angleShoot2 = 0; angleShoot2 < players[playerIter].numShots; angleShoot2++) {
								// 1: 0 // 2: -5, 5 // 3: -10, 0, 10 // 4: -15, -5, 5, 15 // 5: -20, -10, 0, 10, 20 // Keep subtracting 5 for starting, and then add five for rest of angles in that players[playerIter].numShots
								var startingAngle = -5 * (players[playerIter].numShots - 1);
								// THIS MIGHT NOT WORK CUZ NOT ONE ANGLE, BUT USING COMPONENTS, MAYBE GET ANGLE FROM COMPONENTS AND GO THAT WAY??? OR SLOPE WHAT???
								if (players[playerIter].username == "FUCK U") {
									if (players[playerIter].bullets[i].mouseX <= players[playerIter].windowWidth/2) {
										players[playerIter].bullets[i].x -= ((Math.cos(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * 40);
										players[playerIter].bullets[i].y -= ((Math.sin(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * 40);
									} else {
										players[playerIter].bullets[i].x += ((Math.cos(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * 40);
										players[playerIter].bullets[i].y += ((Math.sin(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * 40);
									}
								} else {
									if (players[playerIter].bullets[i].mouseX <= players[playerIter].windowWidth/2) {
										players[playerIter].bullets[i].x -= ((Math.cos(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * BULLET_SPEED);
										players[playerIter].bullets[i].y -= ((Math.sin(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * BULLET_SPEED);
									} else {
										players[playerIter].bullets[i].x += ((Math.cos(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * BULLET_SPEED);
										players[playerIter].bullets[i].y += ((Math.sin(Math.atan(players[playerIter].bullets[i].slope)) + startingAngle) * BULLET_SPEED);
									}
								}
							}
						}
						*/
						/*
						if (players[playerIter].username == "FUCK U") {
							if (players[playerIter].bullets[i].mouseX <= players[playerIter].windowWidth/2) {
								players[playerIter].bullets[i].x -= (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * 40);
								players[playerIter].bullets[i].y -= (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * 40);
							} else {
								players[playerIter].bullets[i].x += (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * 40);
								players[playerIter].bullets[i].y += (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * 40);
							}
						} else {
							if (players[playerIter].bullets[i].mouseX <= players[playerIter].windowWidth/2) {
								players[playerIter].bullets[i].x -= (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
								players[playerIter].bullets[i].y -= (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
							} else {
								players[playerIter].bullets[i].x += (Math.cos(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
								players[playerIter].bullets[i].y += (Math.sin(Math.atan(players[playerIter].bullets[i].slope)) * BULLET_SPEED);
							}
						}
						*/
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
			if (((playerIterTwo == (playersForKillCounter.length - 1)) && (playersForKillCounter.length > 1)) || (playersForKillCounter.length == 1)) {
				killCounterString += "" + playersForKillCounter[playerIterTwo].username + ": " + playersForKillCounter[playerIterTwo].killCounter;
			} else {
				killCounterString += "" + playersForKillCounter[playerIterTwo].username + ": " + playersForKillCounter[playerIterTwo].killCounter + ", ";
			}
		}
		playersForKillCounter.clean(undefined);
	}

	var game_data = {
		players: players,
		killCounterString: killCounterString
	};
	io.sockets.emit('all_data', game_data);
}

function encodeHTML(s) {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;').replace(/\//g, '-');
}

io.on('connection', function(socket){
	io.sockets.emit('connected', "Someone connected.");

	var myColor = '#'+(Math.random()*0xFFFFFF<<0).toString(16);

	makePlayer(50, 50, 0, socket.id, myColor);

	console.log("a user connected: " + socket.id);
		socket.on('username', function(message) {
		players[getPlayerById(socket.id)].username = encodeHTML(message);
		console.log("username of socket.id " + socket.id + ": " + message);
	});

	socket.on('disconnect', function(){
		players.splice(getPlayerById(socket.id),1);
		playersForKillCounter.splice(getPlayerByIdTwo(socket.id),1);
	});

	var indexForShots = getPlayerById(socket.id);

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

setInterval(function(){updateFrame();}, 1000/FRAMES_PER_SECOND);
