/*
 * astar-for-entities
 * https://github.com/hurik/impact-astar-for-entities
 *
 * v2.0.0 beta
 *
 * Andreas Giemza
 * andreas@giemza.net
 * http://www.andreasgiemza.de/
 *
 * This work is licensed under the Creative Commons Attribution 3.0 Unported License. To view a copy of this license, visit http://creativecommons.org/licenses/by/3.0/.
 *
 * It would be very nice when you inform me, with an short email, when you are using this plugin in a project.
 *
 * Thanks to: - Joncom (Deactivate diagonal movement)
 *            - FabienM (Heading Direction)
 *            - docmarionum1 (Teleportation bug)
 *            - tmfkmoney (Support for obsticles which are bigger than the tilesize)
 *            - chadrickm (Max movement)
 *
 * Based on : - https://gist.github.com/994534
 *            - http://www.policyalmanac.org/games/aStarTutorial_de.html
 *            - http://theory.stanford.edu/~amitp/GameProgramming/index.html
 */

ig.module(
	'plugins.astar-for-entities'
)
.requires(
	'impact.entity',
	'plugins.line-of-sight'
).
defines(function() {

ig.Entity.inject({
	path: null,

	maxMovementActive: false,
	maxMovement: 200,

	// Direction change maluses
	directionChangeMalus45degree: 2,
	// Should be 1/4 of the tilesize
	directionChangeMalus90degree: 5,
	// Should be 5/8 of the tilesize
	
	getPath: function(destinationX, destinationY, diagonalMovement, entityTypesArray, ignoreEntityArray, eraseUnimportantWaypoints) {
		if(diagonalMovement == null) {
			diagonalMovement = true;
		}

		if(entityTypesArray == null) {
			entityTypesArray = [];
		}

		if(ignoreEntityArray == null) {
			ignoreEntityArray = [];
		}

		if(eraseUnimportantWaypoints == null) {
			eraseUnimportantWaypoints = false;
		}

		// Get the map information
		var mapWidth = ig.game.collisionMap.width,
			mapHeight = ig.game.collisionMap.height,
			mapTilesize = ig.game.collisionMap.tilesize,
			map = ig.game.collisionMap.data,
			// Diagonal movement costs
			diagonalMovementCosts = Math.sqrt(2);

		// Add the entities to the collision map
		this._addEraseEntities(true, entityTypesArray, ignoreEntityArray);

		// Create the start and the destination as nodes
		var startNode = new asfeNode((this.pos.x / mapTilesize).floor(), (this.pos.y / mapTilesize).floor(), -1, 0),
			destinationNode = new asfeNode((destinationX / mapTilesize).floor(), (destinationY / mapTilesize).floor(), -1, 0);

		// Check if the destination tile is not the start tile ...
		if(destinationNode.x == startNode.x && destinationNode.y == startNode.y) {
			this.path = null;

			// Erase the entities from the collision map						
			this._addEraseEntities(false, entityTypesArray, ignoreEntityArray);

			return;
		}

		// Quick check if the destination tile is free
		if(map[destinationNode.y][destinationNode.x] != 0) {
			this.path = null;

			// Erase the entities from the collision map						
			this._addEraseEntities(false, entityTypesArray, ignoreEntityArray);

			return;
		}

		// Our two lists
		var open = [],
			closed = [];

		// The hash table for faster searching, if a tile already has a node
		var nodes = {};

		// Some variables we need later ...
		var bestCost, bestNode, currentNode, newX, newY, tempG, newNode, lastDirection, direction;

		// Push the start node on the open list
		open.push(startNode);

		// And save it in the hash table
		nodes[startNode.x + ',' + startNode.y] = startNode;

		// Until the destination is found work off the open nodes
		while(open.length > 0) {
			// First find the best open node (smallest f value)
			bestCost = open[0].f;
			bestNode = 0;

			for(var i = 1; i < open.length; i++) {
				if(open[i].f < bestCost) {
					bestCost = open[i].f;
					bestNode = i;
				}
			}

			// The best open node is our currentNode
			currentNode = open[bestNode];

			// Check if we've reached our destination
			if(currentNode.x == destinationNode.x && currentNode.y == destinationNode.y) {
				// Add the destination to the path
				this.path = [{
					x: destinationNode.x * mapTilesize,
					y: destinationNode.y * mapTilesize
				}];

				// direction
				// 0 stand for X and Y change
				// 1 stands for X change
				// 2 stand for Y change
				// Get the direction
				if(currentNode.x != closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
					lastDirection = 0;
				} else if(currentNode.x != closed[currentNode.p].x && currentNode.y == closed[currentNode.p].y) {
					lastDirection = 1;
				} else if(currentNode.x == closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
					lastDirection = 2;
				}

				// Go up the chain to recreate the path 
				while(true) {
					currentNode = closed[currentNode.p];

					// Stop when you get to the start node ...
					if(currentNode.p == -1) {
						// Erase the entities from the collision map						
						this._addEraseEntities(false, entityTypesArray, ignoreEntityArray);

						// added for limiting the movement path only be as long as the maxMovement... Chadrick
						if(this.maxMovement > 0 && this._getPathLength() > this.maxMovement && this.maxMovementActive) {
							this._createNewLimitedPath();
						}

						if(diagonalMovement && eraseUnimportantWaypoints) {
							this._eraseUnimportantWaypoints(entityTypesArray, ignoreEntityArray);
						}

						return;
					}

					// Get the direction
					if(currentNode.x != closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
						direction = 0;
					} else if(currentNode.x != closed[currentNode.p].x && currentNode.y == closed[currentNode.p].y) {
						direction = 1;
					} else if(currentNode.x == closed[currentNode.p].x && currentNode.y != closed[currentNode.p].y) {
						direction = 2;
					}

					// Only save the path node, if the path changes the direction
					if(direction != lastDirection) {
						// Add the steps to the path
						this.path.unshift({
							x: currentNode.x * mapTilesize,
							y: currentNode.y * mapTilesize
						});
					}

					lastDirection = direction;
				}
			}

			// Erase the current node from the open list
			open.splice(bestNode, 1);

			// And add it to the closed list
			closed.push(currentNode);
			// Also set the indicator to closed
			currentNode.closed = true;

			// Directions
			// 1 4 6
			// 2 X 7
			// 3 5 8
			// 0 is ignored for start and end node
			direction = 0;

			// Now create all 8 neighbors of the node
			for(var dx = -1; dx <= 1; dx++) {
				for(var dy = -1; dy <= 1; dy++) {
					if(!diagonalMovement) {
						// Skips checking of diagonals, when diagonalMovement is false
						if(Math.abs(dx) == Math.abs(dy)) {
							continue;
						}
					}

					// Don't check the parent node, which is in the middle
					if(dx == 0 && dy == 0) {
						continue;
					}

					direction++;

					newX = currentNode.x + dx;
					newY = currentNode.y + dy;

					// Check if the node is on the map
					if(newX < 0 || newX >= mapWidth || newY < 0 || newY >= mapHeight) {
						continue;
					}

					// Check if the tile is free
					if(map[newY][newX] != 0) {
						continue;
					}

					// Only use the upper left node, when both neighbor are not a wall
					if(dx == -1 && dy == -1 && (map[currentNode.y - 1][currentNode.x] != 0 || map[currentNode.y][currentNode.x - 1] != 0)) {
						continue;
					}

					// Only use the upper right node, when both neighbor are not a wall
					if(dx == 1 && dy == -1 && (map[currentNode.y - 1][currentNode.x] != 0 || map[currentNode.y][currentNode.x + 1] != 0)) {
						continue;
					}

					// Only use the lower left node, when both neighbor are not a wall
					if(dx == -1 && dy == 1 && (map[currentNode.y][currentNode.x - 1] != 0 || map[currentNode.y + 1][currentNode.x] != 0)) {
						continue;
					}

					// Only use the lower right node, when both neighbor are not a wall
					if(dx == 1 && dy == 1 && (map[currentNode.y][currentNode.x + 1] != 0 || map[currentNode.y + 1][currentNode.x] != 0)) {
						continue;
					}

					// Check if this tile already has a node
					if(nodes[newX + ',' + newY]) {
						// When the node is closed continue
						if(nodes[newX + ',' + newY].closed) {
							continue;
						}

						// Calculate the g value
						tempG = currentNode.g + Math.sqrt(Math.pow(newX - currentNode.x, 2) + Math.pow(newY - currentNode.y, 2));

						// When the direction changed
						if(currentNode.d != direction) {
							if(currentNode.d == 1 && (direction == 2 || direction == 4)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else if(currentNode.d == 2 && (direction == 1 || direction == 3)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else if(currentNode.d == 3 && (direction == 2 || direction == 5)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else if(currentNode.d == 4 && (direction == 1 || direction == 6)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else if(currentNode.d == 5 && (direction == 3 || direction == 8)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else if(currentNode.d == 6 && (direction == 4 || direction == 7)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else if(currentNode.d == 7 && (direction == 6 || direction == 8)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else if(currentNode.d == 8 && (direction == 5 || direction == 7)) {
								tempG = tempG + this.directionChangeMalus45degree;
							} else {
								tempG = tempG + this.directionChangeMalus90degree;
							}
						}

						// If it is smaller than the g value in the existing node, update the node
						if(tempG < nodes[newX + ',' + newY].g) {
							nodes[newX + ',' + newY].g = tempG;
							nodes[newX + ',' + newY].f = tempG + nodes[newX + ',' + newY].h;
							nodes[newX + ',' + newY].p = closed.length - 1;
							nodes[newX + ',' + newY].d = direction;
						}

						continue;
					}

					// After this thousand checks we create an new node
					newNode = new asfeNode(newX, newY, closed.length - 1, direction);
					// Put it on the hash list
					nodes[newNode.x + ',' + newNode.y] = newNode;

					// Fill it with values
					newNode.g = currentNode.g + Math.sqrt(Math.pow(newNode.x - currentNode.x, 2) + Math.pow(newNode.y - currentNode.y, 2));

					// When the direction changed
					if(currentNode.d != newNode.d && currentNode.d != 0) {
						if(currentNode.d == 1 && (newNode.d == 2 || newNode.d == 4)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else if(currentNode.d == 2 && (newNode.d == 1 || newNode.d == 3)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else if(currentNode.d == 3 && (newNode.d == 2 || newNode.d == 5)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else if(currentNode.d == 4 && (newNode.d == 1 || newNode.d == 6)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else if(currentNode.d == 5 && (newNode.d == 3 || newNode.d == 8)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else if(currentNode.d == 6 && (newNode.d == 4 || newNode.d == 7)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else if(currentNode.d == 7 && (newNode.d == 6 || newNode.d == 8)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else if(currentNode.d == 8 && (newNode.d == 5 || newNode.d == 7)) {
							newNode.g = newNode.g + this.directionChangeMalus45degree;
						} else {
							newNode.g = newNode.g + this.directionChangeMalus90degree;
						}
					}

					// If diagonalMovement is true, we use the diagonal distance heuristic
					if(diagonalMovement) {
						var h_diagonal = Math.min(Math.abs(newNode.x - destinationNode.x), Math.abs(newNode.y - destinationNode.y));
						var h_straight = Math.abs(newNode.x - destinationNode.x) + Math.abs(newNode.y - destinationNode.y);

						newNode.h = (diagonalMovementCosts * h_diagonal) + (h_straight - (2 * h_diagonal));
					} else {
						// If it is false, we use the manhattan distance heuristic
						newNode.h = Math.abs(newNode.x - destinationNode.x) + Math.abs(newNode.y - destinationNode.y);
					}

					newNode.f = newNode.g + newNode.h;

					// And push it on the open list ...
					open.push(newNode);
				}
			}
		}

		// No path found ...
		this.path = null;

		// Erase the entities from the collision map	
		this._addEraseEntities(false, entityTypesArray, ignoreEntityArray);

		return;
	},

	_eraseUnimportantWaypoints: function(entityTypesArray, ignoreEntityArray) {
		this.path.unshift({
			x: this.pos.x,
			y: this.pos.y
		});

		for(var i = 0; i < this.path.length - 2; i++) {
			var collision = ig.game.collisionMap.traceLos(this.path[i].x, this.path[i].y, this.path[i + 2].x - this.path[i].x, this.path[i + 2].y - this.path[i].y, this.size.x, this.size.y, entityTypesArray, ignoreEntityArray);

			if(!collision) {
				this.path.splice(i + 1, 1);
				i--;
			}
		}

		this.path.splice(0, 1);
	},

	_addEraseEntities: function(addErase, entityTypesArray, ignoreEntityArray) {
		var ignoreThisEntity;

		// Add or erase the entity types to the collision map
		// Go through the entityTypesArray
		for(i = 0; i < entityTypesArray.length; i++) {
			var entities = ig.game.getEntitiesByType(entityTypesArray[i]);

			// Get every entity of this type
			for(j = 0; j < entities.length; j++) {
				ignoreThisEntity = false;

				// Check if it is excludes from the the check
				for(k = 0; k < ignoreEntityArray.length; k++) {
					if(ignoreEntityArray[k].id == entities[j].id) {
						ignoreThisEntity = true;
					}
				}

				// Add or erase the entity to the collision map
				if(!ignoreThisEntity) {
					var sizeX = (entities[j].size.x / ig.game.collisionMap.tilesize).floor();
					var sizeY = (entities[j].size.y / ig.game.collisionMap.tilesize).floor();

					for(k = 0; k < sizeX; k++) {
						for(l = 0; l < sizeY; l++) {
							var changeTileX = (entities[j].pos.x / ig.game.collisionMap.tilesize).floor() + k,
								changeTileY = (entities[j].pos.y / ig.game.collisionMap.tilesize).floor() + l;

							if(changeTileX >= 0 && changeTileX < ig.game.collisionMap.width && changeTileY >= 0 && changeTileY < ig.game.collisionMap.height) {
								if(addErase && ig.game.collisionMap.data[changeTileY][changeTileX] == 0) {
									ig.game.collisionMap.data[changeTileY][changeTileX] = 9999;
								} else if(!addErase && ig.game.collisionMap.data[changeTileY][changeTileX] == 9999) {
									ig.game.collisionMap.data[changeTileY][changeTileX] = 0;
								}
							}
						}
					}
				}
			}
		}
	},

	// ----- Max movement by Chadrick ----- START -----
	_getPathLength: function() {
		var distance = 0;

		if(this.path) {
			var prevWaypoint = this.pos;

			for(var i = 0; i < this.path.length; i++) {
				if(this.path[i]) {
					var currentWaypoint = this.path[i];

					distance += this._distanceTo(prevWaypoint, currentWaypoint);
					prevWaypoint = currentWaypoint;
				}
			}
		}

		return distance;
	},

	_createNewLimitedPath: function() {
		var newPath = new Array();
		var distance = 0;

		// make sure we have a path
		if(this.path) {
			// set the starting waypoint at the unit's current position
			var prevWaypoint = this.pos;
			// go through each waypoint and determin the length
			for(var i = 0; i < this.path.length; i++) {
				// make sure we have a waypoint
				if(this.path[i]) {
					var currentWaypoint = this.path[i];

					// get the new distance after adding the current waypoint
					var newDistance = distance + this._distanceTo(prevWaypoint, currentWaypoint);

					if(newDistance > this.maxMovement) {
						// new distance is too far so we get a new point at the maxMovement distance for the unit and push it on the newPath.
						var newWayPointLength = this.maxMovement - distance;
						var newMaxMovementLastWaypoint = this._getPointSomeDistanceFromStart(prevWaypoint, currentWaypoint, newWayPointLength);

						newPath.push(newMaxMovementLastWaypoint);
						break;
					} else {
						distance += this._distanceTo(prevWaypoint, currentWaypoint);
						newPath.push(currentWaypoint);
					}
					prevWaypoint = currentWaypoint;
				}
			}
		}

		this.path = newPath;

		return;
	},

	_distanceTo: function(p1, p2) {
		var distSquared = Math.sqrt(Math.pow((p1.x - p2.x), 2) + Math.pow((p1.y - p2.y), 2));
		return distSquared;
	},

	_getPointSomeDistanceFromStart: function(startPos, endPos, distanceFromStart) {
		var totalDistance = this._distanceTo(startPos, endPos);

		var totalDelta = {
			x: endPos.x - startPos.x,
			y: endPos.y - startPos.y
		};

		var percent = distanceFromStart / totalDistance;

		var delta = {
			x: totalDelta.x * percent,
			y: totalDelta.y * percent
		};

		return {
			x: startPos.x + delta.x,
			y: startPos.y + delta.y
		};
	},
	// ----- Max movement by Chadrick ----- END -----
	
	followPath: function(speed, alignOnNearestTile) {
		if(alignOnNearestTile == null) {
			alignOnNearestTile = false;
		}

		// If the path was erased before the entity has gotten to his destination and stands between two tiles, this little check will adlign on nearest tile
		if(!this.path && alignOnNearestTile) {
			// Get the coordinates of the current tile
			var cx = (this.pos.x / ig.game.collisionMap.tilesize).floor() * ig.game.collisionMap.tilesize,
				cy = (this.pos.y / ig.game.collisionMap.tilesize).floor() * ig.game.collisionMap.tilesize;

			// Check if our entity is align on it
			if(cx != this.pos.x || cy != this.pos.y) {
				// Get the x dinstance to the current tile
				var dx = this.pos.x - cx,
					dy = this.pos.y - cy;

				// Get the y distance to the next tile
				var dxp = cx + ig.game.collisionMap.tilesize - this.pos.x,
					dyp = cy + ig.game.collisionMap.tilesize - this.pos.y;

				// Choose the smaller distance
				if(dx < dxp) {
					var tx = cx;
				} else {
					var tx = cx + ig.game.collisionMap.tilesize;
				}

				if(dy < dyp) {
					var ty = cy;
				} else {
					var ty = cy + ig.game.collisionMap.tilesize;
				}

				// Add it to the path
				this.path = [{
					x: tx,
					y: ty
				}];
			}
		}

		// Only do something if there is a path ...
		if(this.path) {
			if((this.pos.x >= this.path[0].x && this.last.x < this.path[0].x) || (this.pos.x <= this.path[0].x && this.last.x > this.path[0].x) || Math.abs(this.pos.x - this.path[0].x) < 0.5) {
				this.vel.x = 0;
				this.pos.x = this.path[0].x;
			}

			if((this.pos.y >= this.path[0].y && this.last.y < this.path[0].y) || (this.pos.y <= this.path[0].y && this.last.y > this.path[0].y) || Math.abs(this.pos.y - this.path[0].y) < 0.5) {
				this.vel.y = 0;
				this.pos.y = this.path[0].y;
			}

			// Did we reached a waypoint?
			if(this.pos.x == this.path[0].x && this.pos.y == this.path[0].y) {
				// Erase the last waypoint
				this.path.splice(0, 1);

				// If it was the last nothing to do ...
				if(!this.path.length) {
					this.path = null;

					return;
				}
			}

			var distanceX = this.path[0].x - this.pos.x;
			var distanceY = this.path[0].y - this.pos.y;

			distanceLenght = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

			this.vel.x = distanceX / distanceLenght * speed;
			this.vel.y = distanceY / distanceLenght * speed;

			// Update the animation angle
			this.currentAnim.angle = Math.atan2(this.vel.y, this.vel.x) + Math.PI / 2;
		} else {
			// When there is no path, don't move ...
			this.vel.x = 0;
			this.vel.y = 0;

			this.currentAnim.angle = 0;
		}
	},

	drawPath: function(r, g, b, a, lineWidth) {
		if(this.path) {
			var mapTilesize = ig.game.collisionMap.tilesize;

			ig.system.context.strokeStyle = 'rgba(' + r + ', ' + g + ', ' + b + ', ' + a + ')';
			ig.system.context.lineWidth = lineWidth * ig.system.scale;

			ig.system.context.beginPath();

			ig.system.context.moveTo(
			ig.system.getDrawPos(this.pos.x + this.size.x / 2 - ig.game.screen.x), ig.system.getDrawPos(this.pos.y + this.size.y / 2 - ig.game.screen.y));

			for(var i = 0; i < this.path.length; i++) {
				ig.system.context.lineTo(
				ig.system.getDrawPos(this.path[i].x + mapTilesize / 2 - ig.game.screen.x), ig.system.getDrawPos(this.path[i].y + mapTilesize / 2 - ig.game.screen.y));
			}

			ig.system.context.stroke();
			ig.system.context.closePath();
		}
	},

	// Fix by docmarionum1 for the teleportation bug
	init: function(x, y, settings) {
		this.parent(x, y, settings);

		this.last = {
			x: x,
			y: y
		};
	}
});

asfeNode = function(x, y, p, d) {
	// Coordinates
	this.x = x;
	this.y = y;
	// Parent
	this.p = p;
	// Direction
	this.d = d;
	// G, H and F
	this.g = 0;
	this.h = 0;
	this.f = 0;
	// Closed indicator
	this.closed = false;
};

});
