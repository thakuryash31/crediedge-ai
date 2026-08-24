# backend/parser/extractor.py
import pdfplumber
import pandas as pd
import os

def extract_from_pdf(file_path: str) -> str:
    """
    Extracts text and table data from a PDF bank statement.
    Maintains row/column integrity better than standard OCR.
    """
    extracted_text = []
    
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                # Extract raw text
                text = page.extract_text()
                if text:
                    extracted_text.append(text)
                
                # Extract tables specifically
                tables = page.extract_tables()
                for table in tables:
                    for row in table:
                        # Clean out None values and join with a pipe for LLM readability
                        clean_row = [str(cell).strip() if cell is not None else "" for cell in row]
                        extracted_text.append(" | ".join(clean_row))
                        
        return "\n".join(extracted_text)
    except Exception as e:
        raise ValueError(f"Failed to parse PDF: {str(e)}")

def extract_from_csv(file_path: str) -> str:
    """
    Extracts transaction data from a UPI/Bank CSV export.
    """
    try:
        # Read CSV, treating all columns as strings to prevent automatic date/float mangling
        df = pd.read_csv(file_path, dtype=str).fillna("")
        
        # Convert DataFrame to a pipe-separated string for the LLM
        return df.to_csv(sep="|", index=False)
    except Exception as e:
        raise ValueError(f"Failed to parse CSV: {str(e)}")

def process_uploaded_statement(file_path: str) -> str:
    """
    Router function to handle the extraction based on file type.
    """
    _, file_extension = os.path.splitext(file_path)
    
    if file_extension.lower() == '.pdf':
        return extract_from_pdf(file_path)
    elif file_extension.lower() == '.csv':
        return extract_from_csv(file_path)
    else:
        raise ValueError("Unsupported file format for extraction.")