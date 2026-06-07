// ===== 应用入口 =====

import { initScene } from './engine/scene.js'
import { initFrustum } from './visuals/frustum.js'
import { initMatrixBoard } from './ui/matrix-board.js'
import { initPanels, syncUI } from './ui/panels.js'
import { initCoordinateTracker } from './ui/coordinate-tracker.js'
import { initDemoMode } from './ui/demo-mode.js'
import { toggleDemo } from './ui/demo-mode.js'
import { initIO } from './ui/io.js'
import { resetAll } from './state/store.js'
import { initTutorialScript } from './ui/tutorial-script.js'

function main() {
  const canvas = document.getElementById('three-canvas')
  const { scene } = initScene(canvas)

  initFrustum(scene)
  initMatrixBoard()
  initPanels()
  initCoordinateTracker()
  initDemoMode()
  initIO()
  initTutorialScript()

  // ---- 帮助弹窗 ----
  document.getElementById('btn-help')?.addEventListener('click', () => {
    document.getElementById('help-modal')?.classList.remove('hidden')
  })
  document.getElementById('btn-close-help')?.addEventListener('click', () => {
    document.getElementById('help-modal')?.classList.add('hidden')
  })
  document.getElementById('help-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden')
  })

  // ---- 键盘快捷键 ----
  document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return
    switch (e.key) {
      case 'r': case 'R':
        resetAll(); syncUI()
        break
      case ' ':
        e.preventDefault()
        toggleDemo()
        break
      case '1': applyPreset('front'); break
      case '2': applyPreset('side');  break
      case '3': applyPreset('top');   break
      case '4': applyPreset('iso');   break
    }
  })

  // 状态栏就绪
  document.getElementById('status-hint').textContent = '就绪 — 拖动参数开始探索'
}

function applyPreset(name) {
  document.querySelector(`.preset[data-preset="${name}"]`)?.click()
}

main()
