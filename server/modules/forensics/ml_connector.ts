import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export interface MLInferenceResult {
  predictedClass: 'PHISHING' | 'BENIGN';
  phishingProbability: number;
  benignProbability: number;
  modelVersion: string;
  explainability: {
    reasons: string[];
    phishingSignals?: string[];
    benignSignals?: string[];
  };
  error?: string;
}

// Safe resolution of directory path working seamlessly across development (tsx) and production (esbuild)
const forensicsDir = path.join(process.cwd(), 'server', 'modules', 'forensics');
const BASE_DIR = fs.existsSync(path.join(forensicsDir, 'ml_model_service.py'))
  ? forensicsDir
  : __dirname;

const SERVICE_SCRIPT = path.join(BASE_DIR, 'ml_model_service.py');
const MODEL_DIR = path.join(BASE_DIR, 'ml_model');
const MODEL_PATH = path.join(MODEL_DIR, 'model.pkl');

/**
 * Checks if the scikit-learn model has been trained and serialized.
 */
export function isMLModelAvailable(): boolean {
  return fs.existsSync(MODEL_PATH);
}

/**
 * Asynchronously triggers the reproducible Python training script
 */
export function trainMLModel(): Promise<string> {
  return new Promise((resolve, reject) => {
    console.log('[TRACE-X ML] Spawning scikit-learn training process in Python...');
    const proc = spawn('python3', [SERVICE_SCRIPT, '--train']);

    let stdout = '';
    let stderr = '';

    proc.on('error', (err) => {
      console.error('[TRACE-X ML] Training process spawn failed:', err.message);
      reject(new Error(`Python training spawn failed: ${err.message}`));
    });

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('[TRACE-X ML] Training completed successfully:', stdout);
        resolve(stdout);
      } else {
        console.error('[TRACE-X ML] Training failed with code:', code, stderr);
        reject(new Error(`Python training failed: ${stderr || stdout}`));
      }
    });
  });
}

/**
 * Runs Python-based TF-IDF + Logistic Regression inference over normalized email text
 */
export function runMLInference(text: string): Promise<MLInferenceResult> {
  return new Promise((resolve) => {
    // Graceful fallback if model is not trained yet or Python is missing
    if (!isMLModelAvailable()) {
      console.warn('[TRACE-X ML] Model artifacts not found. Initiating dynamic background training...');
      trainMLModel()
        .then(() => {
          // Retry inference once trained
          return runMLInferenceDirect(text);
        })
        .then((res) => resolve(res))
        .catch((err) => {
          console.error('[TRACE-X ML] Fallback training or inference failed:', err);
          resolve({
            predictedClass: 'BENIGN',
            phishingProbability: 0.0,
            benignProbability: 1.0,
            modelVersion: '1.2.0-fallback',
            explainability: {
              reasons: ['ML engine offline: Model training failed or python packages missing.']
            },
            error: err.message
          });
        });
    } else {
      runMLInferenceDirect(text)
        .then((res) => resolve(res))
        .catch((err) => {
          resolve({
            predictedClass: 'BENIGN',
            phishingProbability: 0.0,
            benignProbability: 1.0,
            modelVersion: '1.2.0-fallback',
            explainability: {
              reasons: [`Inference failure: ${err.message}`]
            },
            error: err.message
          });
        });
    }
  });
}

function runMLInferenceDirect(text: string): Promise<MLInferenceResult> {
  return new Promise((resolve, reject) => {
    const proc = spawn('python3', [SERVICE_SCRIPT, '--predict']);

    let stdout = '';
    let stderr = '';

    proc.on('error', (err) => {
      console.error('[TRACE-X ML] Prediction process spawn failed:', err.message);
      reject(new Error(`Python prediction spawn failed: ${err.message}`));
    });

    if (proc.stdout) {
      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (proc.stderr) {
      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}. Stderr: ${stderr}`));
      }

      try {
        const result = JSON.parse(stdout) as MLInferenceResult;
        resolve(result);
      } catch (err: any) {
        reject(new Error(`Failed to parse ML response JSON: ${err.message}. Raw output: ${stdout}`));
      }
    });

    if (proc.stdin) {
      proc.stdin.on('error', (err) => {
        console.warn('[TRACE-X ML] Process stdin stream error caught:', err.message);
      });

      try {
        proc.stdin.write(text);
        proc.stdin.end();
      } catch (err: any) {
        console.error('[TRACE-X ML] Exception writing to stdin:', err.message);
      }
    }
  });
}

