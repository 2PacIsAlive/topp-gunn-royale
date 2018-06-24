<template>
  <div>
    <div id="p5">

    </div>
  </div>
</template>

<script>
  import { mapState, mapActions } from 'vuex'
  export default {
    data () {
      return {
        sketch: null,
        bullets: null,
        harmlessBullets: null,
        clouds: null,
        ship: null,
        enemyShips: null,
        enemyShipImage: null,
        enemyShipLocations: {},
        enemyPlayers: {},
        playerId: null,
        playerShipImage: null,
        bulletImage: null,
        explosionImage: null,
        skyImage: null,
        timeStart: null,
        killed: [],
        numClouds: 100,
        numEnemies: 0,
        matchTime: 0,
        MARGIN: 40,
        gameOver: false,
        victory: false
      }
    },
    sockets: {
      feed: function (data) {
      	this.enemyShipLocations = data.players;
		//this.enemyPlayers[data.playerId].remove();
		//delete this.enemyPlayers[data.playerId];
        this.playerId = data.playerId
      	delete this.enemyShipLocations[data.playerId];
      	this.numEnemies = Object.keys(this.enemyShipLocations).length
      },
      bullet: function (data) {
      	if (!(data.playerId == this.playerId)) {
          console.log(`${data.playerId} fired, this player is ${this.playerId}`)
          var bullet = this.sketch.createSprite(data.x, data.y);
          bullet.addImage(this.bulletImage);
          bullet.setSpeed(data.speed, data.r);
          bullet.rotation = data.r
          bullet.life = 30;
          this.harmlessBullets.add(bullet);
        }
      },
      explosion: function (data) {
        for(var i=0; i<10; i++) {
            var p = this.sketch.createSprite(data.x, data.y);
            p.addImage(this.explosionImage);
            p.setSpeed(this.sketch.random(3,5), this.sketch.random(360));
            p.friction = 0.55;
            p.life = 15;
        }
      },
      dead: function (data) {
        if (data.playerId == this.playerId) {
          this.ship.remove()
          for(var i=0; i<10; i++) {
            var p = this.sketch.createSprite(this.ship.position.x, this.ship.position.y);
            p.addImage(this.explosionImage);
            p.setSpeed(this.sketch.random(3,5), this.sketch.random(360));
            p.friction = 0.55;
            p.life = 15;
          }
          this.gameOver = true
        }
		this.enemyPlayers[data.playerId].remove()
		delete this.enemyShipLocations[data.playerId]
      	delete this.enemyPlayers[data.playerId];
        this.killed.push(data.playerId)
      }
    },
    methods: {
      push: function () {
          this.$socket.emit('push', {
            x: this.ship.position.x,
            y: this.ship.position.y,
            r: this.ship.rotation
          })
      },
      kill: function (playerId) {
      	this.$socket.emit('kill', {
      		playerId: playerId
        })
      },
      hit: function (playerId, x, y) {
        this.$socket.emit('hit', {
          playerId: playerId,
          x: x,
          y: y
        })
      },
      fire: function (playerId, x, y, r, speed) {
      	this.$socket.emit('fire', {
          playerId: playerId,
          x: x,
          y: y,
          r: r,
          speed: speed
        })
      },
      createEnemyPlayer: function (id, x, y, r) {
        var enemyShip;
        enemyShip = this.sketch.createSprite(x, y);
        enemyShip.id = id
        enemyShip.armor = 3
        enemyShip.maxSpeed = 6;
        enemyShip.rotation = r;
        enemyShip.setCollider("circle", 0,0, 20);
        enemyShip.addImage("thrust", this.enemyShipImage);
        enemyShip.mass = 2
        enemyShip.addAnimation("thrust", "/public/jet_moving.png", "/public/jet_moving_2.png");
        enemyShip.changeAnimation("thrust");
        this.enemyShips.add(enemyShip)
        return enemyShip;
      },
      createCloud: function (type, x, y) {
        var a = this.sketch.createSprite(x, y);
        var img  = this.sketch.loadImage("/public/cloud_"+this.sketch.floor(type)+".png");
        a.addImage(img);
        a.setSpeed(-1+(type/5), 0);
        a.type = type;
        if(type == 2)
            a.scale = .6;
        if(type == 1)
            a.scale = .3;

        a.mass = 2+a.scale;
        this.clouds.add(a);
        return a;
      },
      enemyShipHit: function(enemyShip, bullet) {
        for(var i=0; i<10; i++) {
          var p = this.sketch.createSprite(enemyShip.position.x, enemyShip.position.y);
          p.addImage(this.explosionImage);
          p.setSpeed(this.sketch.random(3,5), this.sketch.random(360));
          p.friction = 0.55;
          p.life = 15;
        }

        bullet.remove();
        this.hit(enemyShip.id, enemyShip.position.x, enemyShip.position.y)
        enemyShip.armor -= 1;
        if (enemyShip.armor === 0) {
          enemyShip.remove();
          console.log(`${enemyShip.id} killed`)
          this.enemyPlayers[enemyShip.id].remove()
          delete this.enemyShipLocations[enemyShip.id]
          delete this.enemyPlayers[enemyShip.id]
          this.numEnemies -= 1;
          this.kill(enemyShip.id)
          this.killed.push(enemyShip.id)
        }
      }
    },
    created: function () {
      this.timeStart = new Date().getTime() / 1000;
      var s = function (sketch) {
        this.sketch = sketch;

        sketch.setup = function () {
          sketch.createCanvas(window.innerWidth, window.innerHeight);

          this.bulletImage = sketch.loadImage("/public/missile.png");
          this.enemyShipImage = sketch.loadImage("/public/jet.png");
          this.playerShipImage = sketch.loadImage("/public/player_jet.png");
          this.explosionImage = sketch.loadImage("/public/explosion.png");
          this.skyImage = sketch.loadImage("/public/sky.png");

          this.clouds = new sketch.Group();
          this.bullets = new sketch.Group();
          this.harmlessBullets = new sketch.Group();
          this.enemyShips = new sketch.Group();

          for(var i = 0; i<this.numClouds; i++) {
              var ang = sketch.random(360);
              var px = sketch.random(sketch.width);
              var py = sketch.height/2+ 1000 * sketch.sin(sketch.radians(ang));
              this.createCloud(sketch.random(0,3), px, py);
          }

          this.ship = sketch.createSprite(sketch.width/2, sketch.height/2);
          this.ship.maxSpeed = 6;
          this.ship.friction = 0.05;
          this.ship.setCollider("circle", 0,0, 20);

          this.ship.addImage("normal", this.playerShipImage);
          this.ship.addAnimation("thrust", "/public/player_jet_moving_1.png", "/public/player_jet_moving_2.png");
        }.bind(this);

        sketch.draw = function () {
          sketch.background(33, 148, 195);
          sketch.fill(0);

          if (this.gameOver) {
            sketch.textAlign(sketch.CENTER);
            sketch.textSize(26);
            sketch.textFont('Inconsolata');
            sketch.text('game over', this.sketch.width/2, this.sketch.height/2);
            sketch.textSize(20);
            sketch.text(`you survived ${this.matchTime}s`, this.sketch.width/2, this.sketch.height/2 + 30);
          } else {
            sketch.textAlign(sketch.CENTER);
            sketch.textSize(26);
            sketch.textFont('Inconsolata');
            sketch.text(`fighters remaining: ${this.numEnemies}`, this.sketch.width / 5, this.sketch.height - 40);
            if (!this.gameOver) {
              this.matchTime = this.sketch.floor(new Date().getTime() / 1000 - this.timeStart)
            }
            sketch.text(`match time: ${this.matchTime}s`, this.sketch.width - this.sketch.width / 5, this.sketch.height - 40);

            for (var i = 0; i < sketch.allSprites.length; i++) {
              var s = sketch.allSprites[i];
              if (s.position.x < -this.MARGIN) s.position.x = sketch.width + this.MARGIN;
              if (s.position.x > sketch.width + this.MARGIN) s.position.x = -this.MARGIN;
              if (s.position.y < -this.MARGIN) s.position.y = sketch.height + this.MARGIN;
              if (s.position.y > sketch.height + this.MARGIN) s.position.y = -this.MARGIN;
            }

            this.enemyShips.overlap(this.bullets, this.enemyShipHit);

            this.ship.bounce(this.enemyShips);

            if (sketch.keyDown(sketch.LEFT_ARROW))
              this.ship.rotation -= 4;
            if (sketch.keyDown(sketch.RIGHT_ARROW))
              this.ship.rotation += 4;
            if (sketch.keyDown(sketch.UP_ARROW)) {
              this.ship.addSpeed(.5, this.ship.rotation);
              this.ship.changeAnimation("thrust");
            }
            else
              this.ship.changeAnimation("normal");

            if (sketch.keyWentDown("SPACE")) {
              this.fire(this.playerId, this.ship.position.x, this.ship.position.y, this.ship.rotation, 10 + this.ship.getSpeed())
              var bullet = sketch.createSprite(this.ship.position.x, this.ship.position.y);
              bullet.addImage(this.bulletImage);
              bullet.setSpeed(10 + this.ship.getSpeed(), this.ship.rotation);
              bullet.rotation = this.ship.rotation
              bullet.life = 30;
              this.bullets.add(bullet);
            }

            for (var id in this.enemyShipLocations) {
              if (this.killed.indexOf(id) === -1) {
                if (id in this.enemyPlayers) {
                  this.enemyPlayers[id].position.x = this.enemyShipLocations[id].x
                  this.enemyPlayers[id].position.y = this.enemyShipLocations[id].y
                  this.enemyPlayers[id].rotation = this.enemyShipLocations[id].r
                } else {
                  let enemyPlayer = this.createEnemyPlayer(id, this.enemyShipLocations[id].x, this.enemyShipLocations[id].y, this.enemyShipLocations[id].r);
                  this.enemyPlayers[id] = enemyPlayer;
                }
              }
            }

            this.push();
            sketch.drawSprites()
          }
        }.bind(this);
      }.bind(this);
      new p5(s, 'p5sketch');
    }
  }
</script>
