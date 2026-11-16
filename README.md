# Space Shooter

A lightweight, browser-based 2D arcade space shooter built with HTML5 Canvas, JavaScript, Tailwind CSS, and Vite. Designed to run both as a standard web app and as a standalone, single-file HTML bundle using `vite-plugin-singlefile`.

## Features

- **Arcade Space Combat:** Pilot your starfighter (`spaceship.webm`) against incoming enemy waves (`enemy_small.png`) with animated explosion effects (`player_explosion.webm`).
- **Audio & Controls:** Includes background music (`StarfighterAscent_small.mp3`) with sound toggled off by default and responsive UI controls.
- **Responsive UI:** Styled with Tailwind CSS (`game_style.css`) for clean scaling across screens.
- **Single-File Bundling:** Configured with `vite-plugin-singlefile` to inline all JavaScript, CSS, and media assets into a single portable `index.html` file.

## Project Structure

```text
space_shooter/
├── assets/
│   ├── audio/
│   │   └── StarfighterAscent_small.mp3   # Compressed background audio
│   ├── enemy_small.png                   # Enemy ship sprite
│   ├── generated-icon.png                # Game icon
│   ├── player_explosion.webm             # Explosion animation for player & enemies
│   └── spaceship.webm                    # Player spaceship animation
├── index.html                            # Main HTML entry point
├── game.js                               # Core game loop, rendering, and mechanics
├── game_style.css                        # Tailwind CSS & custom styles
├── main_server.js                        # Local server script
├── vite.config.js                        # Vite & singlefile plugin configuration
├── tailwind.config.cjs                   # Tailwind CSS configuration
├── postcss.config.cjs                    # PostCSS configuration
└── package.json                          # Dependencies and build scripts
```

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+ recommended) and npm

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/kiranofans/space_shooter.git
   cd space_shooter
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Development
Start the local Vite development server:
```bash
npm run dev
```

### Building a Standalone Single File
This project uses `vite-plugin-singlefile` to package the entire game (scripts, styles, and assets) into one self-contained HTML file inside `dist/index.html`. To generate the single-file build, run:
```bash
npm run build
```
*(Note: If you have a custom script name in `package.json`, such as `build:single`, run `npm run <script-name>` instead.)*

## Tech Stack
- **Core:** JavaScript (ES6+), HTML5 Canvas
- **Styling:** Tailwind CSS, PostCSS
- **Build Tool:** Vite + `vite-plugin-singlefile`
