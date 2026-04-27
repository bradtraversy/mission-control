import { classifyPaths } from "@/lib/activity";
import { subscribeVault } from "@/lib/watcher";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HEARTBEAT_MS = 15_000;

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          closed = true;
        }
      };

      send(`retry: 3000\n\n`);
      send(`: connected ${Date.now()}\n\n`);

      const unsubscribe = subscribeVault((change) => {
        send(`event: change\ndata: ${JSON.stringify(change)}\n\n`);
        const entries = classifyPaths(change.paths, change.at);
        if (entries.length > 0) {
          send(`event: activity\ndata: ${JSON.stringify({ entries })}\n\n`);
        }
      });

      const heartbeat = setInterval(() => {
        send(`: ping ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      request.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
