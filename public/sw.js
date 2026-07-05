self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'ideal', {
      body: data.body ?? "Time to check your habits for today.",
      icon: '/apple-icon',
      badge: '/apple-icon',
      // Distinct tag per push so a class reminder doesn't overwrite the
      // briefing that's still sitting in the tray.
      tag: data.tag ?? `ideal-${Date.now()}`,
      renotify: true,
      data: { url: data.url ?? '/' },
    })
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if ('navigate' in client && url !== '/') client.navigate(url)
          return client.focus()
        }
      }
      return clients.openWindow(url)
    })
  )
})
