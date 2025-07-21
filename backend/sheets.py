# aci.dev for google sheets integration with fallback gracefull error handling
import os

# Try to load dotenv for environment variables (optional)
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    pass

# Pandas is always required (for CSV saving)
import pandas as pd

# Try to use ACI if available and api key present, else fallback to disk
ACI_AVAILABLE = False
client = None
try:
    from aci import ACI
    # noinspection PyUnresolvedReferences
    from aci.types.apps import AppBasic, AppDetails
    from aci.types.functions import FunctionExecutionResult
    from aci.types.enums import FunctionDefinitionFormat
    ACI_API_KEY = os.getenv("ACI_API_KEY")
    if ACI_API_KEY:
        client = ACI(api_key=ACI_API_KEY)
        ACI_AVAILABLE = True
except Exception as e:
    print(f"ACI not available or failed: {e}")

def num_to_a1_column(n):
    """Convert zero-based column index to A1 column (A, B... AA, AB...)"""
    s = ''
    n += 1  # 1-based
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s

def create_and_upload_df(df, title="New Sheet", sheet_name="Sheet1", linked_account_owner_id="start"):
    print(f"[create_and_upload_df] DataFrame shape: {df.shape}", flush=True)
    if ACI_AVAILABLE:
        # Step 1: Create spreadsheet
        spreadsheet_body = {
            "properties": {"title": title, "locale": "en_US"},
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
        try:
            create_result = client.functions.execute(
                function_name="GOOGLE_SHEETS__SPREADSHEET_CREATE",
                function_arguments={"body": spreadsheet_body},
                linked_account_owner_id=linked_account_owner_id
            )
            spreadsheet_id = create_result.data["spreadsheetId"]
            spreadsheet_url = create_result.data.get("spreadsheetUrl", None)
            # Step 2: Values
            values = [list(map(str, df.columns))]
            for _, row in df.iterrows():
                values.append([("" if pd.isna(x) else str(x)) for x in row])
            # Step 3: Range
            last_col = num_to_a1_column(len(df.columns) - 1)
            last_row = len(df) + 1
            range_a1 = f"{sheet_name}!A1:{last_col}{last_row}"
            # Step 4: Update
            update_result = client.functions.execute(
                function_name="GOOGLE_SHEETS__VALUES_UPDATE",
                function_arguments={
                    "path": {"spreadsheetId": spreadsheet_id, "range": range_a1},
                    "query": {"valueInputOption": "RAW"},
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
            print(f"ACI error: {e}. Falling back to disk.", flush=True)

    # Fallback: save as CSV
    fname = f"{title.replace(' ', '_')}.csv"
    df.to_csv(fname, index=False)
    print(f"[DISK] Saved DataFrame as CSV: {os.path.abspath(fname)}")
    return {
        "filename": os.path.abspath(fname),
        "mock": True,
        "message": f"Saved dataframe as CSV to {os.path.abspath(fname)}"
    }

def append_rows_to_sheet(spreadsheet_id, sheet_name, rows, linked_account_owner_id="start"):
    """
    Appends a list of rows to a sheet (Google Sheets if supported, else CSV).
    Args:
        spreadsheet_id (str): The ID of the spreadsheet or the filename in mock mode.
        sheet_name (str): Sheet/tab name or filename in mock mode.
        rows (list of lists): Data to append.
        linked_account_owner_id (str): For ACI.
    Returns:
        dict: Result of operation.
    """
    if ACI_AVAILABLE:
        try:
            range_a1 = f"{sheet_name}!A1"
            append_result = client.functions.execute(
                function_name="GOOGLE_SHEETS__VALUES_APPEND",
                function_arguments={
                    "path": {"spreadsheetId": spreadsheet_id, "range": range_a1},
                    "query": {"valueInputOption": "RAW", "insertDataOption": "INSERT_ROWS"},
                    "body": {
                        "range": range_a1,
                        "majorDimension": "ROWS",
                        "values": rows
                    }
                },
                linked_account_owner_id=linked_account_owner_id
            )
            return {"result": append_result, "mock": False}
        except Exception as e:
            print(f"ACI error: {e}. Falling back to disk append.", flush=True)

    # Mock: treat spreadsheet_id as a CSV filename
    filename = spreadsheet_id
    if not filename.endswith(".csv"):
        filename = f"{filename}.csv"
    df_new = pd.DataFrame(rows)
    if os.path.exists(filename):
        # Load, find columns count, match structure, and append
        df_existing = pd.read_csv(filename)
        if df_existing.shape[1] == df_new.shape[1]:
            df_result = pd.concat([df_existing, df_new], ignore_index=True)
        else:
            print("[DISK][WARNING] Shape mismatch on append, will save side-by-side.")
            df_new.columns = [f"col_{i}" for i in range(df_new.shape[1])]
            df_result = pd.concat([df_existing, df_new], ignore_index=True)
        df_result.to_csv(filename, index=False)
        print(f"[DISK] Appended to existing CSV: {os.path.abspath(filename)}")
        return {
            "filename": os.path.abspath(filename),
            "mock": True,
            "message": f"Appended rows to {os.path.abspath(filename)}"
        }
    else:
        # New file; save headers as col_1,...
        df_new.columns = [f"col_{i}" for i in range(df_new.shape[1])]
        df_new.to_csv(filename, index=False)
        print(f"[DISK] Created new CSV: {os.path.abspath(filename)}")
        return {
            "filename": os.path.abspath(filename),
            "mock": True,
            "message": f"Created new CSV {os.path.abspath(filename)}"
        }
