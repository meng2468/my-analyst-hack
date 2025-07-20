import asyncio

class TranscriptBroadcaster:
    def __init__(self):
        self.listeners = set()

    async def push(self, message: str):
        for queue in list(self.listeners):
            await queue.put(message)

    def add_listener(self):
        queue = asyncio.Queue()
        self.listeners.add(queue)
        return queue

    def remove_listener(self, queue):
        self.listeners.discard(queue)

broadcaster = TranscriptBroadcaster()