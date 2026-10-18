const MAX_PRICE = 99999999.99;

function validateProduct(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return "Request body must be a JSON object";
  }

  if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 255) {
    return "name must be a non-empty string of at most 255 characters";
  }

  if (body.description !== undefined && typeof body.description !== "string") {
    return "description must be a string";
  }

  if (typeof body.price !== "number" || !Number.isFinite(body.price) ||
      body.price < 0 || body.price > MAX_PRICE ||
      Math.abs(body.price * 100 - Math.round(body.price * 100)) > 1e-8) {
    return "price must be a number from 0 to 99999999.99 with at most 2 decimal places";
  }

  if (!Number.isInteger(body.quantity) || body.quantity < 0) {
    return "quantity must be a non-negative integer";
  }

  return {
    name: body.name.trim(),
    description: body.description ?? "",
    price: body.price,
    quantity: body.quantity
  };
}

function parseProductId(value) {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}

function createProductsController(store) {
  return {
    async list(req, res, next) {
      try {
        return res.json(await store(req.accessToken).list());
      } catch (error) {
        return next(error);
      }
    },

    async get(req, res, next) {
      const id = parseProductId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Product id must be a positive integer" });
      }
      try {
        const product = await store(req.accessToken).findById(id);
        return product
          ? res.json(product)
          : res.status(404).json({ error: "Product not found" });
      } catch (error) {
        return next(error);
      }
    },

    async create(req, res, next) {
      const product = validateProduct(req.body);
      if (typeof product === "string") {
        return res.status(400).json({ error: product });
      }
      try {
        return res.status(201).json(await store(req.accessToken).create(product));
      } catch (error) {
        return next(error);
      }
    },

    async update(req, res, next) {
      const id = parseProductId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Product id must be a positive integer" });
      }
      const product = validateProduct(req.body);
      if (typeof product === "string") {
        return res.status(400).json({ error: product });
      }
      try {
        const updated = await store(req.accessToken).update(id, product);
        return updated
          ? res.json(updated)
          : res.status(404).json({ error: "Product not found" });
      } catch (error) {
        return next(error);
      }
    },

    async delete(req, res, next) {
      const id = parseProductId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Product id must be a positive integer" });
      }
      try {
        return await store(req.accessToken).delete(id)
          ? res.status(204).end()
          : res.status(404).json({ error: "Product not found" });
      } catch (error) {
        return next(error);
      }
    }
  };
}

module.exports = { createProductsController };
