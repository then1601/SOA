const { test, before, after } = require("node:test");
const assert = require("node:assert/strict");

process.env.SUPABASE_URL = "https://example.supabase.co";
process.env.SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test-key";

const { createProductsApp } = require("../products-app");

const token = "product-test-token";
let validToken = true;
let server;
let baseUrl;
let products;

const authClient = {
  auth: {
    async getUser(accessToken) {
      if (!validToken || accessToken !== token) {
        return { data: { user: null }, error: { status: 401 } };
      }
      return { data: { user: { id: "user-123" } }, error: null };
    }
  }
};

before(async () => {
  let nextId = 1;
  const rows = [];
  products = (accessToken) => {
    assert.equal(accessToken, token);
    return {
      async list() {
        return rows.map((row) => ({ ...row }));
      },
      async findById(id) {
        return rows.find((row) => row.id === id) || null;
      },
      async create(product) {
        const timestamp = new Date().toISOString();
        const row = { id: nextId++, ...product, created_at: timestamp, updated_at: timestamp };
        rows.push(row);
        return row;
      },
      async update(id, product) {
        const row = rows.find((item) => item.id === id);
        if (!row) return null;
        Object.assign(row, product, { updated_at: new Date(Date.now() + 1).toISOString() });
        return { ...row };
      },
      async delete(id) {
        const index = rows.findIndex((row) => row.id === id);
        if (index === -1) return false;
        rows.splice(index, 1);
        return true;
      }
    };
  };
  server = createProductsApp(authClient, products).listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}

test("product routes require a valid bearer token", async () => {
  const missing = await fetch(`${baseUrl}/products`);
  assert.equal(missing.status, 401);

  validToken = false;
  const invalid = await request("/products");
  assert.equal(invalid.status, 401);
  validToken = true;
});

test("products API supports create, list, get, update, and delete", async () => {
  const created = await request("/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Keyboard",
      description: "Mechanical keyboard",
      price: 79.95,
      quantity: 12
    })
  });
  assert.equal(created.status, 201);
  const product = await created.json();
  assert.equal(product.name, "Keyboard");
  assert.equal(product.price, 79.95);
  assert.equal(product.quantity, 12);
  assert.ok(product.created_at);
  assert.ok(product.updated_at);

  const list = await request("/products");
  assert.equal(list.status, 200);
  assert.deepEqual(await list.json(), [product]);

  const details = await request(`/products/${product.id}`);
  assert.equal(details.status, 200);
  assert.deepEqual(await details.json(), product);

  const updated = await request(`/products/${product.id}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Keyboard Pro", price: 99, quantity: 5 })
  });
  assert.equal(updated.status, 200);
  const updatedProduct = await updated.json();
  assert.equal(updatedProduct.name, "Keyboard Pro");
  assert.equal(updatedProduct.description, "");
  assert.equal(updatedProduct.price, 99);
  assert.equal(updatedProduct.quantity, 5);
  assert.notEqual(updatedProduct.updated_at, product.updated_at);

  const deleted = await request(`/products/${product.id}`, { method: "DELETE" });
  assert.equal(deleted.status, 204);
  assert.equal((await request(`/products/${product.id}`)).status, 404);
});

test("product routes reject invalid input and unknown ids", async () => {
  const invalidBody = await request("/products", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: " ", price: -1, quantity: 1.5 })
  });
  assert.equal(invalidBody.status, 400);

  assert.equal((await request("/products/0")).status, 400);
  assert.equal((await request("/products/999")).status, 404);
  assert.equal((await request("/products/999", { method: "DELETE" })).status, 404);
});

test("product service documents CRUD endpoints and JWT authorization", async () => {
  const docs = await fetch(`${baseUrl}/api-docs/`);
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /Swagger UI/);

  const specResponse = await fetch(`${baseUrl}/api-docs/openapi.json`);
  assert.equal(specResponse.status, 200);
  const spec = await specResponse.json();
  assert.deepEqual(spec.security, [{ bearerAuth: [] }]);
  assert.ok(spec.paths["/products"].get);
  assert.ok(spec.paths["/products"].post);
  assert.ok(spec.paths["/products/{id}"].put);
  assert.ok(spec.paths["/products/{id}"].delete);
});
