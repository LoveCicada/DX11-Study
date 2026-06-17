// ===== 矩阵看板 =====
// 渲染 World / View / Projection / MVP 四个 4x4 矩阵格子，支持精度切换和变化高亮

import { buildDisplayMatrices, matrixToRows, matrixToColumns } from '../engine/transforms.js'
import { state, on, emit } from '../state/store.js'

let prevWorld = null
let prevView  = null
let prevProj  = null
let prevMVP   = null
let prevManualVisible = null

const MATRIX_KEYS = ['world', 'view', 'proj', 'mvp']
const MATRIX_BLOCK_IDS = {
  world: 'mat-world',
  view: 'mat-view',
  proj: 'mat-proj',
  mvp: 'mat-mvp'
}

export function initMatrixBoard() {
  ensureMatrixUiState()
  bindMatrixVisibilityControls()
  bindMatrixFocusToggle()
  on('any-changed', updateMatrixBoard)
  updateMatrixBoard()
}

export function updateMatrixBoard() {
  ensureMatrixUiState()
  const mats = buildDisplayMatrices()
  const toGrid = state.ui.matrixLayout === 'column-major' ? matrixToColumns : matrixToRows
  const worldSemanticRows = matrixToRows(mats.world)

  const worldRows = toGrid(mats.world)
  const viewRows = toGrid(mats.view)
  const projRows = toGrid(mats.proj)
  const mvpRows = toGrid(mats.mvp)

  renderMatrix('mat-world-grid', worldRows, prevWorld)
  renderMatrix('mat-view-grid',  viewRows,  prevView)
  renderMatrix('mat-proj-grid',  projRows,  prevProj)
  renderMatrix('mat-mvp-grid',   mvpRows,   prevMVP)

  applyMatrixVisibility()
  updateMatrixControlUI()
  updateWorldRotationHint(worldSemanticRows)

  prevWorld = worldRows
  prevView  = viewRows
  prevProj  = projRows
  prevMVP   = mvpRows
}

function ensureMatrixUiState() {
  if (!state.ui.matrixVisible) {
    state.ui.matrixVisible = { world: true, view: true, proj: true, mvp: true }
  }
  if (!state.ui.matrixFocusMode) {
    state.ui.matrixFocusMode = 'full'
  }
}

function bindMatrixVisibilityControls() {
  document.querySelectorAll('[data-mat-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (state.ui.matrixFocusMode === 'rotation-focus') return

      const key = btn.dataset.matToggle
      if (!MATRIX_KEYS.includes(key)) return

      state.ui.matrixVisible[key] = !state.ui.matrixVisible[key]
      const visibleCount = MATRIX_KEYS.filter((k) => state.ui.matrixVisible[k]).length

      if (visibleCount === 0) {
        state.ui.matrixVisible[key] = true
      }

      emit('any-changed')
    })
  })
}

function bindMatrixFocusToggle() {
  document.getElementById('btn-matrix-focus')?.addEventListener('click', () => {
    if (state.ui.matrixFocusMode === 'full') {
      prevManualVisible = { ...state.ui.matrixVisible }
      state.ui.matrixFocusMode = 'rotation-focus'
      state.ui.matrixVisible = { world: true, view: false, proj: false, mvp: false }
    } else {
      state.ui.matrixFocusMode = 'full'
      state.ui.matrixVisible = prevManualVisible ?? { world: true, view: true, proj: true, mvp: true }
    }
    emit('any-changed')
  })
}

function applyMatrixVisibility() {
  MATRIX_KEYS.forEach((key) => {
    const id = MATRIX_BLOCK_IDS[key]
    const block = document.getElementById(id)
    if (!block) return
    block.classList.toggle('matrix-block-hidden', !state.ui.matrixVisible[key])
  })
}

