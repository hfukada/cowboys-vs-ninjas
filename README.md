# Ninjas vs Cowboys

A 2D top-down browser game where ninjas and cowboys battle it out!

## Features

- **Two Teams**: Ninjas (purple) vs Cowboys (orange)
- **Configurable Parameters**:
  - Number of ninjas (1-50)
  - Number of cowboys (1-50)
  - Ninja speed
  - Cowboy speed
  - Fire rate (how often cowboys shoot)
  - Bullet speed
- **Dynamic Gameplay**:
  - Ninjas chase and slash cowboys
  - Cowboys shoot bullets at ninjas while moving randomly
  - Entities bounce off screen edges
  - Win conditions: eliminate all enemies
- **Pixelated Retro Style**: Low-effort pixelated graphics for that classic game feel

## How to Play

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the server**:
   ```bash
   npm start
   ```

3. **Open your browser** and navigate to:
   ```
   http://localhost:3000
   ```

4. **Configure the game** using the sliders:
   - Adjust ninja and cowboy counts
   - Tweak speeds and fire rates
   - Click "Start Game" to begin

5. **Watch the battle unfold**:
   - Ninjas (purple) spawn on the left and chase cowboys
   - Cowboys (orange) spawn on the right and shoot at ninjas
   - First team to eliminate all enemies wins!

## Game Rules

### Ninjas
- Spawn on the left side of the screen
- Pick a random cowboy as a target
- Move directly toward their target
- When they touch a cowboy, the cowboy dies
- Switch targets when:
  - Their current target dies
  - They hit a wall

### Cowboys
- Spawn on the right side of the screen
- Move slowly in random straight lines
- Pick a random ninja to shoot at
- Fire bullets at their target
- Switch targets when their current target dies
- Bounce off walls and continue moving

### Bullets
- Travel in a straight line toward the ninja's position when fired
- Kill ninjas on contact
- Disappear when they hit a ninja or go off-screen

## Win Conditions
- **Cowboys Win**: All ninjas are eliminated
- **Ninjas Win**: All cowboys are eliminated

## Future Enhancements
- The game is designed to support pulling ninja/cowboy counts from an API
- Configuration values can be adjusted in real-time
- Easy to extend with new features (health bars, special abilities, etc.)

## Tech Stack
- **Frontend**: HTML5 Canvas, CSS, Vanilla JavaScript
- **Backend**: Node.js + Express
- **No external dependencies** for the game logic itself

Enjoy the battle!
