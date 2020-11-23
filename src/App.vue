<template>
  <div id="outer">
    <div id="p5-section">
      
    </div>
    <div id="code-section">
      <prism-editor class="my-editor" v-model="code" :highlight="highlighter" line-numbers></prism-editor>
    </div>
  </div>
</template>

<script>
  import { PrismEditor } from 'vue-prism-editor';
  import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere

  // import highlighting library (you can use any library you want just return html string)
  import { highlight, languages } from 'prismjs/components/prism-core';
  import 'prismjs/components/prism-clike';
  import 'prismjs/components/prism-javascript';
  import 'prismjs/themes/prism-tomorrow.css'; // import syntax highlighting styles

  import { mapState, mapActions } from 'vuex'
  export default {
    components: {
      PrismEditor,
    },
    data () {
      return {
        width: 0,
        height: 0,
        showCode: true,
        code: `{
  init: function () {
    console.log("hi")
  }
  update: function () {

  }
}`,
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
        numClouds: 10,
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
      highlighter(code) {
        return highlight(code, languages.js); // languages.<insert language> to return html with markup
      },
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
      createAsteroid: function (type, x, y) {
        var a = this.sketch.createSprite(x, y);
        var img  = this.sketch.loadImage("/public/asteroid"+type+".png");
        // var img  = this.sketch.loadImage("/public/asteroid.jpg");
        a.addImage(img);
        a.setSpeed(-1+(type/5), this.sketch.random(360));
        a.type = type;
        if(type == 2)
            a.scale = 1;
        else if(type == 1)
            a.scale = 1.5;
        else
          a.scale=2

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

        function showCodeScreen() {
          this.showCode = true
        }
        sketch.setup = function () {
          let container = document.getElementById("p5-section")
          this.width = container.offsetWidth
          this.height = container.offsetHeight

          sketch.createCanvas(this.width, this.height);

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
              var px = sketch.random(this.width);
              // var py = this.height/2+ 1000 * sketch.sin(sketch.radians(ang));
              var py = sketch.random(this.height)
              this.createAsteroid(sketch.floor(sketch.random(3)), px, py);
          }

          this.ship = sketch.createSprite(this.width/2, this.height/2);
          this.ship.maxSpeed = 6;
          this.ship.friction = 0.05;
          this.ship.setCollider("circle", 0,0, 20);

          this.ship.addImage("normal", this.playerShipImage);
          this.ship.addAnimation("thrust", "/public/player_jet_moving_1.png", "/public/player_jet_moving_2.png");
        }.bind(this);

        sketch.draw = function () {
          sketch.background(45,45,45);
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
            sketch.text(`fighters ${this.showCode} remaining: ${this.numEnemies}`, this.sketch.width / 5, this.sketch.height - 40);
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
            this.clouds.bounce(this.clouds)

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

<style scoped>
  #outer {
    height: 100vh;
  }
  #p5-section {
    height: 75vh;
  }
  #code-section {
    height: 25vh;
  }
  .my-editor {
    /* we dont use `language-` classes anymore so thats why we need to add background and text color manually */
    background: #2d2d2d;
    color: #ccc;

    /* you must provide font-family font-size line-height. Example: */
    font-family: Fira code, Fira Mono, Consolas, Menlo, Courier, monospace;
    font-size: 14px;
    line-height: 1.5;
    padding: 5px;
  }

  /* optional class for removing the outline */
  /* .prism-editor__textarea:focus {
    outline: none;
  } */
</style>