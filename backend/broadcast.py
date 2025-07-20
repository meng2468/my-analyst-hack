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

class EnrichmentBroadcaster:
    def __init__(self):
        self.listeners = set()

    async def push(self, message: str, session_id=None):
        # Only send to listeners for that session, if session is specified
        targets = list(self.listeners)
        for sid, queue in targets:
            if session_id is None or sid == session_id:
                await queue.put(message)

    def add_listener(self, session_id=None):
        queue = asyncio.Queue()
        self.listeners.add((session_id, queue))
        return queue

    def remove_listener(self, queue):
        self.listeners = set((sid, q) for (sid, q) in self.listeners if q != queue)

broadcaster = TranscriptBroadcaster()
enrichment_broadcaster = EnrichmentBroadcaster()
