(() => {
  const platform = navigator.userAgentData?.platform
    || navigator.platform
    || navigator.userAgent

  document.documentElement.dataset.kawaPlatform
    = /Mac|iPhone|iPad|iPod/i.test(platform) ? 'apple' : 'control'
})()
