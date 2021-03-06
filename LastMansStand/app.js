'use strict';
/*
	draw menu,
	on start, request animation frame
	run game
	on lose destroy request animation frame
	draw lose menu

	AI, general physics, special physics, collision, render
	zombie chooses a random direction in the opposite quadrant and walks there.

	TODO: massive memory leak somwhere? wtf is going on drops from 60 to 5 fps
		after 1 minute

	10-20 ammo given
	zombies spawn from 0.5s to 2s
	
	//TODO Change the the scale of everything on resize so everything only has
		to be resized once and can be drawn at new native size after.
*/

const INV_ROOT_2 = 0.70710678118,
	GAME_DISP_HEIGHT = 534.0,
	GAME_DISP_WIDTH = 766.0,
	GAME_DISP_RATIO = GAME_DISP_HEIGHT / GAME_DISP_WIDTH,
	QS_GAME_DISP_HEIGHT = GAME_DISP_HEIGHT * GAME_DISP_HEIGHT / 16.0, // (GDH/2)^2
	BG_COLOR = "#009000";

var canvas, context, spritesheet, tpl, prevFrameTime, currFrameTime, nextZombieSpawnTime,
	canvasOffsetX = 0,
	canvasOffsetY = 0,
	mousePosX = 0,
	mousePosY = 0,
	dispScale = 1,
	gameState = 0, // 0 = Start menu, 1 = In game, 2 = Game over
	invRatio = GAME_DISP_WIDTH / 2.0,
	keyStates = new Array(256).fill(0),
	zombieCap = 64, // Add button in menu to change spawn cap
	entityId = 0,
	entities = {
		"Player": [],
		"Zombie": [],
		"Bullet": [],
		"Sandbags": [],
		"Supplies": [],
		"Blood": []
	},
	spritemap = {
		"blood": [[533, 1, 132, 106]],
		"bullet": [[1, 1, 10, 14]],
		"bulletcase": [[35, 1, 24, 24]],
		"crosshair": [[13, 1, 20, 20]],
		"ground": [[1, 109, 766, 534]],
		"main": [[1, 645, 766, 534], [1, 1181, 766, 534]],
		"player": [[422, 1, 35, 52], [459, 1, 35, 52], [422, 1, 35, 52], [496, 1, 35, 52]],
		"sandbag": [[61, 1, 19, 25]],
		"sandbags": [[199, 1, 134, 47]],
		"zombierun": [[82, 1, 37, 45], [121, 1, 37, 45], [82, 1, 37, 45], [160, 1, 37, 45]],
		"zombiewalk": [[335, 1, 27, 48], [364, 1, 27, 48], [335, 1, 27, 48], [393, 1, 27, 48]]
	};

function main() {
	canvas = document.getElementById('canvas');
	context = canvas.getContext('2d');

	spritesheet = new Image();
	// Draw start menu
	spritesheet.onload = function () { draw_bg(spritemap["main"][0]); };
	spritesheet.src = "res/spritesheet.png";

	resize();
	add_event_listeners();

	console.log("Application successfully initialized");
}

function add_event_listeners() {
	window.addEventListener('resize', resize);
	window.addEventListener('mousemove', function (event) {
		mousePosX = (event.clientX - canvasOffsetX) / dispScale;
		mousePosY = (event.clientY - canvasOffsetY) / dispScale;
	});

	document.addEventListener('keydown', function (event) { keyStates[event.keyCode] = 1; });
	document.addEventListener('keyup', function (event) { keyStates[event.keyCode] = 0; });
	document.addEventListener('keypress', key_press);
	document.addEventListener('click', click);
}

function resize() {
	if (window.innerHeight / window.innerWidth > GAME_DISP_RATIO) {
		canvas.width = window.innerWidth;
		canvas.height = window.innerWidth * GAME_DISP_RATIO;
	} else {
		canvas.height = window.innerHeight;
		canvas.width = window.innerHeight / GAME_DISP_RATIO;
	}

	invRatio = canvas.height / (GAME_DISP_RATIO + GAME_DISP_RATIO);
	dispScale = canvas.width / 766.0;

	var canvasRect = canvas.getBoundingClientRect();
	canvasOffsetX = canvasRect.left;
	canvasOffsetY = canvasRect.top;

	context.fillStyle = BG_COLOR;
	if (gameState == 0) {
		draw_bg(spritemap["main"][0]);
	} else if (gameState == 2) {
		draw_bg(spritemap["main"][1]);
	}
}

function key_press(event) {
	// Start game loop
	if ((gameState == 0 || gameState == 2) && (event.keyCode == 82 || event.which == 114)) {
		start_game();
	}
}

function click() {
	if (gameState == 1)
		entities["Bullet"].push(new Bullet(entities["Player"][0]));
}

