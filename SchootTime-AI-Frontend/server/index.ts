import express from "express";
import cors from "cors";
import timetablesRouter from "./routes/timetables";

const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || "http://localhost:5173",
    credentials: false,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use(timetablesRouter);

const PORT = Number(process.env.PORT || process.env.API_PORT || 8000);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Timetable API server listening on port ${PORT}`);
});


