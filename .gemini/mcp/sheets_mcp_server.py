from mcp.server.fastmcp import FastMCP
import pandas as pd
import requests
import os
import json
import urllib.parse

# Create FastMCP server
mcp = FastMCP("Google-Sheets")

CRED_PATH = r"d:\AIDEV\Pengawas_KBC\credentials.json"

def get_access_token():
    """Load Service Account credentials if available and get an access token."""
    if not os.path.exists(CRED_PATH):
        return None
    try:
        from google.oauth2 import service_account
        import google.auth.transport.requests
        creds = service_account.Credentials.from_service_account_file(
            CRED_PATH, 
            scopes=['https://www.googleapis.com/auth/spreadsheets']
        )
        auth_req = google.auth.transport.requests.Request()
        creds.refresh(auth_req)
        return creds.token
    except Exception as e:
        print(f"Error loading credentials: {e}")
        return None

@mcp.tool()
def read_google_sheet(spreadsheet_id: str, sheet_name: str = None) -> str:
    """Read a Google Sheet by its Spreadsheet ID and optional Sheet (tab) name.
    If the spreadsheet is shared ('Anyone with the link can view'), it will be read instantly without credentials.
    If a 'credentials.json' is available in the workspace, it will use secure API access instead.
    """
    try:
        # Try to use authenticated Sheets API if credentials.json is present
        token = get_access_token()
        if token:
            headers = {'Authorization': f'Bearer {token}'}
            # Fetch sheet metadata first to get sheet names or verify sheet
            url = f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}'
            meta = requests.get(url, headers=headers).json()
            if 'error' not in meta:
                # Read range
                range_name = sheet_name if sheet_name else 'A1:ZZ10000'
                read_url = f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{urllib.parse.quote(range_name)}'
                res = requests.get(read_url, headers=headers).json()
                if 'values' in res:
                    vals = res['values']
                    if not vals:
                        return "Sheet is empty."
                    headers_row = vals[0]
                    data_rows = vals[1:]
                    
                    # Pad rows to match headers length
                    padded_rows = []
                    for row in data_rows:
                        if len(row) < len(headers_row):
                            row = row + [""] * (len(headers_row) - len(row))
                        elif len(row) > len(headers_row):
                            row = row[:len(headers_row)]
                        padded_rows.append(row)
                        
                    df = pd.DataFrame(padded_rows, columns=headers_row)
                    return df.to_markdown(index=False)
                else:
                    return f"Error reading range: {res.get('error', {}).get('message', 'Unknown error')}"

        # Fallback to Viz API (CSV Export) - Works instantly for shared sheets!
        sheet_param = f"&sheet={urllib.parse.quote(sheet_name)}" if sheet_name else ""
        csv_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}/gviz/tq?tqx=out:csv{sheet_param}"
        
        df = pd.read_csv(csv_url)
        df = df.fillna("")
        return df.to_markdown(index=False)
    except Exception as e:
        return f"Error: {str(e)}\nMake sure the Spreadsheet ID is correct and (if not using credentials) the spreadsheet is shared 'Anyone with the link can view'."

@mcp.tool()
def write_google_sheet(spreadsheet_id: str, range_name: str, values_json: str) -> str:
    """Write or update values in a Google Sheet.
    Requires 'credentials.json' to be present in the workspace.
    values_json must be a JSON list of lists (e.g., [["Header1", "Header2"], ["Row1Val1", "Row1Val2"]]).
    """
    try:
        token = get_access_token()
        if not token:
            return "Error: Writing to Google Sheets requires a 'credentials.json' (Service Account Key) in the workspace."
            
        values = json.loads(values_json)
        if not isinstance(values, list) or not all(isinstance(row, list) for row in values):
            return "Error: values_json must be a JSON list of lists."
            
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        url = f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{urllib.parse.quote(range_name)}?valueInputOption=USER_ENTERED'
        body = {
            'range': range_name,
            'majorDimension': 'ROWS',
            'values': values
        }
        res = requests.put(url, headers=headers, json=body).json()
        if 'error' in res:
            return f"API Error: {res['error']['message']}"
            
        return f"Successfully wrote {res.get('updatedCells', 0)} cells to range '{range_name}'."
    except Exception as e:
        return f"Error: {str(e)}"

@mcp.tool()
def append_google_sheet(spreadsheet_id: str, range_name: str, values_json: str) -> str:
    """Append values to the end of a sheet or range in a Google Sheet.
    Requires 'credentials.json' to be present in the workspace.
    values_json must be a JSON list of lists (e.g., [["Row1Val1", "Row1Val2"], ["Row2Val1", "Row2Val2"]]).
    """
    try:
        token = get_access_token()
        if not token:
            return "Error: Appending to Google Sheets requires a 'credentials.json' (Service Account Key) in the workspace."
            
        values = json.loads(values_json)
        if not isinstance(values, list) or not all(isinstance(row, list) for row in values):
            return "Error: values_json must be a JSON list of lists."
            
        headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
        url = f'https://sheets.googleapis.com/v4/spreadsheets/{spreadsheet_id}/values/{urllib.parse.quote(range_name)}:append?valueInputOption=USER_ENTERED'
        body = {
            'range': range_name,
            'majorDimension': 'ROWS',
            'values': values
        }
        res = requests.post(url, headers=headers, json=body).json()
        if 'error' in res:
            return f"API Error: {res['error']['message']}"
            
        return f"Successfully appended data. Updated range: {res.get('updates', {}).get('updatedRange')}."
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    mcp.run()
