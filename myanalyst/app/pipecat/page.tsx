import { PipecatClient } from "@pipecat-ai/client-js";
import { PipecatClientAudio, PipecatClientProvider } from "@pipecat-ai/client-react";

import { usePipecatClient } from "@pipecat-ai/client-react";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

const MyApp = () => {
  const client = usePipecatClient();
  return <button onClick={() => client?.start()}>OK Computer</button>;
};


export default function Page() {
  const client = new PipecatClient({
    transport: SmallWebRTCTransport.create(),
  });

  return (
    <PipecatClientProvider client={client}>
      <MyApp />
      <PipecatClientAudio />
    </PipecatClientProvider>
  );
}