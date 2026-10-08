import os
import tempfile
import shutil
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from autoprokka_ml_lib import run_autoprokka_ml

app = FastAPI(title="Genomic AMR Predictor API")

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ANTIBIOTICS = [
    {"code": "AMP", "name": "Ampicilline"},
    {"code": "AMX", "name": "Amoxicilline"},
    {"code": "AMC", "name": "Amoxicilline-Clavulanate"},
    {"code": "CTZ", "name": "Ceftazidime"},
    {"code": "CTX", "name": "Céfotaxime"},
    {"code": "CXM", "name": "Céfuroxime"},
    {"code": "CET", "name": "Céfalotine"},
    {"code": "GEN", "name": "Gentamicine"},
    {"code": "TBM", "name": "Tobramycine"},
    {"code": "TMP", "name": "Triméthoprime"},
    {"code": "CIP", "name": "Ciprofloxacine"},
    {"code": "TZP", "name": "Pipéracilline-Tazobactam"}
]

MODELS = {}

@app.on_event("startup")
def load_models():
    """Preload all 12 Random Forest models at app start."""
    for ab in ANTIBIOTICS:
        code = ab["code"]
        m_path = f"models/rf_model_{code}.pkl"
        f_path = f"models/features_{code}.pkl"
        if os.path.exists(m_path) and os.path.exists(f_path):
            MODELS[code] = {
                "model": joblib.load(m_path),
                "features": joblib.load(f_path)
            }

def run_predictions(df: pd.DataFrame):
    results = []
    
    # Detect sample column
    sample_col = "sample" if "sample" in df.columns else df.columns[0]
    gene_cols = [c for c in df.columns if c != sample_col]

    for _, row in df.iterrows():
        sample_name = str(row[sample_col])
        gene_data = row[gene_cols].to_dict()

        for ab in ANTIBIOTICS:
            code = ab["code"]
            if code not in MODELS:
                results.append({
                    "sample": sample_name,
                    "code": code,
                    "name": ab["name"],
                    "probability": 0.0,
                    "verdict": "⚠️ Modèle non disponible"
                })
                continue

            model = MODELS[code]["model"]
            features = MODELS[code]["features"]

            X_dict = {f: float(gene_data.get(f, 0)) for f in features}
            X_pred = pd.DataFrame([X_dict])

            pred = model.predict(X_pred)[0]
            if hasattr(model, "predict_proba"):
                proba = model.predict_proba(X_pred)[0]
                prob_resistant = float(proba[1] * 100) if len(proba) > 1 else float(proba[0] * 100)
            else:
                prob_resistant = 100.0 if pred == 1 else 0.0

            verdict = "🔴 Résistant" if pred == 1 else "🟢 Sensible"

            results.append({
                "sample": sample_name,
                "code": code,
                "name": ab["name"],
                "probability": round(prob_resistant, 1),
                "verdict": verdict
            })

    return results

@app.post("/api/predict-matrix")
async def predict_matrix(file: UploadFile = File(...)):
    """Handles CSV file uploads and returns AMR predictions."""
    try:
        df = pd.read_csv(file.file)
        if len(df.columns) < 10:
            raise HTTPException(status_code=400, detail="Fichier CSV invalide: >10 colonnes requises.")
        
        predictions = run_predictions(df)
        return {"status": "success", "data": predictions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/process-fasta")
async def process_fasta(file: UploadFile = File(...)):
    """Runs Prokka, builds gene matrix, and returns AMR predictions."""
    try:
        with tempfile.TemporaryDirectory() as tmpdir:
            fasta_path = os.path.join(tmpdir, file.filename)
            with open(fasta_path, "wb") as f:
                shutil.copyfileobj(file.file, f)

            ml_vector_csv = run_autoprokka_ml(
                fasta_path=fasta_path,
                output_dir=tmpdir,
                ml_genes_csv="ml_feature_genes.csv"
            )

            df = pd.read_csv(ml_vector_csv, index_col=0)
            predictions = run_predictions(df.reset_index())

            return {
                "status": "success",
                "sample_name": df.index[0],
                "matrix_data": df.to_csv(index=True),
                "data": predictions
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)


    

#poser page
    import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from flask import Flask, render_template, request, redirect, flash

app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'your_secret_key_here'

# Developer / Receiver Email Configuration
DEVELOPER_EMAIL = "your_email@gmail.com"
SENDER_EMAIL = "your_email@gmail.com"  # The email account sending the message
SENDER_PASSWORD = "your_app_password"   # 16-character Gmail App Password

@app.route('/api/send-question', methods=['POST'])
def send_question():
    name = request.form.get('name')
    user_email = request.form.get('email')
    subject = request.form.get('subject')
    user_message = request.form.get('message')

    # Build the email content
    msg = MIMEMultipart()
    msg['From'] = SENDER_EMAIL
    msg['To'] = DEVELOPER_EMAIL
    msg['Subject'] = f"[AMR Predictor Contact] {subject}"

    body = f"""
    New question submitted from Genomic AMR Predictor:

    Name: {name}
    User Email: {user_email}
    Subject: {subject}

    Message:
    {user_message}
    """
    msg.attach(MIMEText(body, 'plain'))

    try:
        # Connect to Gmail SMTP server
        server = smtplib.SMTP('smtp.gmail.com', 587)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.sendmail(SENDER_EMAIL, DEVELOPER_EMAIL, msg.as_string())
        server.quit()

        return "<h1>Merci ! Votre message a été envoyé avec succès.</h1><a href='/poser.html'>Retour</a>"

    except Exception as e:
        print(f"Error sending email: {e}")
        return f"<h1>Erreur lors de l'envoi du message: {e}</h1><a href='/poser.html'>Réessayer</a>", 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)