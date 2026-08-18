import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import compression from "compression";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(compression());

  // API routes FIRST
  app.get("/api/products", async (req, res) => {
    try {
      const response = await fetch('https://mohasagor.com.bd/api/reseller/product', {
        headers: {
          'API-KEY': 'A8niclztH9JtzS4t',
          'SECRET-KEY': '2ff380917a11d3a7c97bcf6dddfb8adf38194c7d6b726ab12c4d0d5fb136fef8'
        }
      });
      
      if (!response.ok) {
        throw new Error(`API responded with status: ${response.status}`);
      }
      
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Error fetching products:", error);
      res.status(500).json({ error: "Failed to fetch products" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      index: false
    }));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
