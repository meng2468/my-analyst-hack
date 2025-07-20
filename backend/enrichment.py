from sheets import create_and_upload_df, append_rows_to_sheet
import json
import pandas as pd
from openai import OpenAI
import os
from dotenv import load_dotenv
import time
import threading
from broadcast import enrichment_broadcaster
import asyncio
from concurrent.futures import ThreadPoolExecutor

executor = ThreadPoolExecutor(max_workers=1) 

load_dotenv(override=True)

class Generator:
    def __init__(self, model: str = "gpt-4.1-nano"):
        self.client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.model = model

    def structured_enrich(
        self, 
        row_context: str, 
        function_name: str,
        function_description: str,
        parameter_schema: dict,
        prompt: str,
        temperature: float = 0.0
    ):
        functions = [{
            "name": function_name,
            "description": function_description,
            "parameters": parameter_schema
        }]
        messages = [{"role": "user", "content": prompt.format(context=row_context)}]
        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            functions=functions,
            function_call={"name": function_name},
            temperature=temperature,
        )
        return json.loads(response.choices[0].message.function_call.arguments)

def make_schema_and_description(col_name: str, possible_values: list[str]) -> tuple[dict, str]:
    prop = {
        "type": "string",
        "description": f"The {col_name} of the statement."
    }
    if possible_values:
        prop["enum"] = possible_values
        desc = f"Classify the input according to '{col_name}'. Must be one of: {possible_values}."
    else:
        desc = f"Extract the '{col_name}' from the input as a string."
    schema = {
        "type": "object",
        "properties": {col_name: prop},
        "required": [col_name]
    }
    return schema, desc

def row_to_context(row: pd.Series) -> str:
    return "; ".join([f"{col}: {row[col]}" for col in row.index])

def enrich_dataset(
    pd_df: pd.DataFrame,
    prompt: str,
    col_name: str,
    possible_values: list[str] = None,
    sheet_name: str = "Sheet1",
    title: str = "Enriched Dataset",
    session_id: str = None
) -> dict:
    """
    Creates a new Google Sheet, and as each row is enriched, appends it immediately.
    Returns a dict containing:
        - 'dataframe': The enriched DataFrame.
        - 'spreadsheet_id': The Sheet ID.
        - 'spreadsheet_url': The Sheet Web URL.
        - 'mode': 'created'
    """
    schema, description = make_schema_and_description(col_name, possible_values)
    function_name = f"classify_{col_name}"
    generator = Generator()

    # 1. Create an empty dataframe with the extra col (header only)
    upload_df = pd_df.copy()
    if col_name not in upload_df.columns:
        upload_df[col_name] = ""
    header_only = upload_df.iloc[0:0]

    # Create the sheet with only headers
    create_resp = create_and_upload_df(
        header_only,
        title=title,
        sheet_name=sheet_name
    )
    spreadsheet_id = create_resp['spreadsheetId']

    enriched_values = []
    # 2. Enrich and append each row immediately
    for idx, row in pd_df.iterrows():
        context = row_to_context(row)
        llm_result = generator.structured_enrich(
            row_context=context,
            function_name=function_name,
            function_description=description,
            parameter_schema=schema,
            prompt=prompt,
        )
        pd_df.at[idx, col_name] = llm_result[col_name]
        row_with_col = row.copy()
        row_with_col[col_name] = llm_result[col_name]
        ordered_row = [str(row_with_col[col]) for col in upload_df.columns]
        append_rows_to_sheet(
            spreadsheet_id=spreadsheet_id,
            sheet_name=sheet_name,
            rows=[ordered_row]
        )
        sheet_url = create_resp.get('spreadsheetUrl')
        log_msg = f"Enriched row {idx+1}/{len(pd_df)}. View: {sheet_url}"
        asyncio.run(enrichment_broadcaster.push(log_msg, session_id=session_id))

    return {
        "dataframe": pd_df,
        "spreadsheet_id": spreadsheet_id,
        "spreadsheet_url": create_resp.get('spreadsheetUrl'),
        "mode": "created"
    }

def run_enrichment_in_background(*args, **kwargs):
    future = executor.submit(enrich_dataset, *args, **kwargs)
    return future

if __name__ == "__main__":
    import pandas as pd

    # More diverse/longer test dataset
    df = pd.DataFrame([
        {"text": "The sky is blue."},
        {"text": "Roses are red."},
        {"text": "Bananas are yellow."},
        {"text": "Grass is green."},
        {"text": "Coal is black."},
        {"text": "Chalk is white."},
        {"text": "Carrots are orange."},
        {"text": "Plums can be purple."},
        {"text": "My car is gray."},
        {"text": "The sun is yellow."},
        {"text": "Tomatoes are red."},
        {"text": "Oceans look blue."},
        {"text": "Eggplants are purple."},
        {"text": "Snow is white."},
        {"text": "Dirt is brown."},
        {"text": "Firetrucks are red."},
        {"text": "Clouds are gray."},
        {"text": "Spinach is green."},
        {"text": "Pumpkins are orange."},
        {"text": "Cardinals are red."},
    ])

    prompt = "For the following input, identify the color mentioned: {context}"
    enrichment_col = "color"
    possible_colors = ["red", "blue", "yellow", "green", "black", "white", "orange", "purple", "gray", "brown"]

    result = enrich_dataset(
        pd_df=df,
        prompt=prompt,
        col_name=enrichment_col,
        possible_values=possible_colors,
        title="Example Colors Enrichment"
    )

    print("Google Sheet created:", result["spreadsheet_url"])
    print("Enriched DataFrame:")
    print(result["dataframe"])