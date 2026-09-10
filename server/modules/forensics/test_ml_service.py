import unittest
import os
import sys
import json
import subprocess

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_SCRIPT = os.path.join(BASE_DIR, 'ml_model_service.py')

class TestMLModelService(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        # Always run training once before testing to ensure fresh artifacts exist
        print("Pre-training model for unit tests...")
        subprocess.run([sys.executable, SERVICE_SCRIPT, '--train'], check=True)

    def test_training_artifacts(self):
        model_dir = os.path.join(BASE_DIR, 'ml_model')
        self.assertTrue(os.path.exists(os.path.join(model_dir, 'model.pkl')), "model.pkl should exist")
        self.assertTrue(os.path.exists(os.path.join(model_dir, 'vectorizer.pkl')), "vectorizer.pkl should exist")
        self.assertTrue(os.path.exists(os.path.join(model_dir, 'metadata.json')), "metadata.json should exist")

        with open(os.path.join(model_dir, 'metadata.json'), 'r') as f:
            meta = json.load(f)
            self.assertEqual(meta['model_version'], '1.2.0')
            self.assertIn('accuracy', meta['metrics'])

    def test_predict_phishing(self):
        sample_phishing = "URGENT: Your bank account has been suspended due to suspicious activity. Click here to verify your identity."
        
        proc = subprocess.Popen(
            [sys.executable, SERVICE_SCRIPT, '--predict'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = proc.communicate(input=sample_phishing)
        self.assertEqual(proc.returncode, 0)
        
        result = json.loads(stdout)
        self.assertIn('predictedClass', result)
        self.assertEqual(result['predictedClass'], 'PHISHING')
        self.assertGreater(result['phishingProbability'], 0.5)

    def test_predict_benign(self):
        sample_benign = "Hi Jane, let's schedule a sync tomorrow at 10 AM to review design layouts and slides."
        
        proc = subprocess.Popen(
            [sys.executable, SERVICE_SCRIPT, '--predict'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = proc.communicate(input=sample_benign)
        self.assertEqual(proc.returncode, 0)
        
        result = json.loads(stdout)
        self.assertIn('predictedClass', result)
        self.assertEqual(result['predictedClass'], 'BENIGN')
        self.assertGreater(result['benignProbability'], 0.5)

    def test_predict_empty(self):
        proc = subprocess.Popen(
            [sys.executable, SERVICE_SCRIPT, '--predict'],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = proc.communicate(input="")
        self.assertEqual(proc.returncode, 0)
        
        result = json.loads(stdout)
        self.assertEqual(result['predictedClass'], 'BENIGN')
        self.assertEqual(result['phishingProbability'], 0.0)

if __name__ == '__main__':
    unittest.main()
