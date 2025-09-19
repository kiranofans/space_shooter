import express from "express";
import path from "path";
import { fileURLToPath } from "url";

// Needed for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Serve static files (CSS, JS, images)
app.use("/static", express.static(path.join(__dirname, "static")));

// Route for index.html
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "templates/index.html"));
});

// Start server on port 5000
app.listen(5000, "0.0.0.0", () => {
  console.log("Server running at http://0.0.0.0:5000");
});
