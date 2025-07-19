# agent.py
import os
import time
import threading
import subprocess
import asyncio

from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from mcp_use import MCPClient, MCPAgent
import pandas as pd
from langchain.globals import set_debug, set_verbose

# /// script
# dependencies = ["pydantic", "pandas", "numpy"]
# ///

set_debug(True)
set_verbose(True)
load_dotenv()


def deno_warmup():
    """
    Runs the MCP Pyodide warmup to cache dependencies for Deno.
    """
    cmd = [
        "deno", "run",
        "-N", "-R=node_modules", "-W=node_modules",
        "--node-modules-dir=auto",
        "jsr:@pydantic/mcp-run-python", "warmup"
    ]
    print("[mcp-warmup] starting warmup...")
    subprocess.run(cmd, check=True)
    print("[mcp-warmup] complete")


def start_mcp_sse():
    """
    Launches the MCP server via Deno + jsr:@pydantic/mcp-run-python in SSE mode,
    serving the airline.csv asset.
    """
    deno_cmd = [
        "deno", "run",
        "-N", "-R=node_modules", "-W=node_modules",
        "--node-modules-dir=auto",
        "jsr:@pydantic/mcp-run-python", "sse",
        "--asset=airline.csv"
    ]
    proc = subprocess.Popen(
        deno_cmd,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    print(f"[mcp-sse] started (pid={proc.pid})")
    def stream_logs(pipe, prefix):
        for line in iter(pipe.readline, ""):
            print(f"[mcp-sse][{prefix}] {line.rstrip()}")
    threading.Thread(target=stream_logs, args=(proc.stdout, "OUT"), daemon=True).start()
    threading.Thread(target=stream_logs, args=(proc.stderr, "ERR"), daemon=True).start()
    return proc

async def perform_analysis(user_question: str):
    """
    Runs your MCPAgent prompt against the in-process SSE server.
    """
    # Give Deno-SSE a moment to spin up
    await asyncio.sleep(0.5)

    config = {
        "mcpServers": {
            "py": {"url": "http://127.0.0.1:3001/sse"}
        }
    }
    client = MCPClient.from_dict(config)
    llm = ChatOpenAI(model="gpt-4o-mini")
    agent = MCPAgent(llm=llm, client=client, max_steps=30)

    prompt = f"""
you are a data science evaluation bot. you have access to data like this

satisfaction,Customer Type,Age,Type of Travel,Class,Flight Distance,Seat comfort,Departure/Arrival time convenient,Food and drink,Gate location,Inflight wifi service,Inflight entertainment,Online support,Ease of Online booking,On-board service,Leg room service,Baggage handling,Checkin service,Cleanliness,Online boarding,Departure Delay in Minutes,Arrival Delay in Minutes
satisfied,Loyal Customer,65,Personal Travel,Eco,265,0,0,0,2,2,4,2,3,3,0,3,5,3,2,0,0.0
satisfied,Loyal Customer,47,Personal Travel,Business,2464,0,0,0,3,0,2,2,3,4,4,4,2,3,2,310,305.0
satisfied,Loyal Customer,15,Personal Travel,Eco,2138,0,0,0,3,2,0,2,2,3,3,4,4,4,2,0,0.0
satisfied,Loyal Customer,60,Personal Travel,Eco,623,0,0,0,3,3,4,3,1,1,0,1,4,1,3,0,0.0
dissatisfied,disloyal Customer,63,Personal Travel,Business,2087,2,3,2,4,2,1,1,3,2,3,3,1,2,1,174,172.0
dissatisfied,disloyal Customer,69,Personal Travel,Eco,2320,3,0,3,3,3,2,2,4,4,3,4,2,3,2,155,163.0
dissatisfied,disloyal Customer,66,Personal Travel,Eco,2450,3,2,3,2,3,2,2,3,3,2,3,2,1,2,193,205.0
dissatisfied,disloyal Customer,38,Personal Travel,Eco,4307,3,4,3,3,3,3,3,4,5,5,5,3,3,3,185,186.0

...

YOU MUST LOAD THE pd df the data I provided is only an example.
{user_question}

prepent this to your code always

# /// script
# dependencies = ["pydantic", "pandas", "numpy"]
# ///

also notify in detal about all errors encoutered
"""
    result = await agent.run(prompt)
    text = str(result)
    return text.split("Final Answer:")[-1].strip()

if __name__ == "__main__":
    # 1️⃣ Spawn the Deno-based MCP SSE server
    mcp_proc = start_mcp_sse()

    # 2️⃣ Run a demo question
    async def demo():
        answer = await perform_analysis("How many entries are there?")
        print("→ Analysis:", answer)
    asyncio.run(demo())

    # (3️⃣) When you exit the script, Deno will be killed automatically as daemon threads exit.
