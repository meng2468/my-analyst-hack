from aci import ACI
import os
from aci.types.apps import AppBasic, AppDetails
from aci.types.functions import FunctionExecutionResult
from aci.types.enums import FunctionDefinitionFormat
from dotenv import load_dotenv
load_dotenv(override=True)

client = ACI(api_key=os.getenv("ACI_API_KEY"))


def send_mail(email: str, body: str):
    result: FunctionExecutionResult = client.functions.execute(
        function_name="GMAIL__SEND_EMAIL",
        function_arguments={
            "sender": "me",
            "recipient": email,
            "subject": "AI Summary",
            "body": body
        },
        linked_account_owner_id="main"
    )
    print("send_mail", result, flush=True)
    return result
    
