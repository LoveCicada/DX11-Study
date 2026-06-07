// ===== 演示模式 =====
// 自动播放预设参数脚本，展示各矩阵变化效果

import { state, setWorld, setView, setProjection, resetAll, on, emit } from '../state/store.js'

// 关键帧脚本：每帧包含 [参数路径, 目标值, 持续时间ms]
const demoScript = [
  // World: 旋转演示
  { group: 'world', key: 'ry', target: 180, duration: 3000, label: '世界矩阵：Y轴旋转' },
  { group: 'world', key: 'rx', target: 30, duration: 1500, label: '世界矩阵：X轴旋转' },
  { group: 'world', key: 'tx', target: 3, duration: 1500, label: '世界矩阵：X轴平移' },
  { group: 'world', key: 'scale', target: 1.8, duration: 1000, label: '世界矩阵：缩放' },
  // View: 相机绕行
  { group: 'view', key: 'yaw', target: 180, duration: 3000, label: '视图矩阵：相机方位' },
  { group: 'view', key: 'pitch', target: 60, duration: 1500, label: '视图矩阵：相机俯仰' },
  { group: 'view', key: 'distance', target: 20, duration: 1500, label: '视图矩阵：推远相机' },
  // Projection: FOV & Near/Far
  { group: 'projection', key: 'fov', target: 90, duration: 2000, label: '投影矩阵：FOV 变宽' },
  { group: 'projection', key: 'fov', target: 30, duration: 2000, label: '投影矩阵：FOV 变窄' },
  { group: 'projection', key: 'near', target: 3,  duration: 1500, label: '投影矩阵：近截面推远' },
  // 重置
  { group: '__reset__', duration: 500, label: '重置' }
]

const storeSetters = {
  world: setWorld,
  view: setView,
  projection: setProjection
}

let playing = false
let currentStep = 0
let raf = null
let stepStart = 0
let stepFrom = 0
let loopCount = 0

export function initDemoMode() {
  document.getElementById('btn-demo')?.addEventListener('click', toggleDemo)
  document.getElementById('btn-demo-stop')?.addEventListener('click', stopDemo)
  document.getElementById('demo-bar')?.addEventListener('click', () => {})
}

export function toggleDemo() {
  if (playing) stopDemo()
  else startDemo()
}

function startDemo() {
  playing = true
  currentStep = 0
  loopCount = 0
  document.getElementById('demo-bar')?.classList.remove('hidden')
  document.getElementById('btn-demo').textContent = '⏸ 暂停'
  beginStep()
}

export function stopDemo() {
  playing = false
  cancelAnimationFrame(raf)
  document.getElementById('demo-bar')?.classList.add('hidden')
  const btn = document.getElementById('btn-demo')
  if (btn) btn.textContent = '▶ 演示'
}

function beginStep() {
  if (!playing) return
  const step = demoScript[currentStep]
  if (!step) return

  // 记录起始值
  if (step.group === '__reset__') {
    resetAll()
    setTimeout(() => {
      currentStep = 0
      loopCount++
      if (loopCount >= 2) { stopDemo(); return }
      beginStep()
    }, step.duration)
    return
  }

  const groupState = state[step.group]
  stepFrom = groupState[step.key]
  stepStart = performance.now()

  // 更新提示
  const label = document.getElementById('demo-label')
  if (label) label.textContent = step.label

  tickStep()
}

function tickStep() {
  if (!playing) return
  const step = demoScript[currentStep]
  if (!step || step.group === '__reset__') return

  const elapsed = performance.now() - stepStart
  const t = Math.min(elapsed / step.duration, 1)
  const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t  // easeInOut

  const val = stepFrom + (step.target - stepFrom) * ease

  // 更新 progress bar
  const progress = document.getElementById('demo-progress')
  if (progress) progress.style.width = (t * 100) + '%'

  storeSetters[step.group](step.key, val)

  if (t < 1) {
    raf = requestAnimationFrame(tickStep)
  } else {
    // 进入下一步
    setTimeout(() => {
      currentStep = (currentStep + 1) % demoScript.length
      beginStep()
    }, 200)
  }
}
