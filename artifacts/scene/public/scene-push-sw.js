self.addEventListener("push", (event) => {
  let tag = "scene-message";
  try { tag = event.data?.json()?.tag || tag; } catch {}
  event.waitUntil(self.registration.showNotification("MOVIA DATING", {
    body: "Yeni bir mesajın var.",
    icon: new URL("scene-icon-192.png", self.registration.scope).href,
    tag,
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL("mesajlar", self.registration.scope).href;
  event.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (windows) => {
    const existing = windows.find((client) => client.url.startsWith(self.registration.scope));
    if (!existing) { await self.clients.openWindow(url); return; }
    await existing.navigate(url);
    await existing.focus();
  }));
});
