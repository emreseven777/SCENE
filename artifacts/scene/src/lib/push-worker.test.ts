import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { createContext, runInContext } from "node:vm";

test("the navigation service worker also handles push without exposing message content", async () => {
  type WorkerEvent = {
    data?: { json: () => unknown };
    notification?: { close: () => void };
    waitUntil: (work: Promise<unknown>) => void;
  };
  const handlers = new Map<string, (event: WorkerEvent) => void>();
  const displayed: { title: string; body: string; tag: string }[] = [];
  let destination = "";
  const self = {
    addEventListener(type: string, handler: (event: WorkerEvent) => void) { handlers.set(type, handler); },
    registration: {
      scope: "https://example.invalid/movia/",
      async showNotification(title: string, { body, tag }: { body: string; tag: string }) {
        displayed.push({ title, body, tag });
      },
    },
    clients: {
      async matchAll() { return []; },
      async openWindow(url: string) { destination = url; },
    },
  };
  const publicDir = new URL("../../public/", import.meta.url);
  const context = createContext({
    self,
    URL,
    importScripts(path: string) {
      runInContext(readFileSync(new URL(path, publicDir), "utf8"), context);
    },
  });
  runInContext(readFileSync(new URL("sw.js", publicDir), "utf8"), context);
  assert.ok(handlers.has("fetch"));
  let work: Promise<unknown> | undefined;
  const waitUntil = (pending: Promise<unknown>) => { work = pending; };
  handlers.get("push")!({ data: { json: () => ({ tag: "test-message", body: "private message" }) }, waitUntil });
  await work;
  assert.deepEqual(displayed, [{ title: "MOVIA DATING", body: "Yeni bir mesajın var.", tag: "test-message" }]);
  handlers.get("notificationclick")!({ notification: { close() {} }, waitUntil });
  await work;
  assert.equal(destination, "https://example.invalid/movia/mesajlar");
});
