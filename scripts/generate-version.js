const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")

const rootDir = path.join(__dirname, "..")
const packageJsonPath = path.join(rootDir, "package.json")
const outputPath = path.join(rootDir, "public", "version.json")

function getGitShortSha() {
  try {
    return execSync("git rev-parse --short HEAD", {
      cwd: rootDir,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim()
  } catch {
    return null
  }
}

function generateVersionFile() {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"))
  const payload = {
    version: packageJson.version || "0.0.0",
    commit: getGitShortSha(),
    builtAt: new Date().toISOString(),
  }

  fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8")
  console.log(`Version metadata generated at ${outputPath}`)
}

generateVersionFile()
