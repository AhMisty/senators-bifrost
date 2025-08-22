<div align="center">
  <h1>Bifrost</h1>
  <img src="https://github.com/AhMisty/senators-bifrost/blob/main/logo.svg?raw=true" width="30%"/>
  
  [![npm version](https://img.shields.io/npm/v/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE)
  [![npm downloads](https://img.shields.io/npm/dm/@senators/bifrost.svg?style=flat-square)](https://www.npmjs.com/package/@senators/bifrost)
  
  <span style="color: #999">English</span> | [中文](https://github.com/AhMisty/senators-bifrost/blob/main/docs/zh-CN/README.md)
</div>

> 🚀 A powerful TypeScript library for interacting with OGame game servers, making your interstellar journey easier!

## ✨ Features

- 🛡️ Complete OGame API wrapper
- 🔐 Secure account login and session management
- 🚀 Powerful fleet operation management
- 🌍 Comprehensive planet and resource management system
- 🏗️ Building and research queue control
- 🛠️ Type-safe API design
- ⚡ High-performance request handling
- 🔄 Real-time data updates and event hooks

## 🚀 Quick Start

### Install

```bash
# Use npm
npm install @senators/bifrost

# Use yarn
yarn add @senators/bifrost

# Use pnpm
pnpm add @senators/bifrost
```

### Usage

```typescript
import { Operator, Courier, Config } from '@senators/bifrost'

// Create configuration
const config = new Config()

// Create HTTP client
const courier = new Courier('https://example.com', 10000)

// Create operator instance
const operator = new Operator(
  1, // Universe ID
  'username', // Username
  'password', // Password
  courier,
  config,
)

// Optional: Add hook functions
operator.onUpdateControl = async (_operator) => {
  console.log('Updating overview data')
}
operator.onUpdateResearch = async (_operator) => {
  console.log('Updating research data')
}
operator.onUpdatePlanets = async (_operator) => {
  console.log('Updating planet data')
}
// ......
operator.onUpdatePlanetBuilding = async (_operator, planet) => {
  console.log(`Updating building data for planet ${planet.name}[${planet.coordinate.toString()}]`)
}
operator.onUpdatePlanetShipyard = async (_operator, planet) => {
  console.log(`Updating shipyard data for planet ${planet.name}[${planet.coordinate.toString()}]`)
}
// ......

// Update game data (handles login automatically)
await operator.update()

// Access game data
console.log(operator)
```

## 🚀 Fleet Mission Example

Here's a complete example of how to send an expedition fleet:

```typescript
import { Operator, Courier, Config, Fleet, Elements } from '@senators/bifrost'

// Initialize configuration and client
const config = new Config()
const courier = new Courier('https://example.com', 10000)

// Create operator
const operator = new Operator(1, 'username', 'password', courier, config)

// Configure fleet
const ships = new Elements()
ships.set(210, 99999) // Set ship type 210, quantity 99999

// Create fleet mission
const fleet = new Fleet({
  cp: 1, // Starting planet ID
  galaxy: 1, // Target galaxy
  system: 1, // Target system
  planet: 1, // Target planet
  type: 1, // Planet type: 1=planet
  mission: 15, // Mission type: 15=expedition
  speed: 10, // Speed: 10=fastest
  staytime: 1, // Stay time: 1 hour
  metal: 0, // Metal: 0
  crystal: 0, // Crystal: 0
  deuterium: 0, // Deuterium: 0
  ships, // Ship configuration
})

// Execute fleet mission
console.log('Sending fleet...')
await operator.sendFleet(fleet)
console.log('Fleet sent!')

// Schedule execution (optional)
const INTERVAL_MINUTES = 20
setInterval(
  async () => {
    console.log(`Executing fleet mission ${new Date().toLocaleTimeString()}`)
    await operator.sendFleet(fleet)
  },
  1000 * 60 * INTERVAL_MINUTES,
)
```

### 🎯 Mission Types (FleetMission)

| ID  | Type       | Description           |
| --- | ---------- | --------------------- |
| 1   | Attack     | Attack target         |
| 2   | Federation | Alliance mission      |
| 3   | Transport  | Transport resources   |
| 4   | Deploy     | Deploy fleet          |
| 5   | Hold       | Station in orbit      |
| 6   | Spy        | Espionage mission     |
| 7   | Colonize   | Establish colony      |
| 8   | Recycle    | Recycle debris        |
| 9   | Destroy    | Destroy moon          |
| 10  | Missile    | Missile attack        |
| 11  | Expedition | Expedition mission    |
| 15  | Deep Space | Deep space expedition |
| 18  | Trade      | Trade mission         |

## 🧩 Core Modules

| Module             | Description                                                 |
| ------------------ | ----------------------------------------------------------- |
| **Operator**       | 🧠 Core operations class, handles login and in-game actions |
| **Courier**        | 🌐 HTTP request handling, communicates with game server     |
| **Fleet**          | 🚀 Fleet management, creates and executes fleet missions    |
| **Planets/Planet** | 🌍 Planet management system, handles all colonies           |
| **Elements**       | 🏗️ In-game elements (resources, buildings, research, etc.)  |
| **Queue**          | ⏳ Queue management, handles building and research queues   |
| **Config**         | ⚙️ Configuration management, customizes client behavior     |

## 🛠️ Development Guide

### Building the Project

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

### Code Style

```bash
# Check code style
npm run lint

# Format code
npm run format
```

## 📜 License

This project is licensed under the [MIT License](https://github.com/AhMisty/senators-bifrost/blob/main/LICENSE). You are free to use, modify, and distribute the code in this project.

## 🙏 Acknowledgments

- [OGame](https://ogame.gameforge.com) - A fascinating space strategy game
- All contributors - Thank you for your valuable contributions!

## 🤝 Contributing

Issues and Pull Requests are welcome!

1. Fork the project
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Contact

If you have any questions or suggestions, please submit them via [GitHub Issues](https://github.com/AhMisty/senators-bifrost/issues).

---

<div align="center">
  <p>Built with <a href="https://github.com/rolldown/rolldown">Rolldown</a> | © 2025 Bifrost Project</p>
</div>
