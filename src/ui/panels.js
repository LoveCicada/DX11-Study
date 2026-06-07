// ===== 参数面板绑定 =====
// 将所有 HTML 滑杆/输入框绑定到 store 的 setWorld/setView/setProjection

import {
  state, setWorld, setView, setProjection,
  resetWorld, resetView, resetProjection, resetAll, on, emit
} from '../state/store.js'
import { setFrustumVisible } from '../visuals/frustum.js'
import { setPrecision, setLayout } from './matrix-board.js'

// ---- 工具：双向绑定滑杆 + 数字输入框 ----
function bindParam(sliderId, numId, storeFn, key, opts = {}) {
  const slider = document.getElementById(sliderId)
  const num    = document.getElementById(numId)
  if (!slider || !num) return

  const clamp = (v) => {
    const min = parseFloat(slider.min)
    const max = parseFloat(slider.max)
    return Math.min(max, Math.max(min, v))
  }

  slider.addEventListener('input', () => {
    const v = parseFloat(slider.value)
    num.value = v
    storeFn(key, v)
    if (opts.onchange) opts.onchange(v)
  })

  num.addEventListener('change', () => {
    const v = clamp(parseFloat(num.value) || 0)
    slider.value = v
    num.value = v
    storeFn(key, v)
    if (opts.onchange) opts.onchange(v)
  })

  // 支持精细调节：Shift 键步长 /10
  num.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault()
      const step = parseFloat(slider.step) || 1
      const factor = e.shiftKey ? 0.1 : 1
      const dir = e.key === 'ArrowUp' ? 1 : -1
      const v = clamp(parseFloat(num.value) + dir * step * factor)
      slider.value = v
      num.value = v
      storeFn(key, v)
    }
  })
}

// ---- 从 store 同步 UI（导入/重置时） ----
export function syncUI() {
  const w = state.world
  const v = state.view
  const p = state.projection

  const setSliderNum = (sid, nid, val) => {
    const s = document.getElementById(sid); if (s) s.value = val
    const n = document.getElementById(nid); if (n) n.value = val
  }

  setSliderNum('world-tx', 'world-tx-num', w.tx)
  setSliderNum('world-ty', 'world-ty-num', w.ty)
  setSliderNum('world-tz', 'world-tz-num', w.tz)
  setSliderNum('world-rx', 'world-rx-num', w.rx)
  setSliderNum('world-ry', 'world-ry-num', w.ry)
  setSliderNum('world-rz', 'world-rz-num', w.rz)
  setSliderNum('world-scale', 'world-scale-num', w.scale)

  setSliderNum('cam-dist', 'cam-dist-num', v.distance)
  setSliderNum('cam-pitch', 'cam-pitch-num', v.pitch)
  setSliderNum('cam-yaw', 'cam-yaw-num', v.yaw)

  setSliderNum('proj-fov', 'proj-fov-num', p.fov)
  setSliderNum('proj-near', 'proj-near-num', p.near)
  setSliderNum('proj-far', 'proj-far-num', p.far)

  const radios = document.querySelectorAll('[name="proj-type"]')
  radios.forEach(r => { r.checked = r.value === p.type })

  const aspectSel = document.getElementById('proj-aspect')
  if (aspectSel) aspectSel.value = String(parseFloat(p.aspect.toFixed(4)))

  const frustumCb = document.getElementById('show-frustum')
  if (frustumCb) frustumCb.checked = state.ui.showFrustum

  const modeBtn = document.getElementById('btn-coord-mode')
  if (modeBtn) {
    modeBtn.textContent = state.ui.coordinateMode === 'dx11-lh' ? '坐标系: DX11 LH' : '坐标系: Web RH'
  }

  document.querySelectorAll('.layout-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.layout === state.ui.matrixLayout)
  })
}