function start_game() {
	entities["Player"].push(new Player());
	// Spawn a zombie in 5 seconds after game starts
	nextZombieSpawnTime = performance.now() / 1000.0 + 5;
	gameState = 1;

	context.fillStyle = BG_COLOR;

	console.log("Game started");

	//testing
	/*
	window.setInterval(function() {
		entities["Zombie"].forEach(function(zombie) {
			entities["Bullet"].push(new Bullet(zombie));
		});
	}, 100);
	*/

	prevFrameTime = performance.now() / 1000;
	window.requestAnimationFrame(update);
}

function update() {
	currFrameTime = performance.now() / 1000.0;
	tpl = (currFrameTime - prevFrameTime);
	prevFrameTime = currFrameTime;

	try_spawn_zombie();
	update_physics();
	draw_frame();

	window.requestAnimationFrame(update);
}

function try_spawn_zombie() {
	if (currFrameTime >= nextZombieSpawnTime && entities["Zombie"].length < zombieCap) {
		// spawn in packs of 1-3
		for (var i = 0; i < Math.random() * 3; ++i) {
			nextZombieSpawnTime = currFrameTime + 2 + Math.random() * 3;
			entities["Zombie"].push(new Zombie());
		}
	}
}

function update_physics() {
	entities["Player"].forEach(function (player) {
		player.apply_physics();
	});

	entities["Zombie"].forEach(function (zombie) {
		zombie.apply_physics();
	});

	entities["Bullet"].forEach(function (bullet) {
		bullet.apply_physics();
	});
}

function draw_frame() {
	context.fillRect(0, 0, canvas.width, canvas.height);

	draw_bg(spritemap["ground"][0]);

	for (var entityType in entities) {
		entities[entityType].forEach(function (entity) {
			entity.draw();
		});
	};
}

function draw_bg(sprite) {
	context.drawImage(spritesheet, sprite[0], sprite[1], sprite[2], sprite[3],
		0, 0, sprite[2] * dispScale, sprite[3] * dispScale);
}

// Add rotation, transparency, and draw all objects from their centers
// left edge @ x = 0
// right edge @ x = GAME_DISP_WIDTH - 1
// top edge @ y = 0
// bottom edge @ y = GAME_DISP_HEIGHT - 1
//
// TODO: FOR THE LOVE OF GOD OPTIMIZE THIS
function draw_sprite(sprite, posX = 0, posY = 0, rot = 0, scale = 1, trans = 1) {
	var drawWidth = sprite[2] * scale;
	var drawHeight = sprite[3] * scale;

	context.save();
	context.globalAlpha = trans;
	context.translate(posX * dispScale, posY * dispScale);
	context.rotate(rot);
	context.drawImage(spritesheet, sprite[0], sprite[1], sprite[2], sprite[3],
		-drawWidth / 2.0 * dispScale, -drawHeight / 2.0 * dispScale, drawWidth * dispScale, drawHeight * dispScale);
	context.restore();
}

class Entity {
	constructor() {
		this.id = entityId++;
		this.posX = GAME_DISP_WIDTH / 2.0;
		this.posY = GAME_DISP_HEIGHT / 2.0;
		this.rot = 0;
		this.scale = 1;
		this.trans = 1;
		this.sprite;
		this.entityType;
	}

	delete() {
		entities[this.constructor.name].splice(entities[this.constructor.name].indexOf(this), 1);
		delete this;
		/*
		entityFamily = entities[this.constructor.name];
		for (var i; i < entityFamily.length; ++i) {
			if(entityFamily[i].id == this.id){
				entityFamily.splice(i, 1);
				delete this;
				return;
			}
		}*/
	}

	// Draw each entity from it's center
	draw() {
		draw_sprite(this.sprite, this.posX, this.posY, this.rot, this.scale, this.trans);
	}

	// Returns true if collides with entity targeted
	collides_with_entity(entity) {

	}
}

class Player extends Entity {
	constructor() {
		super();
		this.entityType = "Player";
		this.sprite = spritemap["player"][0];
		this.state = 0; // 0 = standing, 1 = running
		this.speed = GAME_DISP_HEIGHT / 5;
		this.scale = 0.7

		// Make time for spirte frame inversely proportional to speed
		//     so faster the player, faster the animation
		this.timePerSpriteFrame = GAME_DISP_HEIGHT / (this.speed * 32);
		this.spriteFrameCount = 0;
		this.nextSpriteFrameTime = currFrameTime + this.timePerSpriteFrame;
	}

	apply_physics() {
		var motionX = keyStates[68] - keyStates[65]; // left - right
		var motionY = keyStates[83] - keyStates[87]; // up - down
		if (motionX && motionY) {	// euclidean geometry
			motionX *= INV_ROOT_2;
			motionY *= INV_ROOT_2;
		}
		if (motionX || motionY) this.state = 1;
		else this.state = 0;
		this.posX += motionX * this.speed * tpl;
		this.posY += motionY * this.speed * tpl;

		if (this.posX < 0) this.posX = 0
		else if (this.posX >= GAME_DISP_WIDTH) this.posX = GAME_DISP_WIDTH - 1;

		if (this.posY < 0) this.posY = 0;
		else if (this.posY >= GAME_DISP_HEIGHT) this.posY = GAME_DISP_HEIGHT - 1;

		this.rot = Math.atan((mousePosY - this.posY) / (mousePosX - this.posX));
		if (mousePosX - this.posX < 0)
			this.rot += Math.PI;
	}

