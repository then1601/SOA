require("dotenv").config();

const { createProductsApp } = require("./products-app");
const app = createProductsApp();
const port = Number(process.env.PRODUCTS_PORT || 3001);

app.listen(port, () => {
  console.log(`Product API listening on http://localhost:${port}`);
});
