const securitySchemes = {
  bearerAuth: {
    type: "http",
    scheme: "bearer",
    bearerFormat: "JWT",
    description: "Paste the access token returned by POST /login (without the Bearer prefix)."
  }
};

const errorResponse = {
  description: "Error response",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { error: { type: "string" } },
        required: ["error"]
      }
    }
  }
};

const productSchema = {
  type: "object",
  properties: {
    id: { type: "integer", example: 1 },
    name: { type: "string", maxLength: 255, example: "Keyboard" },
    description: { type: "string", example: "Mechanical keyboard" },
    price: { type: "number", format: "double", minimum: 0, example: 79.95 },
    quantity: { type: "integer", minimum: 0, example: 12 },
    created_at: { type: "string", format: "date-time" },
    updated_at: { type: "string", format: "date-time" }
  },
  required: ["id", "name", "description", "price", "quantity", "created_at", "updated_at"]
};

const productInputSchema = {
  type: "object",
  properties: {
    name: { type: "string", minLength: 1, maxLength: 255, example: "Keyboard" },
    description: { type: "string", example: "Mechanical keyboard" },
    price: { type: "number", minimum: 0, maximum: 99999999.99, example: 79.95 },
    quantity: { type: "integer", minimum: 0, example: 12 }
  },
  required: ["name", "price", "quantity"]
};

const authSpec = {
  openapi: "3.0.3",
  info: {
    title: "SOA Authentication API",
    version: "1.0.0",
    description: "Đăng nhập bằng Supabase Auth và kiểm tra access token."
  },
  servers: [{ url: "http://localhost:3000" }],
  components: {
    securitySchemes,
    schemas: {
      TokenResponse: {
        type: "object",
        properties: {
          token: {
            type: "string",
            description: "Supabase JWT access token; cấu trúc JWT gồm header.payload.signature."
          },
          tokenType: { type: "string", example: "bearer" },
          expiresIn: { type: "integer", example: 3600 }
        },
        required: ["token", "tokenType", "expiresIn"]
      },
      Error: errorResponse.content["application/json"].schema
    }
  },
  paths: {
    "/login": {
      post: {
        summary: "Đăng nhập và nhận JWT access token",
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  email: { type: "string", format: "email", example: "student@example.com" },
                  password: { type: "string", format: "password" }
                },
                required: ["email", "password"]
              }
            }
          }
        },
        responses: {
          200: {
            description: "Login successful",
            content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } }
          },
          400: errorResponse,
          401: errorResponse,
          502: errorResponse
        }
      }
    },
    "/auth": {
      get: {
        summary: "Kiểm tra access token",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Token hợp lệ" },
          401: errorResponse
        }
      }
    },
    "/hello": {
      get: {
        summary: "Route cần xác thực mẫu",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Token hợp lệ" },
          401: errorResponse
        }
      }
    }
  }
};

const productsSpec = {
  openapi: "3.0.3",
  info: {
    title: "SOA Product Management API",
    version: "1.0.0",
    description: "CRUD sản phẩm. Các thao tác cần Supabase JWT access token."
  },
  servers: [{ url: "http://localhost:3001" }],
  components: {
    securitySchemes,
    schemas: {
      Product: productSchema,
      ProductInput: productInputSchema,
      Error: errorResponse.content["application/json"].schema
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/products": {
      get: {
        summary: "Lấy danh sách sản phẩm",
        responses: {
          200: {
            description: "Danh sách sản phẩm",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Product" } }
              }
            }
          },
          401: errorResponse
        }
      },
      post: {
        summary: "Tạo sản phẩm",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProductInput" }
            }
          }
        },
        responses: {
          201: {
            description: "Sản phẩm đã tạo",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } }
          },
          400: errorResponse,
          401: errorResponse
        }
      }
    },
    "/products/{id}": {
      parameters: [{
        name: "id",
        in: "path",
        required: true,
        schema: { type: "integer", minimum: 1 }
      }],
      get: {
        summary: "Lấy chi tiết sản phẩm",
        responses: {
          200: {
            description: "Sản phẩm",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } }
          },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse
        }
      },
      put: {
        summary: "Cập nhật toàn bộ sản phẩm",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: "#/components/schemas/ProductInput" }
            }
          }
        },
        responses: {
          200: {
            description: "Sản phẩm đã cập nhật",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Product" } } }
          },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse
        }
      },
      delete: {
        summary: "Xóa sản phẩm",
        responses: {
          204: { description: "Sản phẩm đã xóa" },
          400: errorResponse,
          401: errorResponse,
          404: errorResponse
        }
      }
    }
  }
};

module.exports = { authSpec, productsSpec };