	draw() {
		if (!this.nextSpriteFrameTime) this.nextSpriteFrameTime = currFrameTime;
		if (currFrameTime >= this.nextSpriteFrameTime) {
			if (this.state) this.spriteFrameCount = (this.spriteFrameCount + 1) % 4; //if running
			else this.spriteFrameCount = 0; // standing so reset the animation to standing(0)
			this.nextSpriteFrameTime = currFrameTime + this.timePerSpriteFrame;
			this.sprite = spritemap["player"][this.spriteFrameCount];
		}
		draw_sprite(this.sprite, this.posX, this.posY, this.rot, this.scale, this.trans);
	}

	check_collision(entity) {
	}

	collide(entity) {
	}
}

class Zombie extends Entity {
	constructor() {
		super();
		this.sprite = spritemap["zombierun"][0];
		this.state = 0;
		this.runSpeed = GAME_DISP_HEIGHT / 6;
		this.speed = this.runSpeed / 2.0; // Non aggro speed is half run speed
		this.scale = 0.7;

		// Spawn in a spot where it can't instantly aggro player
		do {
			this.posX = Math.random() * GAME_DISP_WIDTH;
			this.posY = Math.random() * GAME_DISP_HEIGHT;
		} while (this.can_aggro_player() != null);

		this.targetPosX = this.posX;
		this.targetPosY = this.posY;
		this.nextRetargetTime = Number.MAX_SAFE_INTEGER;
	}

	collide(entity) {
	}

	apply_physics() {
		if (this.update_target_loc()) {
			this.posX += Math.cos(this.rot) * this.speed * tpl;
			this.posY += Math.sin(this.rot) * this.speed * tpl;
		}
	}

	update_target_loc() {
		var targetPlayer = this.can_aggro_player();
		if (targetPlayer != null) {
			this.targetPosX = targetPlayer.posX;
			this.targetPosY = targetPlayer.posY;
			this.speed = this.runSpeed;
			// Arrived at location
		} else if (Math.abs(this.posX - this.targetPosX) < 8
			&& Math.round(this.posY - this.targetPosY) < 8) {
			if (this.nextRetargetTime <= currFrameTime) {
				this.nextRetargetTime = Number.MAX_SAFE_INTEGER;

				this.targetPosX = Math.random() * GAME_DISP_WIDTH;
				this.targetPosY = Math.random() * GAME_DISP_HEIGHT;
				this.speed = this.runSpeed / 2.0;
				// At target location and time to rest
			} else {
				// Just arrived at target location, start rest timer
				if (this.nextRetargetTime == Number.MAX_SAFE_INTEGER)
					this.nextRetargetTime = currFrameTime + 2 + Math.random() * 3;
				return false
			}
		}

		this.rot = Math.atan((this.targetPosY - this.posY) / (this.targetPosX - this.posX));
		if (this.targetPosX - this.posX < 0)
			this.rot += Math.PI;

		return true;
	}

	can_aggro_player() {
		for (var playerIndex in entities["Player"]) {
			var player = entities["Player"][playerIndex];
			if (Math.pow(player.posX - this.posX, 2) + Math.pow(player.posY - this.posY, 2) < QS_GAME_DISP_HEIGHT)
				return player;
		}
		return null;
	}
}

class Bullet extends Entity {
	constructor(player) {
		super();
		this.posX = player.posX;
		this.posY = player.posY;
		this.speed = GAME_DISP_HEIGHT / 2;
		this.rot = player.rot + Math.PI / 2;
		this.direction = this.rot - Math.PI / 2;

		this.sprite = spritemap["bullet"][0];
	}

	// Collides with zombies
	check_collision(entity) {
	}

	collide(entity) {
	}

	apply_physics() {
		this.posX += Math.cos(this.direction) * this.speed * tpl;
		this.posY += Math.sin(this.direction) * this.speed * tpl;

		if (this.posX < 0 || this.posX >= GAME_DISP_WIDTH ||
			this.posY < 0 || this.posY >= GAME_DISP_HEIGHT)
			this.delete();
	}
}

class Sandbags extends Entity {
	constructor(width, height, rotation) {
		super(width, height, rotation);
	}

	// Collides with zombies
	check_collision(entity) {
	}
}

class Blood extends Entity {
	constructor(width, height, rotation) {
		super(width, height, rotation);
	}
}

class Supplies extends Entity {
	constructor(width, height, rotation) {
		super(width, height, rotation);
	}

	// Collides with player
	collide(entity) {
	}
}
window.onload = main;
