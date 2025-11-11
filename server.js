const express = require('express');
const path = require('path');
const redis = require('redis');

const app = express();
const PORT = process.env.PORT || 3000;

// Redis client setup
const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Connected to Redis'));

// Initialize Redis connection
(async () => {
  await redisClient.connect();

  // Initialize counters if they don't exist
  const ninjaCounter = await redisClient.get('cvn:ninjaCounter');
  const cowboyCounter = await redisClient.get('cvn:cowboyCounter');
  const ninjaWins = await redisClient.get('cvn:ninjaWins');
  const cowboyWins = await redisClient.get('cvn:cowboyWins');
  const treeDensity = await redisClient.get('cvn:treeDensity');

  if (ninjaCounter === null) await redisClient.set('cvn:ninjaCounter', '10');
  if (cowboyCounter === null) await redisClient.set('cvn:cowboyCounter', '10');
  if (ninjaWins === null) await redisClient.set('cvn:ninjaWins', '0');
  if (cowboyWins === null) await redisClient.set('cvn:cowboyWins', '0');
  if (treeDensity === null) await redisClient.set('cvn:treeDensity', '1');

  console.log('Redis initialized');
})();

// Serve static files from the public directory
app.use(express.static('public'));
app.use(express.json());

// Serve the main game page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoint to add a random ninja or cowboy
app.get('/cvn/add', async (req, res) => {
  const MAX_COUNT = 2000;

  // Get current counts
  const currentNinjas = parseInt(await redisClient.get('cvn:ninjaCounter')) || 0;
  const currentCowboys = parseInt(await redisClient.get('cvn:cowboyCounter')) || 0;

  // Randomly decide: 0 = ninja (spawns on left), 1 = cowboy (spawns on right)
  const addCowboy = Math.random() < 0.5;

  let ninjaCounter, cowboyCounter;
  let added = null;

  if (addCowboy && currentCowboys < MAX_COUNT) {
    cowboyCounter = await redisClient.incr('cvn:cowboyCounter');
    ninjaCounter = currentNinjas;
    await redisClient.incr('cvn:spawnCowboy');
    added = 'cowboy';
    console.log(`Cowboy added randomly! Total ninjas: ${ninjaCounter}, Total cowboys: ${cowboyCounter}`);
  } else if (!addCowboy && currentNinjas < MAX_COUNT) {
    ninjaCounter = await redisClient.incr('cvn:ninjaCounter');
    cowboyCounter = currentCowboys;
    await redisClient.incr('cvn:spawnNinja');
    added = 'ninja';
    console.log(`Ninja added randomly! Total ninjas: ${ninjaCounter}, Total cowboys: ${cowboyCounter}`);
  } else {
    // Max limit reached for the randomly selected type
    ninjaCounter = currentNinjas;
    cowboyCounter = currentCowboys;
    console.log(`Max limit reached. Cannot add more ${addCowboy ? 'cowboys' : 'ninjas'}.`);
  }

  res.json({
    success: added !== null,
    added: added,
    ninjas: ninjaCounter,
    cowboys: cowboyCounter,
    message: added === null ? 'Max limit reached' : undefined
  });
});

// API endpoint to add a ninja
app.get('/cvn/add/ninja', async (req, res) => {
  const MAX_COUNT = 2000;

  // Get current count
  const currentNinjas = parseInt(await redisClient.get('cvn:ninjaCounter')) || 0;

  if (currentNinjas >= MAX_COUNT) {
    const cowboyCounter = await redisClient.get('cvn:cowboyCounter');
    console.log(`Max ninja limit reached (${MAX_COUNT}). Cannot add more ninjas.`);
    res.json({
      success: false,
      ninjas: currentNinjas,
      cowboys: parseInt(cowboyCounter),
      message: 'Max ninja limit reached'
    });
    return;
  }

  const ninjaCounter = await redisClient.incr('cvn:ninjaCounter');
  const cowboyCounter = await redisClient.get('cvn:cowboyCounter');

  // Signal to spawn a ninja in the current game
  await redisClient.incr('cvn:spawnNinja');

  console.log(`Ninja added! Total ninjas: ${ninjaCounter}, Total cowboys: ${cowboyCounter}`);
  res.json({
    success: true,
    ninjas: parseInt(ninjaCounter),
    cowboys: parseInt(cowboyCounter)
  });
});

