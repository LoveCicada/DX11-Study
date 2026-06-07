// ===== 坐标追踪面板 =====

import { tracePoint, convertTraceForDisplay } from '../engine/transforms.js'
import { state } from '../state/store.js'
import { on } from '../state/store.js'

export function initCoordinateTracker() {
  const btn = document.getElementById('btn-track')
  if (btn) btn.addEventListener('click', runTrack)

  // 任何矩阵变化时实时更新追踪结果（如果有追踪点）
  on('any-changed', () => {
    const result = document.getElementById('tracker-result')
    if (result && result.innerHTML.trim() !== '') {
      runTrack()
    }
  })
}

function runTrack() {
  const x = parseFloat(document.getElementById('track-x')?.value ?? 1)
  const y = parseFloat(document.getElementById('track-y')?.value ?? 1)
  const z = parseFloat(document.getElementById('track-z')?.value ?? 1)

  const result = convertTraceForDisplay(tracePoint(x, y, z))
  renderTrackerResult(result)
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
