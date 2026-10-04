function createAuthMiddleware(supabase) {
  return async function authenticateToken(req, res, next) {
    const authorization = req.get("authorization");
    const match = authorization && authorization.match(/^Bearer\s+(.+)$/i);

    if (!match) {
      return res.status(401).json({ error: "Missing bearer token" });
    }

    try {
      const { data, error } = await supabase.auth.getUser(match[1]);

      if (error) {
        if ([400, 401, 403].includes(error.status)) {
          return res.status(401).json({ error: "Invalid or expired token" });
        }
        return next(error);
      }

      if (!data.user) {
        return res.status(401).json({ error: "Invalid or expired token" });
      }

      req.user = data.user;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = createAuthMiddleware;
