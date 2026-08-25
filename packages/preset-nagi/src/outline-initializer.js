(() => {
  const hash = location.hash.split(':~:')[0]
  if (!hash) {
    return
  }

  const normalize = (value) => {
    try {
      return decodeURIComponent(value)
    }
    catch {
      return value
    }
  }

  const apply = () => {
    let matchedLink = null

    document.querySelectorAll('.nagi-outline__tree').forEach((tree) => {
      const links = [...tree.querySelectorAll('.nagi-outline-item__link')]
      const target = links.find(link => (
        normalize(link.getAttribute('href') || '') === normalize(hash)
      ))
      if (!target) {
        return
      }

      links.forEach((link) => {
        const active = link === target
        link.classList.toggle('is-active', active)
        if (active) {
          link.setAttribute('aria-current', 'location')
        }
        else {
          link.removeAttribute('aria-current')
        }
      })
      matchedLink = target.getAttribute('href')
    })

    if (matchedLink) {
      window.__KAWA_NAGI_INITIAL_OUTLINE_LINK__ = matchedLink
    }
    return Boolean(matchedLink)
  }

  if (apply()) {
    return
  }

  const observer = new MutationObserver(() => {
    if (apply()) {
      observer.disconnect()
    }
  })
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  })
  addEventListener('DOMContentLoaded', () => {
    apply()
    observer.disconnect()
  }, { once: true })
})()
