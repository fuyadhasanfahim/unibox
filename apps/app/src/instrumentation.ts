// Runs once when the server starts, so a missing or invalid env var stops boot instead of failing mid-request.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./env/server");
    await import("./env/client");
  }
}
