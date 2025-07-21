import os

# Try to load dotenv if present
try:
    from dotenv import load_dotenv
    load_dotenv(override=True)
except ImportError:
    print("Warning: dotenv not installed, skipping .env loading.")

# Try to import ACI and initialize client
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
    print(f"ACI not installed: {e}. Running in mock mode.")
except Exception as e:
    print(f"Could not initialize ACI: {e}. Running in mock mode.")

def send_mail(email: str, body: str):
    """
    Send an email via GMAIL__SEND_EMAIL or simulate if not possible.

    Args:
        email (str): Recipient's email address
        body (str): Email body

    Returns:
        dict or FunctionExecutionResult: Result or mock response
    """
    if ACI_AVAILABLE:
        try:
            result = client.functions.execute(
                function_name="GMAIL__SEND_EMAIL",
                function_arguments={
                    "sender": "me",
                    "recipient": email,
                    "subject": "AI Summary",
                    "body": body
                },
                linked_account_owner_id="main"
            )
            print("send_mail (real):", result, flush=True)
            return result
        except Exception as e:
            print(f"ACI error sending email: {e}. Switching to mock mode.", flush=True)
    # Mock fallback
    print(f"[MOCK] Would send mail to: {email}\nSubject: AI Summary\nBody:\n{body}\n")
    result = {
        "status": "WOULD_SEND",
        "recipient": email,
        "subject": "AI Summary",
        "body": body,
        "mock": True
    }
    print("send_mail (mock):", result, flush=True)
    return result