// API endpoint to add a cowboy
app.get('/cvn/add/cowboy', async (req, res) => {
  const MAX_COUNT = 2000;

  // Get current count
  const currentCowboys = parseInt(await redisClient.get('cvn:cowboyCounter')) || 0;

  if (currentCowboys >= MAX_COUNT) {
    const ninjaCounter = await redisClient.get('cvn:ninjaCounter');
    console.log(`Max cowboy limit reached (${MAX_COUNT}). Cannot add more cowboys.`);
    res.json({
      success: false,
      ninjas: parseInt(ninjaCounter),
      cowboys: currentCowboys,
      message: 'Max cowboy limit reached'
    });
    return;
  }

  const cowboyCounter = await redisClient.incr('cvn:cowboyCounter');
  const ninjaCounter = await redisClient.get('cvn:ninjaCounter');

  // Signal to spawn a cowboy in the current game
  await redisClient.incr('cvn:spawnCowboy');

  console.log(`Cowboy added! Total ninjas: ${ninjaCounter}, Total cowboys: ${cowboyCounter}`);
  res.json({
    success: true,
    ninjas: parseInt(ninjaCounter),
    cowboys: parseInt(cowboyCounter)
  });
});

// API endpoint to check for spawn events (polled by frontend)
app.get('/cvn/spawn-events', async (req, res) => {
  const spawnNinja = await redisClient.get('cvn:spawnNinja');
  const spawnCowboy = await redisClient.get('cvn:spawnCowboy');

  const ninjaCount = parseInt(spawnNinja) || 0;
  const cowboyCount = parseInt(spawnCowboy) || 0;

  // Reset the counters after reading
  if (ninjaCount > 0) await redisClient.set('cvn:spawnNinja', '0');
  if (cowboyCount > 0) await redisClient.set('cvn:spawnCowboy', '0');

  res.json({
    ninjas: ninjaCount,
    cowboys: cowboyCount
  });
});

// API endpoint to get current counts
app.get('/cvn/counts', async (req, res) => {
  const ninjaCounter = await redisClient.get('cvn:ninjaCounter');
  const cowboyCounter = await redisClient.get('cvn:cowboyCounter');
  const ninjaWins = await redisClient.get('cvn:ninjaWins');
  const cowboyWins = await redisClient.get('cvn:cowboyWins');
  const treeDensity = await redisClient.get('cvn:treeDensity');

  res.json({
    ninjas: parseInt(ninjaCounter),
    cowboys: parseInt(cowboyCounter),
    ninjaWins: parseInt(ninjaWins),
    cowboyWins: parseInt(cowboyWins),
    treeDensity: parseFloat(treeDensity)
  });
});

// API endpoint to get game configuration
app.get('/cvn/config', async (req, res) => {
  const ninjaCounter = await redisClient.get('cvn:ninjaCounter');
  const cowboyCounter = await redisClient.get('cvn:cowboyCounter');
  const treeDensity = await redisClient.get('cvn:treeDensity');

  // Use counters from Redis, with minimum of 10 each
  const ninjaCount = Math.max(10, parseInt(ninjaCounter) || 10);
  const cowboyCount = Math.max(10, parseInt(cowboyCounter) || 10);

  res.json({
    ninjaCount: ninjaCount,
    cowboyCount: cowboyCount,
    treeDensity: parseFloat(treeDensity) || 1
  });
});

// API endpoint to record a win
app.post('/cvn/win', async (req, res) => {
  const { winner } = req.body;

  if (winner === 'Ninjas') {
    await redisClient.incr('cvn:ninjaWins');
  } else if (winner === 'Cowboys') {
    await redisClient.incr('cvn:cowboyWins');
  }

  const ninjaWins = parseInt(await redisClient.get('cvn:ninjaWins'));
  const cowboyWins = parseInt(await redisClient.get('cvn:cowboyWins'));

  // Calculate balanced tree density based on win difference
  // If ninjas winning more: decrease tree density (helps cowboys)
  // If cowboys winning more: increase tree density (helps ninjas)
  const winDifference = ninjaWins - cowboyWins;
  const baseTreeDensity = 1;
  let balancedTreeDensity = baseTreeDensity - (winDifference * 0.1);

  // Ensure tree density stays reasonable (between 0 and 10)
  balancedTreeDensity = Math.max(0, Math.min(10, balancedTreeDensity));

  await redisClient.set('cvn:treeDensity', balancedTreeDensity.toString());

  console.log(`${winner} won! Ninja wins: ${ninjaWins}, Cowboy wins: ${cowboyWins}, Tree density adjusted to: ${balancedTreeDensity}`);

  res.json({
    success: true,
    ninjaWins: ninjaWins,
    cowboyWins: cowboyWins,
    treeDensity: balancedTreeDensity
  });
});

// API endpoint to reset counters and wins
app.post('/cvn/reset', async (req, res) => {
  await redisClient.set('cvn:ninjaCounter', '10');
  await redisClient.set('cvn:cowboyCounter', '10');
  await redisClient.set('cvn:ninjaWins', '0');
  await redisClient.set('cvn:cowboyWins', '0');
  await redisClient.set('cvn:treeDensity', '1');

  console.log('All counters reset');

  res.json({
    success: true,
    ninjas: 0,
    cowboys: 0,
    ninjaWins: 0,
    cowboyWins: 0,
    treeDensity: 1
  });
});

app.listen(PORT, () => {
  console.log(`Ninjas vs Cowboys server running on http://localhost:${PORT}`);
});
