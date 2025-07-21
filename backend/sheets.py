# aci.dev for google sheets integration with fallback gracefull error handling
import os
import pandas as pd

# Try loading dotenv, handle gracefully if not installed
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    print("Warning: python-dotenv not installed, skipping environment variable loading.")

# Try importing ACI, and handle gracefully if not installed
ACI_AVAILABLE = False
client = None
try:
    from aci import ACI
    from aci.types.apps import AppBasic, AppDetails
    from aci.types.functions import FunctionExecutionResult
    from aci.types.enums import FunctionDefinitionFormat
    ACI_API_KEY = os.getenv("ACI_API_KEY")
    if ACI_API_KEY:
        client = ACI(api_key=ACI_API_KEY)
        ACI_AVAILABLE = True
    else:
        print("Warning: ACI_API_KEY not set. Running in mock mode.")
except ImportError as e:
    print(f"ACI not installed or failed to import: {e}. Running in mock mode.")
except Exception as e:
    print(f"Error initializing ACI: {e}. Running in mock mode.")

def num_to_a1_column(n):
    """Convert zero-based column index to A1 column (A, B... AA, AB...)"""
    s = ''
    n += 1  # 1-based for A1 notation
    while n:
        n, r = divmod(n-1, 26)
        s = chr(65 + r) + s
    return s

def create_and_upload_df(df, title="New Sheet", sheet_name="Sheet1", linked_account_owner_id="start"):
    print(f"[create_and_upload_df] DataFrame to upload:\n{df}", flush=True)
    # Step 1: Create spreadsheet body
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

    # Step 2: Prepare values as list of lists (header + rows)
    values = [list(map(str, df.columns))]
    for _, row in df.iterrows():
        values.append([("" if pd.isna(x) else str(x)) for x in row])

    # Step 3: Build A1 notation range
    last_col = num_to_a1_column(len(df.columns) - 1)
    last_row = len(df) + 1
    range_a1 = f"{sheet_name}!A1:{last_col}{last_row}"

    if ACI_AVAILABLE:
        # Actually execute if ACI is working
        try:
            create_result = client.functions.execute(
                function_name="GOOGLE_SHEETS__SPREADSHEET_CREATE",
                function_arguments={"body": spreadsheet_body},
                linked_account_owner_id=linked_account_owner_id
            )
            spreadsheet_id = create_result.data["spreadsheetId"]
            spreadsheet_url = create_result.data.get("spreadsheetUrl", None)

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
                "updateResult": update_result,
                "mock": False
            }
        except Exception as e:
            print(f"ACI error: {e}. Falling back to mock mode.", flush=True)
    # Fallback if no ACI
    print("[MOCK] Would create spreadsheet with JSON body:", spreadsheet_body)
    print("[MOCK] Would upload values to range:", range_a1)
    print("[MOCK] Values:\n", values)
    return {
        "spreadsheetId": "mocked_spreadsheet_id",
        "spreadsheetUrl": f"https://docs.google.com/spreadsheets/d/mock_{title.replace(' ', '_')}",
        "updateResult": {
            "status": "WOULD_UPDATE",
            "range": range_a1,
            "values": values
        },
        "mock": True
    }

def append_rows_to_sheet(spreadsheet_id, sheet_name, rows, linked_account_owner_id="start"):
    """
    Append rows to a Google Sheet.

    Args:
        spreadsheet_id (str): The ID of the spreadsheet.
        sheet_name (str): The name of the sheet/tab to append to.
        rows (list of lists): Data rows to append.
        linked_account_owner_id (str): Owner ID for ACI.

    Returns:
        dict: The result of the append operation.
    """
    range_a1 = f"{sheet_name}!A1"
    if ACI_AVAILABLE:
        try:
            append_result = client.functions.execute(
                function_name="GOOGLE_SHEETS__VALUES_APPEND",
                function_arguments={
                    "path": {
                        "spreadsheetId": spreadsheet_id,
                        "range": range_a1
                    },
                    "query": {
                        "valueInputOption": "RAW",
                        "insertDataOption": "INSERT_ROWS"
                    },
                    "body": {
                        "range": range_a1,
                        "majorDimension": "ROWS",
                        "values": rows
                    }
                },
                linked_account_owner_id=linked_account_owner_id
            )
            return append_result
        except Exception as e:
            print(f"ACI error: {e}. Falling back to mock mode.", flush=True)

    print(f"[MOCK] Would append rows to sheet '{sheet_name}' (spreadsheetId: {spreadsheet_id}) in range {range_a1}")
    print("[MOCK] Rows:\n", rows)
    return {
        "appendResult": {
            "status": "WOULD_APPEND",
            "spreadsheetId": spreadsheet_id,
            "sheetName": sheet_name,
            "range": range_a1,
            "values": rows
        },
        "mock": True
    }