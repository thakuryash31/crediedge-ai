# backend/api/upload.py
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
import shutil
import os
import uuid
from datetime import datetime

from parser.extractor import process_uploaded_statement
from parser.llm_engine import categorize_transactions_with_ai
from core.database import supabase # <-- NEW: Import Supabase client

router = APIRouter()
UPLOAD_DIR = "temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
PROCESSING_TASKS = {}

def process_file_in_background(task_id: str, file_location: str):
    try:
        # 1. Extract & AI Inference
        extracted_content = process_uploaded_statement(file_location)
        structured_transactions = categorize_transactions_with_ai(extracted_content)
        
        # 2. Database Insertion (Relational Mapping)
        if structured_transactions:
            # A. Create a dummy borrower for this test
            borrower_res = supabase.table("borrowers").insert({
                "business_name": f"Test MSME {task_id[:4]}",
                "tax_identifier": f"TAX-{task_id[:8]}",
                "contact_email": "test@crediedge.ai",
                "borrower_type": "msme"
            }).execute()
            borrower_id = borrower_res.data[0]['id']

            # B. Create the Loan Application
            app_res = supabase.table("applications").insert({
                "borrower_id": borrower_id,
                "requested_amount": 50000.00,
                "status": "processing"
            }).execute()
            app_id = app_res.data[0]['id']

            # C. Create the Cash Flow wrapper
            cf_res = supabase.table("cash_flows").insert({
                "application_id": app_id,
                "statement_start_date": "2023-01-01", # You can parse these from AI later
                "statement_end_date": "2023-06-30",
                "average_monthly_balance": 15000.00
            }).execute()
            cf_id = cf_res.data[0]['id']

            # D. Bulk insert the AI-categorized transactions!
            for tx in structured_transactions:
                tx['cash_flow_id'] = cf_id # Attach the foreign key
                
            supabase.table("transactions").insert(structured_transactions).execute()

        # 3. Mark task complete
        PROCESSING_TASKS[task_id] = {
            "status": "completed",
            "transactions_saved": len(structured_transactions),
            "data": structured_transactions
        }
        
    except Exception as e:
        PROCESSING_TASKS[task_id] = {"status": "failed", "error": str(e)}
        print(f"Background task failed: {str(e)}")
    finally:
        if os.path.exists(file_location):
            os.remove(file_location)

@router.post("/upload-statement/")
async def upload_statement(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    allowed_extensions = [".pdf", ".csv"]
    file_ext = os.path.splitext(file.filename)[1].lower()
    
    if file_ext not in allowed_extensions:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    task_id = str(uuid.uuid4())
    file_location = os.path.join(UPLOAD_DIR, f"{task_id}_{file.filename}")
    
    try:
        with open(file_location, "wb+") as file_object:
            shutil.copyfileobj(file.file, file_object)
            
        PROCESSING_TASKS[task_id] = {"status": "processing", "filename": file.filename}
        background_tasks.add_task(process_file_in_background, task_id, file_location)
        
        return {"message": "File accepted.", "task_id": task_id, "status": "processing"}
        
    except Exception as e:
        if os.path.exists(file_location):
            os.remove(file_location)
        raise HTTPException(status_code=500, detail=f"Failed to initialize: {str(e)}")

@router.get("/status/{task_id}")
async def get_processing_status(task_id: str):
    task = PROCESSING_TASKS.get(task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task ID not found.")
    return task