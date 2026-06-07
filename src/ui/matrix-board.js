// ===== 矩阵看板 =====
// 渲染 World / View / Projection / MVP 四个 4x4 矩阵格子，支持精度切换和变化高亮

import { buildDisplayMatrices, matrixToRows, matrixToColumns } from '../engine/transforms.js'
import { state, on } from '../state/store.js'

let prevWorld = null
let prevView  = null
let prevProj  = null
let prevMVP   = null

export function initMatrixBoard() {
  on('any-changed', updateMatrixBoard)
  updateMatrixBoard()
}

export function updateMatrixBoard() {
  const mats = buildDisplayMatrices()
  const toGrid = state.ui.matrixLayout === 'column-major' ? matrixToColumns : matrixToRows

  const worldRows = toGrid(mats.world)
  const viewRows = toGrid(mats.view)
  const projRows = toGrid(mats.proj)
  const mvpRows = toGrid(mats.mvp)

  renderMatrix('mat-world-grid', worldRows, prevWorld)
  renderMatrix('mat-view-grid',  viewRows,  prevView)
  renderMatrix('mat-proj-grid',  projRows,  prevProj)
  renderMatrix('mat-mvp-grid',   mvpRows,   prevMVP)

  prevWorld = worldRows
  prevView  = viewRows
  prevProj  = projRows
  prevMVP   = mvpRows
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
