export async function registerPwaServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  await navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function showFinanceSystemNotification(title: string, message: string): Promise<void> {
  if (!("Notification" in window) || Notification.permission !== "granted" || !("serviceWorker" in navigator)) return;
  const registration = await navigator.serviceWorker.ready;
  await registration.showNotification(title, {
    body: message,
    icon: "/icons/finsight-192.png",
    badge: "/icons/finsight-192.png",
    tag: "finsight-finance-alert",
  });
}
