# backend/parser/llm_engine.py
from llama_cpp import Llama
import json
import os
import re

# Resolve absolute path to the downloaded model
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, "models", "Meta-Llama-3-8B-Instruct.Q4_K_M.gguf")

# Singleton instance to keep the 4.7GB model loaded in memory across API calls
_llm_instance = None

def get_llm():
    global _llm_instance
    if _llm_instance is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(f"Local AI model missing at {MODEL_PATH}")
        
        print("Loading Llama-3 into memory (CPU Mode)... This may take a moment.")
        _llm_instance = Llama(
            model_path=MODEL_PATH,
            n_ctx=2048,   # Context window size
            n_threads=4,  # Optimized for GitHub Codespaces CPU
            verbose=False # Turn off C++ debug spam
        )
    return _llm_instance

def categorize_transactions_with_ai(extracted_text: str) -> list[dict]:
    """
    Feeds raw text to Llama-3 and forces a structured JSON array output
    matching the Supabase tx_category enums.
    """
    llm = get_llm()
    
    # System prompt enforcing strict RBAC/Schema compliance
    prompt = f"""<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are a highly secure financial underwriting AI. 
Extract transactions from the raw text provided.
Classify each transaction 'category' strictly into ONE of these exact strings:
['recurring_revenue', 'non_recurring_revenue', 'salary_payout', 'loan_emi', 'utility_overhead', 'tax_payment', 'high_risk_outflow', 'discretionary', 'unknown']
Classify 'type' as either 'credit' or 'debit'.
Determine 'is_recurring' as true or false.

OUTPUT FORMAT: Return ONLY a valid JSON array of objects. No markdown, no explanations.
Example: [{{"date": "YYYY-MM-DD", "description": "AWS Cloud", "amount": 150.00, "type": "debit", "category": "utility_overhead", "is_recurring": true}}]<|eot_id|><|start_header_id|>user<|end_header_id|>
RAW TEXT:
{extracted_text[:1500]} # Limiting chunk size for CPU processing speed
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
"""

    print("Running AI Inference... (This will take a few seconds on CPU)")
    response = llm(
        prompt,
        max_tokens=500,
        stop=["<|eot_id|>"],
        temperature=0.1 # Low temperature for analytical consistency
    )
    
    raw_output = response['choices'][0]['text'].strip()
    
    # Clean output to ensure pure JSON
    try:
        # Strip markdown code blocks if the AI accidentally adds them
        json_str = re.sub(r'```json\n|\n```', '', raw_output).strip()
        parsed_json = json.loads(json_str)
        return parsed_json
    except json.JSONDecodeError:
        print(f"Failed to parse AI output: {raw_output}")
        return [] # Fallback to empty if formatting fails