function updateMatrixControlUI() {
  const inFocusMode = state.ui.matrixFocusMode === 'rotation-focus'
  const focusBtn = document.getElementById('btn-matrix-focus')
  if (focusBtn) {
    focusBtn.textContent = inFocusMode ? '旋转观察' : '完整模式'
    focusBtn.classList.toggle('active', inFocusMode)
  }

  document.querySelectorAll('[data-mat-toggle]').forEach((btn) => {
    const key = btn.dataset.matToggle
    const visible = !!state.ui.matrixVisible[key]
    btn.classList.toggle('active', visible)
    btn.disabled = inFocusMode
  })
}

function updateWorldRotationHint(worldRows) {
  const note = document.getElementById('world-highlight-note')
  if (!note) return

  const rxOn = Math.abs(state.world.rx) > 1e-3
  const ryOn = Math.abs(state.world.ry) > 1e-3
  const rzOn = Math.abs(state.world.rz) > 1e-3
  const activeAxisCount = [rxOn, ryOn, rzOn].filter(Boolean).length

  if (activeAxisCount === 0) {
    note.textContent = '提示：旋转为 0° 时，左上 3×3 更接近单位矩阵；开始旋转后这些值会变化。'
    return
  }

  const a00 = worldRows[0][0]
  const a02 = worldRows[0][2]
  const a10 = worldRows[1][0]
  const a11 = worldRows[1][1]
  const a12 = worldRows[1][2]
  const a20 = worldRows[2][0]
  const a21 = worldRows[2][1]
  const a22 = worldRows[2][2]

  if (activeAxisCount === 1 && ryOn) {
    note.textContent = `当前主要是 Yaw（绕 Y 轴）旋转：主要影响 X-Z 平面项，例如 [0,0]=${fmt(a00)}、[0,2]=${fmt(a02)}、[2,0]=${fmt(a20)}、[2,2]=${fmt(a22)}。`
    return
  }

  if (activeAxisCount === 1 && rxOn) {
    note.textContent = `当前主要是 Pitch（绕 X 轴）旋转：主要影响 Y-Z 平面项，例如 [1,1]=${fmt(a11)}、[1,2]=${fmt(a12)}、[2,1]=${fmt(a21)}、[2,2]=${fmt(a22)}。`
    return
  }

  if (activeAxisCount === 1 && rzOn) {
    note.textContent = `当前主要是 Roll（绕 Z 轴）旋转：主要影响 X-Y 平面项，例如 [0,0]=${fmt(a00)}、[0,1]=${fmt(worldRows[0][1])}、[1,0]=${fmt(a10)}、[1,1]=${fmt(a11)}。`
    return
  }

  note.textContent = `当前存在多轴组合旋转：左上 3×3 的多个平面项会同时变化（例如 ${fmt(a00)} / ${fmt(a02)} / ${fmt(a20)} / ${fmt(a22)}），它们共同描述局部坐标轴在世界空间中的方向变化。`
}

function fmt(v) {
  if (Math.abs(v) < 1e-8) return '0'
  return v.toFixed(2)
}

function renderMatrix(containerId, rows, prevRows) {
  const el = document.getElementById(containerId)
  if (!el) return

  el.innerHTML = ''
  el.style.gridTemplateColumns = 'repeat(4, 1fr)'

  rows.forEach((row, ri) => {
    row.forEach((val, ci) => {
      const cell = document.createElement('div')
      cell.className = 'mat-cell'
      cell.textContent = formatValue(val)

      // 检测变化，高亮
      if (prevRows) {
        const prev = prevRows[ri][ci]
        if (Math.abs(val - prev) > 1e-6) {
          cell.classList.add('mat-cell-changed')
          // 200ms 后移除高亮
          setTimeout(() => cell.classList.remove('mat-cell-changed'), 500)
        }
      }
      el.appendChild(cell)
    })
  })
}

function formatValue(v) {
  const prec = state.ui.matrixPrecision
  if (prec === 'full') return v.toPrecision(6)
  const d = parseInt(prec)
  if (Math.abs(v) < 1e-8) return '0'
  return v.toFixed(d)
}

export function setPrecision(prec) {
  state.ui.matrixPrecision = prec
  updateMatrixBoard()
}

export function setLayout(layout) {
  state.ui.matrixLayout = layout
  updateMatrixBoard()
}
