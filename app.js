const express = require("express");
const createAuthMiddleware = require("./auth-middleware");
const supabase = require("./supabase");

function createApp(authClient = supabase) {
  const app = express();
  const authenticateToken = createAuthMiddleware(authClient);

  app.use(express.json());

  app.post("/login", async (req, res, next) => {
    const body = req.body || {};
    const email = body.email ?? body.userName;
    const { password } = body;
    if (typeof email !== "string" || typeof password !== "string" ||
        !email.trim() || !password) {
      return res.status(400).json({ error: "email (or userName) and password are required" });
    }

    try {
      const { data, error } = await authClient.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        if (error.status === 429) {
          return res.status(429).json({ error: "Too many login attempts" });
        }
        if (error.status >= 500) {
          return next(error);
        }
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const session = data.session;
      if (!session?.access_token) {
        return next(new Error("Supabase Auth did not return an access token"));
      }

      return res.json({
        token: session.access_token,
        tokenType: session.token_type || "bearer",
        expiresIn: session.expires_in
      });
    } catch (error) {
      return next(error);
    }
  });

  app.get("/auth", authenticateToken, (req, res) => {
    res.json({
      authenticated: true,
      user: { id: req.user.id, userName: req.user.email }
    });
  });

  app.get("/hello", authenticateToken, (req, res) => {
    res.json({ message: "Hello World" });
  });

  app.use((error, req, res, next) => {
    console.error(error);
    const status = error.status === 400 ? 400 : 502;
    res.status(status).json({
      error: status === 400 ? "Invalid JSON request body" : "Authentication service unavailable"
    });
  });

  return app;
}

const app = createApp();
app.createApp = createApp;

module.exports = app;
