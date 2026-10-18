const express = require("express");
const swaggerUi = require("swagger-ui-express");
const createAuthMiddleware = require("./auth-middleware");
const supabase = require("./supabase");
const { createProductsStore } = require("./products-store");
const { createProductsController } = require("./products-controller");
const { productsSpec } = require("./swagger");

function createProductsApp(authClient = supabase, store = createProductsStore) {
  const app = express();
  const authenticateToken = createAuthMiddleware(authClient);
  const products = createProductsController(store);

  app.use(express.json());
  app.get("/api-docs/openapi.json", (req, res) => res.json(productsSpec));
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(productsSpec));
  app.use("/products", authenticateToken);
  app.get("/products", products.list);
  app.post("/products", products.create);
  app.get("/products/:id", products.get);
  app.put("/products/:id", products.update);
  app.delete("/products/:id", products.delete);

  app.use((error, req, res, next) => {
    console.error(error);
    const status = error.status === 400 ? 400 : 500;
    res.status(status).json({
      error: status === 400 ? "Invalid JSON request body" : "Product service unavailable"
    });
  });

  return app;
}

module.exports = { createProductsApp };
