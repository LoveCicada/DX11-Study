// ===== 导入 / 导出 =====

import { exportState, importState } from '../state/store.js'

export function initIO() {
  document.getElementById('btn-export')?.addEventListener('click', doExport)

  const fileInput = document.getElementById('file-import')
  document.getElementById('btn-import')?.addEventListener('click', () => {
    fileInput?.click()
  })
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const ok = importState(ev.target.result)
      const hint = document.getElementById('status-hint')
      if (hint) {
        hint.textContent = ok ? '参数导入成功 ✓' : '导入失败：JSON 格式错误'
        hint.style.color = ok ? '#44ff44' : '#ff6b6b'
        setTimeout(() => { hint.textContent = '就绪'; hint.style.color = '' }, 2000)
      }
    }
    reader.readAsText(file)
    // 重置 input 以便再次选同一文件
    fileInput.value = ''
  })
}

function doExport() {
  const json = exportState()
  const blob = new Blob([json], { type: 'application/json' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = 'dx11-params.json'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
