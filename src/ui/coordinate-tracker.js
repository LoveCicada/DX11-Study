// ===== 坐标追踪面板 =====

import { tracePoint, convertTraceForDisplay } from '../engine/transforms.js'
import { state, on, setTrackPoint } from '../state/store.js'

const MODEL_TRACK_POINTS = {
  box: [
    { key: 'corner', button: '角点', label: '立方体前上右角 (0.5, 0.5, 0.5)', point: { x: 0.5, y: 0.5, z: 0.5 } },
    { key: 'face', button: '面心', label: '立方体前表面中心 (0, 0, 0.5)', point: { x: 0, y: 0, z: 0.5 } },
    { key: 'edge', button: '边点', label: '立方体上前边中点 (0, 0.5, 0.5)', point: { x: 0, y: 0.5, z: 0.5 } }
  ],
  sphere: [
    { key: 'top', button: '顶部', label: '球体顶部 (0, 0.75, 0)', point: { x: 0, y: 0.75, z: 0 } },
    { key: 'front', button: '前极', label: '球体前极点 (0, 0, 0.75)', point: { x: 0, y: 0, z: 0.75 } },
    { key: 'diag', button: '斜向', label: '球体斜向点 (0.43, 0.43, 0.43)', point: { x: 0.43, y: 0.43, z: 0.43 } }
  ],
  cylinder: [
    { key: 'rim', button: '边缘', label: '圆柱上边缘 (0.65, 0.8, 0)', point: { x: 0.65, y: 0.8, z: 0 } },
    { key: 'cap', button: '顶心', label: '圆柱顶面中心 (0, 0.8, 0)', point: { x: 0, y: 0.8, z: 0 } },
    { key: 'side', button: '侧面', label: '圆柱侧面中点 (0.65, 0, 0)', point: { x: 0.65, y: 0, z: 0 } }
  ]
}

let activePresetKey = ''

export function initCoordinateTracker() {
  const btn = document.getElementById('btn-track')
  if (btn) btn.addEventListener('click', runTrack)

  document.getElementById('btn-track-suggested')?.addEventListener('click', () => {
    applySuggestedPoint('default')
  })

  ;['track-x', 'track-y', 'track-z'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', syncPointFromInputs)
  })

  // 任何矩阵变化时实时更新追踪结果（如果有追踪点）
  on('any-changed', () => {
    const result = document.getElementById('tracker-result')
    if (result && result.innerHTML.trim() !== '') {
      runTrack()
    }
  })

  on('scene-changed', () => {
    renderPresetButtons()
    applySuggestedPoint('default')
  })
  on('track-point-changed', () => {
    syncInputsFromState()
    syncPresetSelection()
  })

  renderPresetButtons()
  applySuggestedPoint('default')
}

function runTrack() {
  const x = parseFloat(document.getElementById('track-x')?.value ?? state.trackPoint.x)
  const y = parseFloat(document.getElementById('track-y')?.value ?? state.trackPoint.y)
  const z = parseFloat(document.getElementById('track-z')?.value ?? state.trackPoint.z)

  const result = convertTraceForDisplay(tracePoint(x, y, z))
  renderTrackerResult(result)
}

function applySuggestedPoint(modeOrKey) {
  const presets = getCurrentPresets()
  const nextPreset = modeOrKey === 'default'
    ? presets[0]
    : presets.find((preset) => preset.key === modeOrKey) ?? presets[0]

  if (!nextPreset) return

  activePresetKey = nextPreset.key
  setTrackPoint(nextPreset.point)
  renderSuggestedLabel(`当前预置: ${nextPreset.label}`)
}

function syncPointFromInputs() {
  const x = parseFloat(document.getElementById('track-x')?.value ?? state.trackPoint.x)
  const y = parseFloat(document.getElementById('track-y')?.value ?? state.trackPoint.y)
  const z = parseFloat(document.getElementById('track-z')?.value ?? state.trackPoint.z)
  activePresetKey = ''
  renderSuggestedLabel('当前预置: 自定义输入点')
  setTrackPoint({ x, y, z })
}

function syncInputsFromState() {
  const { x, y, z } = state.trackPoint
  const setValue = (id, value) => {
    const el = document.getElementById(id)
    if (el) el.value = value
  }
  setValue('track-x', x)
  setValue('track-y', y)
  setValue('track-z', z)
}

function renderSuggestedLabel(label) {
  const el = document.getElementById('tracker-point-label')
  if (el) el.textContent = label
}

function renderPresetButtons() {
  const container = document.getElementById('tracker-presets')
  if (!container) return

  const presets = getCurrentPresets()
  container.innerHTML = presets.map((preset) => `
    <button class="btn-sm tracker-preset-btn${preset.key === activePresetKey ? ' active' : ''}" data-track-preset="${preset.key}">${preset.button}</button>
  `).join('')

  container.querySelectorAll('[data-track-preset]').forEach((btn) => {
    btn.addEventListener('click', () => applySuggestedPoint(btn.dataset.trackPreset))
  })
}

function syncPresetSelection() {
  document.querySelectorAll('.tracker-preset-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.trackPreset === activePresetKey)
  })
}

function getCurrentPresets() {
  return MODEL_TRACK_POINTS[state.scene.modelType] ?? MODEL_TRACK_POINTS.box
}


function fmt(v) {
  if (v === undefined || v === null || isNaN(v)) return '<span class="nan">超过裁剪范围</span>'
  return v.toFixed(3)
}

function fmtV4(v) {
  return `(${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)}, ${fmt(v.w)})`
}

function fmtV3(v) {
  return `(${fmt(v.x)}, ${fmt(v.y)}, ${fmt(v.z)})`
}

function renderTrackerResult(r) {
  const el = document.getElementById('tracker-result')
  if (!el) return

  const rows = [
    { label: '模型空间', color: '#cccccc', vec: fmtV4(r.model), note: 'P_model (输入)' },
    { label: '世界空间', color: '#ff6b6b', vec: fmtV4(r.world), note: '= M_W × P_model' },
    { label: '相机空间', color: '#4ecdc4', vec: fmtV4(r.view),  note: '= M_V × P_world' },
    { label: '裁剪空间', color: '#f7b731', vec: fmtV4(r.clip),  note: '= M_P × P_view' },
    { label: 'NDC',      color: '#a55eea', vec: fmtV3(r.ndc),   note: '= P_clip / w' },
  ]

  el.innerHTML = rows.map(row => `
    <div class="tracker-row">
      <div class="tracker-space" style="color:${row.color}">${row.label}</div>
      <div class="tracker-vec">${row.vec}</div>
      <div class="tracker-note">${row.note}</div>
    </div>
  `).join('<div class="tracker-arrow">↓</div>')
}
