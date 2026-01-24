const { main } = require("./src/js/build");

main().catch((error) => {
  console.error("Build failed:", error);
  process.exitCode = 1;
});
