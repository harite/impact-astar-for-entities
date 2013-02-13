ig.module(
	'game.entities.enemy'
)
.requires(
	'impact.entity'
)
.defines(function(){

EntityEnemy = ig.Entity.extend({
	size: {
		x: 8,
		y: 8
	},

	speed: 40,

	pathTimer: null,

	animSheet: new ig.AnimationSheet('media/enemy.png', 8, 8),

	init: function(x, y, settings) {
		// You should use different animations, but i'm to lazy ...
		this.addAnim('idle', 999999999999999999, [0]);

		this.pathTimer = new ig.Timer(2);

		this.parent(x, y, settings);
	},

	update: function() {
		// Update it every 2 seconds
		if(this.pathTimer.delta() > 0) {
			// Get the path to the player
			this.getPath(ig.game.player.pos.x, ig.game.player.pos.y, true, ['EntityObstacle', 'EntityObstacle2', 'EntityObstacle3']);

			this.pathTimer.reset();
		}

		// Walk the path
		this.followPath(this.speed, true);

		this.parent();
	},

	draw: function() {
		if(!ig.global.wm) {
			// Draw the path ...
			this.drawPath(255, 0, 0, 0.5);
		}

		this.parent();
	}
});

});