import { spawn } from "child_process";
import path from "path";

export interface PythonResult<T = any> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * Run a Python script with JSON input via stdin and receive JSON on stdout.
 */
export const runPythonScript = <TOutput = any>(
  scriptRelativePath: string,
  payload: unknown
): Promise<PythonResult<TOutput>> => {
  return new Promise((resolve) => {
    const scriptPath = path.join(process.cwd(), scriptRelativePath);

    const proc = spawn("python", [scriptPath], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    proc.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    proc.on("error", (err) => {
      resolve({
        ok: false,
        error: `Failed to start Python process: ${err.message}`,
      });
    });

    proc.on("close", (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          error: stderr || `Python script exited with code ${code}`,
        });
        return;
      }

      try {
        const parsed = JSON.parse(stdout);
        resolve({ ok: true, data: parsed });
      } catch (e: any) {
        resolve({
          ok: false,
          error: `Failed to parse Python output as JSON: ${e.message}. Raw: ${stdout}`,
        });
      }
    });

    // Write JSON payload to stdin
    proc.stdin.write(JSON.stringify(payload));
    proc.stdin.end();
  });
};


