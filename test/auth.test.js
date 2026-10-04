const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";

const appModule = require("../app");
const user = {
  id: "user-123",
  email: "student@example.com",
  user_metadata: {}
};
const token = "test-access-token";
let server;
let baseUrl;
let loginError = null;
let validToken = true;
const authClient = {
  auth: {
    async signInWithPassword({ email, password }) {
      if (loginError) {
        return { data: { session: null }, error: loginError };
      }
      if (email !== user.email || password !== "correct-password") {
        return { data: { session: null }, error: { status: 400 } };
      }
      return {
        data: {
          session: { access_token: token, token_type: "bearer", expires_in: 3600 }
        },
        error: null
      };
    },
    async getUser(accessToken) {
      if (!validToken || accessToken !== token) {
        return { data: { user: null }, error: { status: 401 } };
      }
      return { data: { user }, error: null };
    }
  }
};

before(async () => {
  server = appModule.createApp(authClient).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
});

test("login rejects invalid credentials", async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userName: user.email, password: "wrong-password" })
  });
  assert.equal(response.status, 401);
});

test("login returns a Supabase access token accepted by protected routes", async () => {
  const login = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ userName: user.email, password: "correct-password" })
  });
  assert.equal(login.status, 200);
  const result = await login.json();
  assert.equal(result.token, token);
  assert.equal(result.tokenType, "bearer");

  const auth = await fetch(`${baseUrl}/auth`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(auth.status, 200);
  assert.deepEqual(await auth.json(), {
    authenticated: true,
    user: { id: user.id, userName: user.email }
  });

  const hello = await fetch(`${baseUrl}/hello`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(hello.status, 200);
  assert.deepEqual(await hello.json(), { message: "Hello World" });
});

test("protected routes reject missing and invalid tokens", async () => {
  const missing = await fetch(`${baseUrl}/hello`);
  assert.equal(missing.status, 401);

  validToken = false;
  const invalid = await fetch(`${baseUrl}/hello`, {
    headers: { authorization: `Bearer ${token}` }
  });
  assert.equal(invalid.status, 401);
  validToken = true;
});

test("login accepts email as the login field", async () => {
  const response = await fetch(`${baseUrl}/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: user.email, password: "correct-password" })
  });
  assert.equal(response.status, 200);
});
