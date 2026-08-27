(() => {
  try {
    const appearance = localStorage.getItem('kawapress:appearance')
    if (appearance !== 'light' && appearance !== 'dark') {
      return
    }
    const root = document.documentElement
    root.classList.remove(appearance === 'dark' ? 'light' : 'dark')
    root.classList.add(appearance)
  }
  catch {}
})()
