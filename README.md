# topp-gunn-royale

> blast asteroids with code
> https://toppgunnroyale.surge.sh/

## Example code
``` javascript
const radar = ship.radar()
if (radar.length > 0) {
  const nearestAsteroid = ship.radar()
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
  ship.rotate(angleDeg)
  ship.engageThrusters()
  if (nearestAsteroid.distance < 10000)
    ship.fireMissile()
} else {
  ship.disengageThrusters()
}
```

## Build Setup

``` bash
# install dependencies
npm install

# serve with hot reload at localhost:8080
npm run dev

# build for production with minification
npm run build
```

For detailed explanation on how things work, consult the [docs for vue-loader](http://vuejs.github.io/vue-loader).
