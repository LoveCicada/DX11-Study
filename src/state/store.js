// ===== 全局状态管理 =====
// 所有模块通过 store 共享和修改参数，使用简单发布-订阅模式

export const state = {
  // 场景对象参数
  scene: {
    modelType: 'box', // 'box' | 'sphere' | 'cylinder'
    layoutMode: 'single', // 'single' | 'multi'
    materialMode: 'solid' // 'solid' | 'normal' | 'checker' | 'wire'
  },
  // 世界矩阵参数
  world: {
    tx: 0, ty: 0, tz: 0,
    rx: 0, ry: 0, rz: 0,  // 欧拉角，单位：度
    scale: 1
  },
  // 视图矩阵参数（球坐标）
  view: {
    distance: 10,
    pitch: 25,   // 俯仰角，度
    yaw: 45      // 方位角，度
  },
  // 投影矩阵参数
  projection: {
    type: 'perspective',  // 'perspective' | 'orthographic'
    fov: 60,              // 度
    aspect: 16 / 9,
    near: 0.1,
    far: 100
  },
  // UI 状态
  ui: {
    showFrustum: true,
    matrixPrecision: 2,   // 2 | 4 | full
    matrixLayout: 'row-major', // 'row-major' | 'column-major'
    matrixFocusMode: 'full', // 'full' | 'rotation-focus'
    matrixVisible: { world: true, view: true, proj: true, mvp: true },
    coordinateMode: 'web-rh',  // 'web-rh' | 'dx11-lh'
    activeFormulaTab: 'world-formula'
  },
  // 坐标追踪点
  trackPoint: { x: 1, y: 1, z: 1 }
}

const listeners = {}

export function on(event, fn) {
  if (!listeners[event]) listeners[event] = []
  listeners[event].push(fn)
}

export function off(event, fn) {
  if (listeners[event]) {
    listeners[event] = listeners[event].filter(f => f !== fn)
  }
}

export function emit(event, data) {
  if (listeners[event]) {
    listeners[event].forEach(fn => fn(data))
  }
}

// 修改 world 参数并派发
export function setWorld(key, value) {
  state.world[key] = value
  emit('world-changed', state.world)
  emit('any-changed')
}

export function setScene(key, value) {
  state.scene[key] = value
  emit('scene-changed', state.scene)
  emit('any-changed')
}

export function setTrackPoint(point) {
  Object.assign(state.trackPoint, point)
  emit('track-point-changed', state.trackPoint)
  emit('any-changed')
}

// 修改 view 参数并派发
export function setView(key, value) {
  state.view[key] = value
  emit('view-changed', state.view)
  emit('any-changed')
}

// 修改 projection 参数并派发
export function setProjection(key, value) {
  state.projection[key] = value
  emit('projection-changed', state.projection)
  emit('any-changed')
}

export function resetWorld() {
  Object.assign(state.world, { tx: 0, ty: 0, tz: 0, rx: 0, ry: 0, rz: 0, scale: 1 })
  emit('world-changed', state.world)
  emit('any-changed')
  emit('reset-world')
}

export function resetView() {
  Object.assign(state.view, { distance: 10, pitch: 25, yaw: 45 })
  emit('view-changed', state.view)
  emit('any-changed')
  emit('reset-view')
}

export function resetProjection() {
  Object.assign(state.projection, { type: 'perspective', fov: 60, aspect: 16/9, near: 0.1, far: 100 })
  emit('projection-changed', state.projection)
  emit('any-changed')
  emit('reset-projection')
}

export function resetAll() {
  resetWorld()
  resetView()
  resetProjection()
}

export function exportState() {
  return JSON.stringify({ scene: state.scene, world: state.world, view: state.view, projection: state.projection, trackPoint: state.trackPoint }, null, 2)
}

export function importState(jsonStr) {
  try {
    const data = JSON.parse(jsonStr)
    if (data.scene) Object.assign(state.scene, data.scene)
    if (data.world) Object.assign(state.world, data.world)
    if (data.view) Object.assign(state.view, data.view)
    if (data.projection) Object.assign(state.projection, data.projection)
    emit('scene-changed', state.scene)
    emit('world-changed', state.world)
    emit('view-changed', state.view)
    emit('projection-changed', state.projection)
    if (data.trackPoint) Object.assign(state.trackPoint, data.trackPoint)
    emit('track-point-changed', state.trackPoint)
    emit('any-changed')
    emit('import-done')
    return true
  } catch(e) {
    console.error('参数导入失败', e)
    return false
  }
}
