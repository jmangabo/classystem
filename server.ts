import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { requireAuth, AuthRequest } from "./src/middleware/auth.ts";
import { getOrCreateUser } from "./src/db/users.ts";
import { db } from "./src/db/index.ts";
import { students, subjects, sections, schools, attendance, users } from "./src/db/schema.ts";
import { eq, and } from "drizzle-orm";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json());

  // 1. API ROUTES FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", message: "Class Record Management Enterprise Server" });
  });

  // Sync current user info to database
  app.post("/api/sync-user", requireAuth, async (req: AuthRequest, res) => {
    try {
      const firebaseUser = req.user;
      if (!firebaseUser) {
        return res.status(401).json({ error: "Missing authentication info" });
      }
      const userRecord = await getOrCreateUser(firebaseUser.uid, firebaseUser.email || "");
      res.json({ status: "success", user: userRecord });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get current user profile
  app.get("/api/user-profile", requireAuth, async (req: AuthRequest, res) => {
    try {
      const firebaseUser = req.user;
      if (!firebaseUser) {
        return res.status(401).json({ error: "Missing authentication info" });
      }
      const dbUsers = await db.select().from(users).where(eq(users.uid, firebaseUser.uid));
      if (dbUsers.length === 0) {
        const userRecord = await getOrCreateUser(firebaseUser.uid, firebaseUser.email || "");
        return res.json(userRecord);
      }
      res.json(dbUsers[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get schools
  app.get("/api/schools", requireAuth, async (req, res) => {
    try {
      const allSchools = await db.select().from(schools);
      res.json(allSchools);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create school (system_admin)
  app.post("/api/schools", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { schoolId, name, address } = req.body;
      const newSchool = await db.insert(schools)
        .values({ schoolId, name, address })
        .returning();
      res.json(newSchool[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get sections
  app.get("/api/sections", requireAuth, async (req, res) => {
    try {
      const allSections = await db.select().from(sections);
      res.json(allSections);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Create section
  app.post("/api/sections", requireAuth, async (req, res) => {
    try {
      const { sectionId, gradeLevel, name, schoolId, adviserEmail } = req.body;
      const newSection = await db.insert(sections)
        .values({ sectionId, gradeLevel, name, schoolId, adviserEmail })
        .returning();
      res.json(newSection[0]);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get students of a section
  app.get("/api/sections/:sectionId/students", requireAuth, async (req, res) => {
    try {
      const secId = String(req.params.sectionId);
      const secStudents = await db.select().from(students).where(eq(students.sectionId, secId));
      res.json(secStudents);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get subjects of a section
  app.get("/api/sections/:sectionId/subjects", requireAuth, async (req, res) => {
    try {
      const secId = String(req.params.sectionId);
      const secSubjects = await db.select().from(subjects).where(eq(subjects.sectionId, secId));
      res.json(secSubjects);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 2. VITE MIDDLEWARE SETUP FOR DEV VS PRODUCTION
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
