import os
import sys
import json
import pickle
import argparse
from datetime import datetime

# Path references
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(BASE_DIR, 'ml_model')
DATASET_PATH = os.path.join(MODEL_DIR, 'dataset.json')
MODEL_PATH = os.path.join(MODEL_DIR, 'model.pkl')
VECTORIZER_PATH = os.path.join(MODEL_DIR, 'vectorizer.pkl')
METADATA_PATH = os.path.join(MODEL_DIR, 'metadata.json')

MODEL_VERSION = '1.2.0'

def train_model():
    print("Starting TRACE-X Logistic Regression Classifier training...")
    if not os.path.exists(DATASET_PATH):
        print(f"Error: Dataset not found at {DATASET_PATH}")
        sys.exit(1)

    with open(DATASET_PATH, 'r') as f:
        data = json.load(f)

    samples = data.get('samples', [])
    dataset_version = data.get('version', 'unknown')
    if not samples:
        print("Error: Empty dataset samples.")
        sys.exit(1)

    texts = [s['text'] for s in samples]
    labels = [s['label'] for s in samples]

    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
    except ImportError:
        print("Error: scikit-learn is not installed in the current environment.")
        sys.exit(1)

    # Train TF-IDF vectorizer
    vectorizer = TfidfVectorizer(ngram_range=(1,2), max_features=1000, lowercase=True, stop_words='english')
    X = vectorizer.fit_transform(texts)

    # Train Logistic Regression Binary Classifier
    model = LogisticRegression(C=1.0, max_iter=1000, random_state=42)
    model.fit(X, labels)

    # Evaluate on training/demo data (reporting as training/evaluation metrics)
    predictions = model.predict(X)
    acc = accuracy_score(labels, predictions)
    prec = precision_score(labels, predictions, zero_division=0)
    rec = recall_score(labels, predictions, zero_division=0)
    f1 = f1_score(labels, predictions, zero_division=0)

    # Persist artifacts
    os.makedirs(MODEL_DIR, exist_ok=True)
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(model, f)
    with open(VECTORIZER_PATH, 'wb') as f:
        pickle.dump(vectorizer, f)

    metadata = {
        'model_version': MODEL_VERSION,
        'dataset_version': dataset_version,
        'training_timestamp': datetime.utcnow().isoformat() + 'Z',
        'metrics': {
            'accuracy': float(acc),
            'precision': float(prec),
            'recall': float(rec),
            'f1_score': float(f1)
        }
    }

    with open(METADATA_PATH, 'w') as f:
        json.dump(metadata, f, indent=2)

    print("TRACE-X Model training completed successfully.")
    print(f"Artifacts saved to {MODEL_DIR}")
    print(f"Metrics: Accuracy={acc:.4f}, Precision={prec:.4f}, Recall={rec:.4f}, F1={f1:.4f}")

def predict_email(text):
    if not text or len(text.strip()) == 0:
        # Graceful handling of empty or very short emails
        return {
            'predictedClass': 'BENIGN',
            'phishingProbability': 0.0,
            'benignProbability': 1.0,
            'modelVersion': MODEL_VERSION,
            'explainability': {
                'reasons': ['Empty or extremely short email content defaulted to benign.']
            }
        }

    if not os.path.exists(MODEL_PATH) or not os.path.exists(VECTORIZER_PATH):
        return {
            'error': 'Model artifacts not found. Please train the model first.',
            'status': 'UNINITIALIZED'
        }

    try:
        with open(MODEL_PATH, 'rb') as f:
            model = pickle.load(f)
        with open(VECTORIZER_PATH, 'rb') as f:
            vectorizer = pickle.load(f)
    except Exception as e:
        return {
            'error': f'Failed to load model artifacts: {str(e)}',
            'status': 'CORRUPTED'
        }

    # Vectorize input
    X = vectorizer.transform([text])
    probabilities = model.predict_proba(X)[0] # [p_benign, p_phishing]
    prediction = int(model.predict(X)[0])

    p_benign = float(probabilities[0])
    p_phishing = float(probabilities[1])
    pred_class = 'PHISHING' if prediction == 1 else 'BENIGN'

    # Extract feature contributions for explainability
    explainability_reasons = []
    try:
        coefs = model.coef_[0]
        feature_names = vectorizer.get_feature_names_out()
        
        # Look at the terms that are actually present in the input text
        words_in_text = set(vectorizer.build_analyzer()(text))
        
        word_contributions = []
        for word in words_in_text:
            if word in vectorizer.vocabulary_:
                idx = vectorizer.vocabulary_[word]
                weight = coefs[idx]
                word_contributions.append((word, weight))

        # Sort contributions by weight
        # High weight -> Phishing indicator, Low weight (negative) -> Benign indicator
        word_contributions.sort(key=lambda x: x[1], reverse=True)
        
        phishing_signals = [word for word, w in word_contributions if w > 0.1][:3]
        benign_signals = [word for word, w in word_contributions if w < -0.1][:3]

        if phishing_signals:
            explainability_reasons.append(f"Strong phishing keywords detected: {', '.join(phishing_signals)}")
        if benign_signals:
            explainability_reasons.append(f"Standard business markers detected: {', '.join(benign_signals)}")
        if not phishing_signals and not benign_signals:
            explainability_reasons.append("No highly prominent vocabulary weights triggered.")

    except Exception as e:
        explainability_reasons.append(f"Detailed explainability parsing was skipped: {str(e)}")

    return {
        'predictedClass': pred_class,
        'phishingProbability': p_phishing,
        'benignProbability': p_benign,
        'modelVersion': MODEL_VERSION,
        'explainability': {
            'reasons': explainability_reasons,
            'phishingSignals': phishing_signals if 'phishing_signals' in locals() else [],
            'benignSignals': benign_signals if 'benign_signals' in locals() else []
        }
    }

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="TRACE-X Logistic Regression Text Classifier")
    parser.add_argument('--train', action='store_true', help="Train and save the model artifacts")
    parser.add_argument('--predict', action='store_true', help="Execute model prediction using stdin text")

    args = parser.parse_args()

    if args.train:
        train_model()
    elif args.predict:
        # Read full text from stdin
        text_content = sys.stdin.read()
        result = predict_email(text_content)
        print(json.dumps(result, indent=2))
    else:
        parser.print_help()
