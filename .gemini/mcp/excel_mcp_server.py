from mcp.server.fastmcp import FastMCP
import pandas as pd
import os
import json

# Create FastMCP server
mcp = FastMCP("Excel-Data")

DATA_DIR = r"d:\AIDEV\Pengawas_KBC\excel_data"

@mcp.tool()
def list_excel_files() -> str:
    """List all Excel files (.xlsx, .xls) available in the excel_data directory."""
    try:
        if not os.path.exists(DATA_DIR):
            os.makedirs(DATA_DIR)
        files = [f for f in os.listdir(DATA_DIR) if f.endswith(('.xlsx', '.xls'))]
        if not files:
            return "No Excel files found in the excel_data directory."
        return "\n".join(f"- {f}" for f in files)
    except Exception as e:
        return f"Error: {str(e)}"

@mcp.tool()
def list_sheets(file_name: str) -> str:
    """Get the names of all sheets in a specified Excel workbook."""
    try:
        path = os.path.join(DATA_DIR, file_name)
        if not os.path.exists(path):
            return f"Error: File '{file_name}' not found."
        xls = pd.ExcelFile(path)
        return "\n".join(f"- {s}" for s in xls.sheet_names)
    except Exception as e:
        return f"Error: {str(e)}"

@mcp.tool()
def read_sheet(file_name: str, sheet_name: str = None) -> str:
    """Read data from a sheet in an Excel workbook and return it as a markdown table.
    If sheet_name is not specified, the first sheet will be read.
    """
    try:
        path = os.path.join(DATA_DIR, file_name)
        if not os.path.exists(path):
            return f"Error: File '{file_name}' not found."
        xls = pd.ExcelFile(path)
        if not sheet_name:
            sheet_name = xls.sheet_names[0]
        df = pd.read_excel(path, sheet_name=sheet_name)
        # Handle nan values cleanly
        df = df.fillna("")
        return df.to_markdown(index=False)
    except Exception as e:
        return f"Error: {str(e)}"

@mcp.tool()
def write_sheet(file_name: str, sheet_name: str, data_json: str) -> str:
    """Write or overwrite a sheet in an Excel workbook with data.
    data_json must be a JSON array of objects (list of dictionaries), e.g., [{"Name": "John", "Age": 30}].
    """
    try:
        path = os.path.join(DATA_DIR, file_name)
        data = json.loads(data_json)
        if not isinstance(data, list):
            return "Error: Data must be a JSON list of objects."
        df = pd.DataFrame(data)
        
        # Read existing sheets if file exists
        sheets = {}
        if os.path.exists(path):
            xls = pd.ExcelFile(path)
            for s_name in xls.sheet_names:
                if s_name != sheet_name:
                    sheets[s_name] = pd.read_excel(path, sheet_name=s_name)
        
        sheets[sheet_name] = df
        
        # Write all sheets back
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            for s_name, s_df in sheets.items():
                s_df.to_excel(writer, sheet_name=s_name, index=False)
                
        return f"Successfully wrote sheet '{sheet_name}' to '{file_name}'."
    except Exception as e:
        return f"Error: {str(e)}"

@mcp.tool()
def append_row(file_name: str, sheet_name: str, row_json: str) -> str:
    """Append a single row of data to a sheet in an Excel workbook.
    row_json must be a JSON object mapping columns to values (e.g., {"Name": "Bob", "Age": 25}).
    """
    try:
        path = os.path.join(DATA_DIR, file_name)
        row_data = json.loads(row_json)
        if not isinstance(row_data, dict):
            return "Error: Row data must be a JSON object."
            
        # Get existing data
        df_new = pd.DataFrame([row_data])
        sheets = {}
        
        if os.path.exists(path):
            xls = pd.ExcelFile(path)
            for s_name in xls.sheet_names:
                if s_name == sheet_name:
                    df_old = pd.read_excel(path, sheet_name=s_name)
                    sheets[s_name] = pd.concat([df_old, df_new], ignore_index=True)
                else:
                    sheets[s_name] = pd.read_excel(path, sheet_name=s_name)
        
        if sheet_name not in sheets:
            sheets[sheet_name] = df_new
            
        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            for s_name, s_df in sheets.items():
                s_df.to_excel(writer, sheet_name=s_name, index=False)
                
        return f"Successfully appended row to sheet '{sheet_name}' in '{file_name}'."
    except Exception as e:
        return f"Error: {str(e)}"

if __name__ == "__main__":
    mcp.run()
