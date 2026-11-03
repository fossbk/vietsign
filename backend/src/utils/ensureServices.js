const net = require("net");
const { execSync, spawnSync } = require("child_process");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

const DB_HOST = process.env.DB_HOST || "localhost";
const DB_PORT = parseInt(process.env.DB_PORT || "3308", 10);
const MINIO_HOST = process.env.MINIO_ENDPOINT || "localhost";
const MINIO_PORT = parseInt(process.env.MINIO_PORT || "9000", 10);

function checkPort(host, port, timeoutMs = 1500) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isResolved = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      isResolved = true;
      socket.destroy();
      resolve(true);
    });

    socket.once("timeout", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.once("error", () => {
      if (!isResolved) {
        isResolved = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
}

function isDockerRunning() {
  try {
    const result = spawnSync("docker", ["info"], { stdio: "ignore" });
    return result.status === 0;
  } catch {
    return false;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureServices() {
  const isLocalDb = DB_HOST === "localhost" || DB_HOST === "127.0.0.1";
  if (!isLocalDb) {
    return;
  }

  const dbAlive = await checkPort(DB_HOST, DB_PORT);
  const minioAlive = await checkPort(MINIO_HOST, MINIO_PORT);

  if (dbAlive && minioAlive) {
    console.log(`[Services] Database (${DB_HOST}:${DB_PORT}) and MinIO (${MINIO_HOST}:${MINIO_PORT}) are reachable.`);
    return;
  }

  console.log(`[Services] Checking local infrastructure (DB reachable: ${dbAlive}, MinIO reachable: ${minioAlive})...`);

  if (!isDockerRunning()) {
    console.log("[Services] Docker daemon is not active. Attempting to start container runtime...");
    try {
      const hasOrb = spawnSync("which", ["orb"], { stdio: "ignore" }).status === 0;
      if (hasOrb) {
        console.log("[Services] Starting OrbStack via 'orb start'...");
        spawnSync("orb", ["start"], { stdio: "ignore", timeout: 15000 });
      } else {
        const hasDockerApp = spawnSync("test", ["-d", "/Applications/Docker.app"]).status === 0;
        if (hasDockerApp) {
          console.log("[Services] Starting Docker Desktop...");
          spawnSync("open", ["-a", "Docker"], { stdio: "ignore" });
        }
      }

      // Wait up to 10 seconds for Docker daemon to become responsive
      let dockerWait = 0;
      while (dockerWait < 10) {
        await sleep(1000);
        if (isDockerRunning()) {
          console.log("[Services] Docker daemon is now running!");
          break;
        }
        dockerWait++;
      }
    } catch (err) {
      // Ignore start attempts
    }
  }

  if (!isDockerRunning()) {
    console.warn("\n⚠️  WARNING: Docker daemon is not running and MySQL (port " + DB_PORT + ") is unreachable!");
    console.warn("👉 Please start OrbStack or Docker Desktop to run local database and MinIO.\n");
    return;
  }

  console.log("[Services] Docker daemon is running. Attempting to start 'vietsign_db' and 'vietsign_minio' containers...");
  try {
    execSync("docker start vietsign_db vietsign_minio", { stdio: "pipe" });
    console.log("[Services] Containers vietsign_db and vietsign_minio started.");
  } catch {
    try {
      const composeFile = path.join(__dirname, "../../../docker-compose.yml");
      execSync(`docker compose -f "${composeFile}" up -d db minio`, { stdio: "pipe" });
      console.log("[Services] docker compose up -d db minio completed.");
    } catch (composeErr) {
      console.error("[Services] Failed to start containers via docker compose:", composeErr.message);
    }
  }

  console.log(`[Services] Waiting for MySQL on port ${DB_PORT} to become ready...`);
  let attempts = 0;
  const maxAttempts = 15;
  while (attempts < maxAttempts) {
    await sleep(1500);
    const ready = await checkPort(DB_HOST, DB_PORT);
    if (ready) {
      console.log(`[Services] ✅ MySQL is accepting connections on port ${DB_PORT}!`);
      return;
    }
    attempts++;
  }

  console.warn(`[Services] ⚠️ MySQL did not respond within ${maxAttempts * 1.5}s. Continuing startup...`);
}

if (require.main === module) {
  ensureServices().catch((err) => {
    console.error("[Services] Error during ensureServices:", err);
  });
}

module.exports = { ensureServices, checkPort, isDockerRunning };
