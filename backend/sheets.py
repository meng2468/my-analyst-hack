from aci import ACI
import os
from aci.types.apps import AppBasic, AppDetails
from aci.types.functions import FunctionExecutionResult
from aci.types.enums import FunctionDefinitionFormat

from dotenv import load_dotenv
load_dotenv(override=True)

client = ACI(api_key=os.getenv("ACI_API_KEY"))

import pandas as pd

def num_to_a1_column(n):
    """Convert zero-based column index to A1 column (A, B... AA, AB...)"""
    s = ''
    n += 1  # 1-based for A1 notation
    while n:
        n, r = divmod(n-1, 26)
        s = chr(65 + r) + s
    return s

def create_and_upload_df(df, title="New Sheet", sheet_name="Sheet1", linked_account_owner_id="start"):
    print("create_and_upload_df", df, flush=True)
    # Step 1: Create the spreadsheet
    spreadsheet_body = {
        "properties": {
            "title": title,
            "locale": "en_US"
        },
        "sheets": [{
            "properties": {
                "title": sheet_name,
                "gridProperties": {
                    "rowCount": len(df) + 1,
                    "columnCount": max(len(df.columns), 1)
                }
            }
        }]
    }
    create_result = client.functions.execute(
        function_name="GOOGLE_SHEETS__SPREADSHEET_CREATE",
        function_arguments={"body": spreadsheet_body},
        linked_account_owner_id=linked_account_owner_id
    )
    spreadsheet_id = create_result.data["spreadsheetId"]
    spreadsheet_url = create_result.data.get("spreadsheetUrl", None)

    # Step 2: Prepare values as list of lists (header + rows)
    values = [list(map(str, df.columns))]
    for _, row in df.iterrows():
        values.append([("" if pd.isna(x) else str(x)) for x in row])

    # Step 3: Build proper A1 range
    last_col = num_to_a1_column(len(df.columns) - 1)
    last_row = len(df) + 1
    range_a1 = f"{sheet_name}!A1:{last_col}{last_row}"

    # Step 4: Update values
    update_result = client.functions.execute(
        function_name="GOOGLE_SHEETS__VALUES_UPDATE",
        function_arguments={
            "path": {
                "spreadsheetId": spreadsheet_id,
                "range": range_a1
            },
            "query": {
                "valueInputOption": "RAW"
            },
            "body": {
                "range": range_a1,
                "majorDimension": "ROWS",
                "values": values
            }
        },
        linked_account_owner_id=linked_account_owner_id
    )

    return {
        "spreadsheetId": spreadsheet_id,
        "spreadsheetUrl": spreadsheet_url,
        "updateResult": update_result
    }
