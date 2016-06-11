var socket = io();

var c = document.getElementById("myCanvas");
var ctx = c.getContext("2d");
var shipWidth = 50; // placeholder until image loads
var shipHeight = 50; // placeholder until image loads
var ready = 'b';
const radius = 5;

var rightkeydown = false;
var leftkeydown = false;
var upkeydown = false;
var downkeydown = false;
var spacekeydown = false;

function sendData(){
	var data = [rightkeydown, leftkeydown, upkeydown, downkeydown, spacekeydown];
	socket.emit('user_input_state', data);
	console.log("trying to send user input");
}

window.onkeydown = function(e){
	var key=e.keyCode ? e.keyCode : e.which;
	if (key===65) leftkeydown = true;
	if (key===68) rightkeydown = true;
	if (key===87) upkeydown = true;
	if (key===83) downkeydown = true;
	if (key===32) spacekeydown = true;
	sendData();
}

window.onkeyup = function(e){
	var key=e.keyCode ? e.keyCode : e.which;
	if (key===65) leftkeydown = false;
	if (key===68) rightkeydown = false;
	if (key===87) upkeydown = false;
	if (key===83) downkeydown = false;
	if (key===32) spacekeydown = false;
	sendData();
}

function drawPlayer(x, y, width, height, degrees, player) {
	ctx.save();

	ctx.beginPath();

	// move the rotation point to the center of the rect
    //ctx.translate(x + width / 2, y + height / 2);
    // rotate the rect
    //ctx.rotate(degrees);

	ctx.arc(x, y, 10, 0, Math.PI*2, true); 
	ctx.closePath();
	ctx.fill();            	

	ctx.restore();
}

function drawBullet(bullet) {
	var x = bullet.x;
	var y = bullet.y;
	ctx.beginPath();
	ctx.arc(x, y, radius, 0, 2 * Math.PI);
	ctx.fillStyle = 'black';
	ctx.fill();
}

socket.on('all_data', function(data){
	ctx.clearRect(0, 0, c.width, c.height);

	for(var i = 0; i < data.players.length; i++){
		drawPlayer(data.players[i].x, data.players[i].y, width, height, data.players[i].rotation, i);
		for (var i = 0; i < data.players[i].bullets.length; i++) {
			drawBullet(data.players.bullets[i]);
		}
	}
});











