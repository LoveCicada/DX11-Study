// ===== 矩阵计算层 =====
// 所有矩阵运算均使用 Three.js Matrix4，保持和 Three.js 内部一致
// Three.js 使用列主序（column-major），右手坐标系，Y 轴朝上

import * as THREE from 'three'
import { state } from '../state/store.js'

const DEG2RAD = Math.PI / 180
const RH_TO_LH = new THREE.Matrix4().set(
  1, 0,  0, 0,
  0, 1,  0, 0,
  0, 0, -1, 0,
  0, 0,  0, 1
)

// OpenGL/WebGL NDC z[-1,1] -> DX11 NDC z[0,1]
const GL_TO_DX_DEPTH = new THREE.Matrix4().set(
  1, 0,   0, 0,
  0, 1,   0, 0,
  0, 0, 0.5, 0.5,
  0, 0,   0, 1
)

/**
 * 根据当前 state.world 计算世界矩阵
 * 顺序：M_W = T * R_Y * R_X * R_Z * S
 */
export function buildWorldMatrix() {
  const { tx, ty, tz, rx, ry, rz, scale } = state.world

  const T = new THREE.Matrix4().makeTranslation(tx, ty, tz)
  const RX = new THREE.Matrix4().makeRotationX(rx * DEG2RAD)
  const RY = new THREE.Matrix4().makeRotationY(ry * DEG2RAD)
  const RZ = new THREE.Matrix4().makeRotationZ(rz * DEG2RAD)
  const S = new THREE.Matrix4().makeScale(scale, scale, scale)

  // M_W = T * RY * RX * RZ * S
  const M = T.clone()
  M.multiply(RY).multiply(RX).multiply(RZ).multiply(S)
  return M
}

/**
 * 根据 state.view 球坐标计算相机位置（欧拉→直角坐标）
 */
export function getCameraPosition() {
  const { distance, pitch, yaw } = state.view
  const p = pitch * DEG2RAD
  const y = yaw * DEG2RAD
  return new THREE.Vector3(
    distance * Math.cos(p) * Math.sin(y),
    distance * Math.sin(p),
    distance * Math.cos(p) * Math.cos(y)
  )
}

/**
 * 构建视图矩阵（LookAt）
 * eye = 相机位置，target = 原点，up = Y 轴
 */
export function buildViewMatrix() {
  const eye = getCameraPosition()
  const target = new THREE.Vector3(0, 0, 0)
  const up = new THREE.Vector3(0, 1, 0)

  // 构建相机世界矩阵：旋转朝向 + 平移到 eye
  const cameraWorld = new THREE.Matrix4()
  cameraWorld.lookAt(eye, target, up)  // 仅旋转部分
  cameraWorld.setPosition(eye)         // 加入平移

  // View = inverse(CameraWorldMatrix)
  return cameraWorld.invert()
}

/**
 * 构建投影矩阵
 */
export function buildProjectionMatrix() {
  const { type, fov, aspect, near, far } = state.projection
  const mat = new THREE.Matrix4()
  if (type === 'perspective') {
    // Three.js makePerspective(left, right, top, bottom, near, far)
    const halfY = Math.tan(fov * DEG2RAD / 2) * near
    const halfX = halfY * aspect
    mat.makePerspective(-halfX, halfX, halfY, -halfY, near, far)
  } else {
    // 正交：宽度根据相机距离动态调整
    const dist = state.view.distance
    const ow = dist * Math.tan(fov * DEG2RAD / 2)
    const oh = ow / aspect
    mat.makeOrthographic(-ow, ow, oh, -oh, near, far)
  }
  return mat
}

/**
 * 计算 MVP = P * V * W
 */
export function buildMVP(world, view, proj) {
  const mvp = proj.clone()
  mvp.multiply(view).multiply(world)
  return mvp
}

/**
 * 返回用于展示的矩阵（支持 DX11 对照模式）
 * 注意：该转换用于教学展示，不改动 Three.js 实际渲染管线。
 */
export function buildDisplayMatrices() {
  const world = buildWorldMatrix()
  const view = buildViewMatrix()
  const proj = buildProjectionMatrix()

  if (state.ui.coordinateMode !== 'dx11-lh') {
    return { world, view, proj, mvp: buildMVP(world, view, proj) }
  }

  // 仿射矩阵用 C * M * C 做 RH/LH 对照
  const worldDx = RH_TO_LH.clone().multiply(world).multiply(RH_TO_LH)
  const viewDx = RH_TO_LH.clone().multiply(view).multiply(RH_TO_LH)

  // 投影在对照时额外做深度范围映射
  const projDx = GL_TO_DX_DEPTH.clone().multiply(proj).multiply(RH_TO_LH)
  const mvpDx = buildMVP(worldDx, viewDx, projDx)

  return { world: worldDx, view: viewDx, proj: projDx, mvp: mvpDx }
}

/**
 * 将 Matrix4 转成易读的二维数组（row-major 排列，用于显示）
 * Three.js 内部是列主序存储，这里转成行主序方便视觉理解
 */
export function matrixToRows(mat) {
  const e = mat.elements  // 列主序
  return [
    [e[0], e[4], e[8],  e[12]],
    [e[1], e[5], e[9],  e[13]],
    [e[2], e[6], e[10], e[14]],
    [e[3], e[7], e[11], e[15]]
  ]
}

/**
 * 将 Matrix4 以列主序可视化（直接按内存列主序分块显示）
 */
export function matrixToColumns(mat) {
  const e = mat.elements
  return [
    [e[0], e[1], e[2], e[3]],
    [e[4], e[5], e[6], e[7]],
    [e[8], e[9], e[10], e[11]],
    [e[12], e[13], e[14], e[15]]
  ]
}

/**
 * 对坐标追踪结果做模式转换展示
 */
export function convertTraceForDisplay(trace) {
  if (state.ui.coordinateMode !== 'dx11-lh') return trace

  const flip = (v) => ({ ...v, z: -v.z })
  const ndcDx = {
    x: trace.ndc.x,
    y: trace.ndc.y,
    z: isNaN(trace.ndc.z) ? NaN : 0.5 * (trace.ndc.z + 1)
  }

  return {
    ...trace,
    model: flip(trace.model),
    world: flip(trace.world),
    view: flip(trace.view),
    clip: flip(trace.clip),
    ndc: ndcDx
  }
}

/**
 * 追踪点经过完整变换链的各空间坐标
 */
export function tracePoint(px, py, pz) {
  const world  = buildWorldMatrix()
  const view   = buildViewMatrix()
  const proj   = buildProjectionMatrix()

  const pModel = new THREE.Vector4(px, py, pz, 1)

  // 世界空间
  const pWorld = pModel.clone().applyMatrix4(world)

  // 相机空间
  const pView = pWorld.clone().applyMatrix4(view)

  // 裁剪空间
  const pClip = pView.clone().applyMatrix4(proj)

  // NDC（透视除法）
  const w = pClip.w
  const pNDC = (Math.abs(w) > 1e-8)
    ? { x: pClip.x / w, y: pClip.y / w, z: pClip.z / w }
    : { x: NaN, y: NaN, z: NaN }

  return {
    model: { x: px, y: py, z: pz, w: 1 },
    world: vec4ToObj(pWorld),
    view:  vec4ToObj(pView),
    clip:  vec4ToObj(pClip),
    ndc:   pNDC
  }
}

function vec4ToObj(v) {
  return { x: v.x, y: v.y, z: v.z, w: v.w }
}
