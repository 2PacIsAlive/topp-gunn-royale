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
  (function () {
  var vm = {};
  var contextifiedSandboxes = [];

  function createIFrame() {
    var iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    return iframe;
  }

  function createIFrameWithContext(sandbox) {
    var iframe = createIFrame();
    var key;
    document.body.appendChild(iframe);
    if (sandbox) {
      for (key in sandbox) {
        if (sandbox.hasOwnProperty(key)) {
          iframe.contentWindow[key] = sandbox[key];
        }
      }
      contextifiedSandboxes.push(sandbox);
    }
    return iframe;
  }

  function runCodeInNewContext(code, sandbox) {
    var iframe = createIFrameWithContext(sandbox);
    var result = iframe.contentWindow.eval(code);
    document.body.removeChild(iframe);
    return result;
  }

  function runCodeInContext(code, context) {
    if (!context) {
      throw new Error('Context cannot be undefined');
    }
    return context.eval(code);
  }

  function Script(code) {
    this.code = code;
  }

  Script.prototype.runInContext = function (context) {
    return runCodeInContext(this.code, context);
  };

  Script.prototype.runInNewContext = function (sandbox) {
    return runCodeInNewContext(this.code, sandbox);
  };

  Script.prototype.runInThisContext = function () {
    return runCodeInContext(this.code, window);
  };

  vm.Script = Script;

  vm.createContext = function (sandbox) {
    return createIFrameWithContext(sandbox).contentWindow;
  };

  vm.isContext = function (sandbox) {
    return contextifiedSandboxes.indexOf(sandbox) !== -1;
  };

  vm.runInContext = function (code, context) {
    return runCodeInContext(code, context);
  };

  vm.runInDebugContext = function () {
    throw new Error('vm.runInDebugContext(code) does not work in browsers');
  };

  vm.runInNewContext = function (code, sandbox) {
    return runCodeInNewContext(code, sandbox);
  };

  vm.runInThisContext = function (code) {
    return runCodeInContext(code, window);
  };
  
  vm.createScript = function (code) {
    return new vm.Script(code);
  };

  window.vm = vm;
}());

  import { PrismEditor } from 'vue-prism-editor';
  import 'vue-prism-editor/dist/prismeditor.min.css'; // import the styles somewhere

  // import highlighting library (you can use any library you want just return html string)
  import { highlight, languages } from 'prismjs/components/prism-core';
  import 'prismjs/components/prism-clike';
  import 'prismjs/components/prism-javascript';
  import 'prismjs/themes/prism-tomorrow.css'; // import syntax highlighting styles

  import { mapState, mapActions } from 'vuex'
  // import {NodeVM} from 'vm2'

  export default {
    components: {
      PrismEditor,
    },
    data () {
      return {
        highscore: 0,
        error: null,
        width: 0,
        height: 0,
        showCode: true,
        code: `const nearestAsteroid = radar()
  .map(asteroid => {
    let diffX = ship.x - asteroid.x
    let diffY = ship.y - asteroid.y
    return {
      distance: diffX*diffX+diffY*diffY,
      x: asteroid.x,
      y: asteroid.y
    }
  })
  .reduce((prev, curr) => 
    prev.distance < curr.distance ? prev : curr
  );
  const angleDeg = Math.atan2(nearestAsteroid.y - ship.y, nearestAsteroid.x - ship.x) * 180 / Math.PI;
  rotate(angleDeg)
  engageThrusters()
  if (nearestAsteroid.distance < 10000) fireMissile()`,
        sketch: null,
        bullets: null,
        harmlessBullets: null,
        asteroids: null,
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
        numAsteroids: 25,
        numEnemies: 0,
        matchTime: 0,
        MARGIN: 20,
        gameOver: false,
        victory: false,
        //vm: new NodeVM(),
        context: null
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
          bullet.life = 10;
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
      createAsteroid: function (size, x, y) {
        let type = this.sketch.floor(this.sketch.random(3))
        var a = this.sketch.createSprite(x, y);
        var img  = this.sketch.loadImage("/public/asteroid"+type+"_small.png");
        // var img  = this.sketch.loadImage("/public/asteroid.jpg");
        a.addImage(img);
        a.setSpeed(5+(size/5), this.sketch.random(360));
        a.type = size; // ahhhhhhh
        if(size == 2)
            a.scale = 2;
        else if(size == 1)
            a.scale = 1.5;
        else
          a.scale=1

        a.mass = 2+a.scale;
        this.asteroids.add(a);
        return a;
      },
      asteroidHit: function(asteroid, bullet) {
        for(var i=0; i<10; i++) {
          var p = this.sketch.createSprite(asteroid.position.x, asteroid.position.y);
          p.addImage(this.explosionImage);
          p.setSpeed(this.sketch.random(3,5), this.sketch.random(360));
          p.friction = 0.55;
          p.life = 15;
        }

        bullet.remove();
        // this.hit(enemyShip.id, enemyShip.position.x, enemyShip.position.y)
        //enemyShip.armor -= 1;

        if (asteroid.type == 2) {
          this.createAsteroid(1, asteroid.position.x, asteroid.position.y)
          this.createAsteroid(1, asteroid.position.x, asteroid.position.y)
        } else if (asteroid.type == 1){
          this.createAsteroid(0, asteroid.position.x, asteroid.position.y)
        }
        asteroid.remove()

        // if (enemyShip.armor === 0) {
        //   enemyShip.remove();
        //   console.log(`${enemyShip.id} killed`)
        //   this.enemyPlayers[enemyShip.id].remove()
        //   delete this.enemyShipLocations[enemyShip.id]
        //   delete this.enemyPlayers[enemyShip.id]
        //   this.numEnemies -= 1;
        //   this.kill(enemyShip.id)
        //   this.killed.push(enemyShip.id)
        // }
      }
    },
    created: function () {
      this.timeStart = new Date().getTime();
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

          this.asteroids = new sketch.Group();
          this.bullets = new sketch.Group();
          this.harmlessBullets = new sketch.Group();
          this.enemyShips = new sketch.Group();

          for(var i = 0; i<this.numAsteroids; i++) {
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
          let that = this
          var sandbox = { 
            ship: {
              x: that.ship.position.x,
              y: that.ship.position.y
            },
            engageThrusters: function () {
              that.ship.setSpeed(5, that.ship.rotation)
              that.ship.changeAnimation("thrust");
            },
            disengageThrusters: function () {
              that.ship.changeAnimation("normal")
            },
            fireMissile: function () {
              var bullet = sketch.createSprite(that.ship.position.x, that.ship.position.y);
              bullet.addImage(that.bulletImage);
              bullet.setSpeed(15, that.ship.rotation);
              bullet.rotation = that.ship.rotation
              bullet.life = 10;
              that.bullets.add(bullet);
            },
            rotate: function (degrees) {
              that.ship.rotation = degrees
            },
            radar: function () {
              return that.asteroids.map(asteroid => {
                return {
                  size: asteroid.type + 1,
                  x: asteroid.position.x,
                  y: asteroid.position.y
                }
              })
            }

          };
          this.context = vm.createContext(sandbox)
          try {
            vm.runInContext(this.code, this.context);
            this.gameOver = false
            if (this.timeStart === null) 
              this.timeStart = new Date().getTime()
          } catch (err) {
            this.lastGameScore = this.matchTime
            if (this.lastGameScore > this.highscore) this.highscore = this.lastGameScore
            this.error = err
            this.gameOver = true
            this.timeStart = null
          }
          sketch.background(45,45,45);
          sketch.fill(0);

          if (this.gameOver) {
            sketch.textAlign(sketch.CENTER);
            sketch.textSize(26);
            sketch.fill(255,255,255)
            sketch.textFont('Fira code, Fira Mono, Consolas, Menlo, Courier, monospace');
            sketch.text('game over', this.sketch.width/2, this.sketch.height/2);
            sketch.textSize(20);
            sketch.textFont('Fira code, Fira Mono, Consolas, Menlo, Courier, monospace');
            sketch.text(`survived: ${this.lastGameScore/1000}s`, this.sketch.width/2, this.sketch.height/2 + 30);
            sketch.text(`highscore: ${this.highscore/1000}s`, this.sketch.width/2, this.sketch.height/2 + 50);
            sketch.fill(255, 0, 0)
            sketch.textSize(36);
            sketch.text(`error: ${this.error}`, this.sketch.width/2, this.sketch.height/2 + 100);
          } else {
            sketch.textAlign(sketch.LEFT);
            sketch.textSize(42);
            sketch.textFont('Fira code, Fira Mono, Consolas, Menlo, Courier, monospace');
            //sketch.text(`fighters ${this.showCode} remaining: ${this.numEnemies}`, this.sketch.width / 5, this.sketch.height - 40);
            if (!this.gameOver) {
              this.matchTime = this.sketch.floor(new Date().getTime() - this.timeStart)
            }
            sketch.fill('white')
            sketch.text(`${this.matchTime / 1000}s`, 20, 50);

            for (var i = 0; i < sketch.allSprites.length; i++) {
              var s = sketch.allSprites[i];
              if (s.position.x < -this.MARGIN) s.position.x = sketch.width + this.MARGIN;
              if (s.position.x > sketch.width + this.MARGIN) s.position.x = -this.MARGIN;
              if (s.position.y < -this.MARGIN) s.position.y = sketch.height + this.MARGIN;
              if (s.position.y > sketch.height + this.MARGIN) s.position.y = -this.MARGIN;
            }

            this.asteroids.overlap(this.bullets, this.asteroidHit);

            this.ship.bounce(this.enemyShips);
            this.asteroids.bounce(this.asteroids)

            if (sketch.keyDown(sketch.LEFT_ARROW))
              this.ship.rotation -= 4;
            if (sketch.keyDown(sketch.RIGHT_ARROW))
              this.ship.rotation += 4;
            if (sketch.keyDown(sketch.UP_ARROW)) {
              this.ship.addSpeed(.5, this.ship.rotation);
              this.ship.changeAnimation("thrust");
            }
            // else
            //   this.ship.changeAnimation("normal");

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
      new p5(s, 'p5-section');
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