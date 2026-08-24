const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: JSON_HEADERS });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return json({
        ok: true,
        service: "genevieve-budget",
        phase: 3,
        runtime: "cloudflare-workers",
      });
    }

    if (url.pathname === "/ready") {
      const assetsReady = Boolean(env?.ASSETS && typeof env.ASSETS.fetch === "function");
      return json(
        {
          ok: assetsReady,
          service: "genevieve-budget",
          phase: 3,
          assets: assetsReady ? "ready" : "unavailable",
          database: "not-configured-phase-4",
        },
        assetsReady ? 200 : 503
      );
    }

    return env.ASSETS.fetch(request);
  },
};
