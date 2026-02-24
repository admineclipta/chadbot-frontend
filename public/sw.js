self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (error) {
    payload = {
      title: "Nueva notificacion",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = payload.title || "Chadbot";
  const body = payload.body || "Tienes una nueva notificacion";
  const conversationId = payload.conversationId || "";
  const targetUrl =
    payload.url ||
    (conversationId
      ? "/?openConversationId=" + encodeURIComponent(conversationId)
      : "/");

  const options = {
    body,
    tag: payload.notificationId || conversationId || payload.type || "chadbot",
    icon: "/chadbot-isotipo.png",
    badge: "/chadbot-isotipo.png",
    data: {
      url: targetUrl,
      conversationId,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  const fallbackUrl =
    data.url ||
    (data.conversationId
      ? "/?openConversationId=" + encodeURIComponent(data.conversationId)
      : "/");

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({
            type: "PUSH_NOTIFICATION_CLICK",
            conversationId: data.conversationId || "",
          });

          return client.focus().then(() => {
            if ("navigate" in client && fallbackUrl) {
              return client.navigate(fallbackUrl);
            }
            return undefined;
          });
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(fallbackUrl);
      }
      return undefined;
    }),
  );
});