export function initPanels() {
  // ===== World 面板 =====
  bindParam('world-tx', 'world-tx-num', setWorld, 'tx')
  bindParam('world-ty', 'world-ty-num', setWorld, 'ty')
  bindParam('world-tz', 'world-tz-num', setWorld, 'tz')
  bindParam('world-rx', 'world-rx-num', setWorld, 'rx')
  bindParam('world-ry', 'world-ry-num', setWorld, 'ry')
  bindParam('world-rz', 'world-rz-num', setWorld, 'rz')
  bindParam('world-scale', 'world-scale-num', setWorld, 'scale')

  document.getElementById('btn-reset-world')?.addEventListener('click', () => {
    resetWorld(); syncUI()
  })

  // ===== View 面板 =====
  bindParam('cam-dist', 'cam-dist-num', setView, 'distance')
  bindParam('cam-pitch', 'cam-pitch-num', setView, 'pitch')
  bindParam('cam-yaw', 'cam-yaw-num', setView, 'yaw')

  // 预设视角
  document.querySelectorAll('.preset').forEach(btn => {
    btn.addEventListener('click', () => applyPreset(btn.dataset.preset))
  })

  document.getElementById('btn-reset-view')?.addEventListener('click', () => {
    resetView(); syncUI()
  })

  // ===== Projection 面板 =====
  bindParam('proj-fov', 'proj-fov-num', setProjection, 'fov')
  bindParam('proj-near', 'proj-near-num', setProjection, 'near', {
    onchange: validateNearFar
  })
  bindParam('proj-far', 'proj-far-num', setProjection, 'far', {
    onchange: validateNearFar
  })

  document.querySelectorAll('[name="proj-type"]').forEach(r => {
    r.addEventListener('change', (e) => {
      setProjection('type', e.target.value)
    })
  })

  document.getElementById('proj-aspect')?.addEventListener('change', (e) => {
    setProjection('aspect', parseFloat(e.target.value))
  })

  document.getElementById('show-frustum')?.addEventListener('change', (e) => {
    setFrustumVisible(e.target.checked)
  })

  document.getElementById('btn-reset-proj')?.addEventListener('click', () => {
    resetProjection(); syncUI()
  })

  // ===== 全局重置 =====
  document.getElementById('btn-reset-all')?.addEventListener('click', () => {
    resetAll(); syncUI()
  })

  // ===== 折叠展开 =====
  document.querySelectorAll('.section-header[data-target]').forEach(header => {
    header.addEventListener('click', () => {
      const target = document.getElementById(header.dataset.target)
      if (!target) return
      const isOpen = !target.classList.contains('collapsed')
      target.classList.toggle('collapsed', isOpen)
      const toggle = header.querySelector('.section-toggle')
      if (toggle) toggle.textContent = isOpen ? '▸' : '▾'
    })
  })

  // ===== 精度切换 =====
  document.querySelectorAll('.prec-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.prec-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      setPrecision(btn.dataset.prec)
    })
  })

  // ===== 行/列主序切换 =====
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.layout-btn').forEach(b => b.classList.remove('active'))
      btn.classList.add('active')
      setLayout(btn.dataset.layout)
    })
  })

  // ===== 坐标系对照切换 =====
  document.getElementById('btn-coord-mode')?.addEventListener('click', () => {
    state.ui.coordinateMode = state.ui.coordinateMode === 'web-rh' ? 'dx11-lh' : 'web-rh'
    const hint = document.getElementById('status-hint')
    if (hint) {
      hint.textContent = state.ui.coordinateMode === 'dx11-lh'
        ? '已切换到 DX11 左手系对照显示（仅教学展示，不改变 Three.js 渲染管线）'
        : '已切换到 Web/Three.js 右手系显示'
    }
    syncUI()
    emit('any-changed')
  })

  // ===== 公式 Tab =====
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
      document.querySelectorAll('.formula-content').forEach(c => c.classList.add('hidden'))
      btn.classList.add('active')
      const target = document.getElementById(btn.dataset.tab)
      if (target) target.classList.remove('hidden')
      state.ui.activeFormulaTab = btn.dataset.tab
    })
  })

  // ===== 向 View 同步轨道控制器的拖拽结果 =====
  on('view-changed-from-orbit', (v) => {
    const setSlider = (id, val) => {
      const el = document.getElementById(id); if (el) el.value = val
    }
    const setNum = (id, val) => {
      const el = document.getElementById(id); if (el) el.value = val
    }
    setSlider('cam-dist', v.distance); setNum('cam-dist-num', v.distance)
    setSlider('cam-pitch', v.pitch);   setNum('cam-pitch-num', v.pitch)
    setSlider('cam-yaw', v.yaw);       setNum('cam-yaw-num', v.yaw)
  })

  // ===== 导入完成后同步 UI =====
  on('import-done', () => syncUI())

  // 初始值同步
  syncUI()
}

// ---- 视角预设 ----
export function applyPreset(preset) {
  const presets = {
    front: { distance: 10, pitch: 0, yaw: 0 },
    side:  { distance: 10, pitch: 0, yaw: 90 },
    top:   { distance: 10, pitch: 89, yaw: 45 },
    iso:   { distance: 10, pitch: 35, yaw: 45 }
  }
  const p = presets[preset]
  if (!p) return
  // 批量更新 state（直接写入避免三次事件）
  Object.assign(state.view, p)
  emit('view-changed', state.view)
  emit('any-changed')

  const setSlider = (id, val) => {
    const el = document.getElementById(id); if (el) el.value = val
    const num = document.getElementById(id + '-num'); if (num) num.value = val
  }
  setSlider('cam-dist', p.distance)
  setSlider('cam-pitch', p.pitch)
  setSlider('cam-yaw', p.yaw)
}

// ---- Near/Far 合法性校验 ----
function validateNearFar() {
  const near = state.projection.near
  const far  = state.projection.far
  const hint = document.getElementById('status-hint')
  if (near >= far) {
    if (hint) hint.textContent = '⚠ 近截面必须小于远截面！'
    hint && (hint.style.color = '#ff6b6b')
    // 自动修正
    const safeNear = Math.min(near, far - 0.1)
    setProjection('near', safeNear)
    const slider = document.getElementById('proj-near')
    const num    = document.getElementById('proj-near-num')
    if (slider) slider.value = safeNear
    if (num)    num.value    = safeNear
  } else {
    if (hint) { hint.textContent = '就绪'; hint.style.color = '' }
  }
}
