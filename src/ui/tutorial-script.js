// ===== 分步骤教学脚本 =====
// 按 World -> View -> Projection -> MVP 的顺序逐步讲解，并自动设置参数。

import { resetAll, setWorld, setView, setProjection, state } from '../state/store.js'
import { syncUI, applyPreset } from './panels.js'
import { stopDemo } from './demo-mode.js'

const scriptSteps = [
  {
    title: 'Step 1/8: 模型空间到世界空间',
    desc: '先观察默认状态：所有矩阵接近单位矩阵，当前模型位于世界原点。',
    apply: () => {
      resetAll()
      applyTab('world-formula')
    }
  },
  {
    title: 'Step 2/8: World-平移',
    desc: '设置 tx=3, ty=1, tz=-2，观察世界矩阵第四列变化，当前模型整体位移。',
    apply: () => {
      setWorld('tx', 3)
      setWorld('ty', 1)
      setWorld('tz', -2)
      applyTab('world-formula')
    }
  },
  {
    title: 'Step 3/8: World-旋转与缩放',
    desc: '设置 Yaw=45°, Pitch=20°, Scale=1.5，观察旋转块和对角线变化。',
    apply: () => {
      setWorld('ry', 45)
      setWorld('rx', 20)
      setWorld('scale', 1.5)
      applyTab('world-formula')
    }
  },
  {
    title: 'Step 4/8: View-相机视角',
    desc: '切到侧视预设，理解 View 矩阵是在“移动世界”而非移动模型。',
    apply: () => {
      applyPreset('side')
      applyTab('view-formula')
    }
  },
  {
    title: 'Step 5/8: View-俯仰与距离',
    desc: '设置 pitch=40, distance=16，观察画面透视关系和 View 矩阵变化。',
    apply: () => {
      setView('pitch', 40)
      setView('distance', 16)
      applyTab('view-formula')
    }
  },
  {
    title: 'Step 6/8: Projection-FOV',
    desc: '将 FOV 提升到 95°，观察广角效果和投影矩阵 f 项变化。',
    apply: () => {
      setProjection('type', 'perspective')
      setProjection('fov', 95)
      setProjection('near', 0.1)
      setProjection('far', 100)
      applyTab('proj-formula')
    }
  },
  {
    title: 'Step 7/8: Projection-近远截面',
    desc: '将 near 推到 2.0，far 降到 40，观察裁剪和深度分布变化。',
    apply: () => {
      setProjection('near', 2)
      setProjection('far', 40)
      applyTab('proj-formula')
    }
  },
  {
    title: 'Step 8/8: MVP 链路总结',
    desc: '回到等轴测视角并展示 MVP：Pclip = Mp * Mv * Mw * Pmodel。',
    apply: () => {
      applyPreset('iso')
      setProjection('fov', 60)
      setProjection('near', 0.1)
      setProjection('far', 100)
      applyTab('mvp-formula')
    }
  }
]

let active = false
let stepIndex = -1

export function initTutorialScript() {
  document.getElementById('btn-script-start')?.addEventListener('click', startScript)
  document.getElementById('btn-script-end')?.addEventListener('click', endScript)
  document.getElementById('btn-script-prev')?.addEventListener('click', prevStep)
  document.getElementById('btn-script-next')?.addEventListener('click', nextStep)

  updateView()
}

function startScript() {
  stopDemo()
  active = true
  stepIndex = 0
  runStep()
}

function endScript() {
  active = false
  stepIndex = -1
  const title = document.getElementById('script-step-title')
  const desc = document.getElementById('script-step-desc')
  if (title) title.textContent = '未开始'
  if (desc) desc.textContent = '点击“开始脚本”后，会按 World → View → Projection 的顺序逐步讲解并自动设置参数。'
  const hint = document.getElementById('status-hint')
  if (hint) hint.textContent = '教学脚本已结束'
  updateView()
}

function prevStep() {
  if (!active) return
  stepIndex = Math.max(0, stepIndex - 1)
  runStep()
}

function nextStep() {
  if (!active) return
  stepIndex = Math.min(scriptSteps.length - 1, stepIndex + 1)
  runStep()
}

function runStep() {
  if (!active || stepIndex < 0 || stepIndex >= scriptSteps.length) return
  const step = scriptSteps[stepIndex]
  step.apply()
  syncUI()
  renderStep(step)

  const hint = document.getElementById('status-hint')
  if (hint) hint.textContent = `教学脚本进行中：${step.title}`

  updateView()
}

function renderStep(step) {
  const title = document.getElementById('script-step-title')
  const desc = document.getElementById('script-step-desc')
  if (title) title.textContent = step.title
  if (desc) desc.textContent = step.desc
}

function updateView() {
  const prevBtn = document.getElementById('btn-script-prev')
  const nextBtn = document.getElementById('btn-script-next')
  const endBtn = document.getElementById('btn-script-end')

  const disabled = !active
  if (prevBtn) prevBtn.disabled = disabled || stepIndex <= 0
  if (nextBtn) nextBtn.disabled = disabled || stepIndex >= scriptSteps.length - 1
  if (endBtn) endBtn.disabled = disabled
}

function applyTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tabId)
  })
  document.querySelectorAll('.formula-content').forEach(c => {
    c.classList.toggle('hidden', c.id !== tabId)
  })
  state.ui.activeFormulaTab = tabId
}
