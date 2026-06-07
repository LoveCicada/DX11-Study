// ===== Three.js 场景核心 =====

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { state, on, emit } from '../state/store.js'
import { buildWorldMatrix, buildProjectionMatrix, getCameraPosition } from './transforms.js'

let renderer, scene, camera, controls
let mainMesh, localAxesHelper, worldAxesHelper, gridHelper
let frameCount = 0, lastTime = performance.now()

export function initScene(canvas) {
  // ---- Renderer ----
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.setClearColor(0x1a1a2e)
  renderer.shadowMap.enabled = true

  // ---- Scene ----
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x1a1a2e, 0.015)

  // ---- Camera ----
  camera = new THREE.PerspectiveCamera(
    state.projection.fov,
    state.projection.aspect,
    state.projection.near,
    state.projection.far
  )
  syncCameraFromState()

  // ---- Lights ----
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
  dirLight.position.set(5, 10, 5)
  dirLight.castShadow = true
  scene.add(dirLight)

  // ---- World Grid ----
  gridHelper = new THREE.GridHelper(20, 20, 0x444466, 0x333355)
  scene.add(gridHelper)

  // ---- World Axes ----
  worldAxesHelper = buildAxesHelper(3, 0.04)
  scene.add(worldAxesHelper)

  // ---- Main Object: 立方体 ----
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshLambertMaterial({
    color: 0x4a90d9,
    emissive: 0x1a3a5c,
    transparent: true,
    opacity: 0.9,
  })
  mainMesh = new THREE.Mesh(geometry, material)
  mainMesh.castShadow = true
  scene.add(mainMesh)

  // ---- Wireframe overlay ----
  const wfGeo = new THREE.EdgesGeometry(geometry)
  const wfMat = new THREE.LineBasicMaterial({ color: 0x88ccff })
  const wireframe = new THREE.LineSegments(wfGeo, wfMat)
  mainMesh.add(wireframe)

  // ---- 模型自身坐标系（Local Axes，跟随模型变换） ----
  localAxesHelper = buildAxesHelper(1.2, 0.03)
  mainMesh.add(localAxesHelper)

  // ---- Orbit Controls ----
  controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.minDistance = 2
  controls.maxDistance = 50
  controls.addEventListener('change', () => {
    // 从 camera 球坐标反算，更新 state.view（禁止再触发 camera 更新，防死循环）
    const pos = camera.position
    const dist = pos.length()
    const pitch = Math.asin(pos.y / dist) / (Math.PI / 180)
    const yaw = Math.atan2(pos.x, pos.z) / (Math.PI / 180)
    state.view.distance = parseFloat(dist.toFixed(2))
    state.view.pitch = parseFloat(pitch.toFixed(1))
    state.view.yaw = parseFloat(yaw.toFixed(1))
    // 不调用 setView 避免循环，只触发 UI 同步事件
    emit('view-changed-from-orbit', state.view)
  })

  // ---- 响应状态变化 ----
  on('world-changed', () => applyWorldTransform())
  on('view-changed', () => syncCameraFromState())
  on('projection-changed', () => syncProjectionFromState())
  on('reset-world', () => applyWorldTransform())

  // ---- 首次应用 ----
  applyWorldTransform()
  resize()
  window.addEventListener('resize', resize)

  // ---- 渲染循环 ----
  animate()

  return { renderer, scene, camera, controls, mainMesh }
}

function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
  updateFPS()
}

function updateFPS() {
  frameCount++
  const now = performance.now()
  if (now - lastTime > 1000) {
    const fps = Math.round(frameCount * 1000 / (now - lastTime))
    document.getElementById('status-fps').textContent = fps + ' FPS'
    frameCount = 0
    lastTime = now
  }
}

function resize() {
  const vp = document.getElementById('viewport')
  const w = vp.clientWidth
  const h = vp.clientHeight
  renderer.setSize(w, h)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function applyWorldTransform() {
  const M = buildWorldMatrix()
  mainMesh.matrixAutoUpdate = false
  mainMesh.matrix.copy(M)
  mainMesh.matrixWorldNeedsUpdate = true
}

function syncCameraFromState() {
  const pos = getCameraPosition()
  camera.position.copy(pos)
  camera.lookAt(0, 0, 0)
  // 同步 OrbitControls target
  if (controls) {
    controls.target.set(0, 0, 0)
    controls.update()
  }
}

function syncProjectionFromState() {
  const { type, fov, aspect, near, far } = state.projection
  camera.near = near
  camera.far = far
  camera.fov = fov
  camera.aspect = aspect

  if (type === 'perspective') {
    camera.updateProjectionMatrix()
  } else {
    // 正交模式：直接注入计算好的投影矩阵
    const dist = state.view.distance
    const halfH = Math.tan(fov * Math.PI / 360) * dist
    const halfW = halfH * aspect
    const orthoMat = new THREE.Matrix4()
    orthoMat.makeOrthographic(-halfW, halfW, halfH, -halfH, near, far)
    camera.projectionMatrix.copy(orthoMat)
    camera.projectionMatrixInverse.copy(orthoMat).invert()
  }

  const badge = document.getElementById('viewport-mode-badge')
  if (badge) badge.textContent = type === 'perspective' ? '透视投影' : '正交投影'
}

// ---- 辅助：构建带颜色的坐标轴（自定义，比 AxesHelper 更粗） ----
function buildAxesHelper(size, lineWidth) {
  const group = new THREE.Group()
  const axes = [
    { dir: [1,0,0], color: 0xff4444, label: 'X' },
    { dir: [0,1,0], color: 0x44ff44, label: 'Y' },
    { dir: [0,0,1], color: 0x4444ff, label: 'Z' }
  ]
  axes.forEach(a => {
    const points = [
      new THREE.Vector3(0,0,0),
      new THREE.Vector3(...a.dir).multiplyScalar(size)
    ]
    const geo = new THREE.BufferGeometry().setFromPoints(points)
    const mat = new THREE.LineBasicMaterial({ color: a.color })
    const line = new THREE.Line(geo, mat)
    group.add(line)

    // 锥形箭头
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(lineWidth * 3, size * 0.12, 8),
      new THREE.MeshBasicMaterial({ color: a.color })
    )
    const end = new THREE.Vector3(...a.dir).multiplyScalar(size)
    cone.position.copy(end)
    // 让锥尖朝向轴方向
    if (a.dir[1] === 0) {
      cone.rotation.z = a.dir[0] !== 0 ? Math.PI / 2 * (a.dir[0] > 0 ? 1 : -1) : 0
      if (a.dir[2] !== 0) cone.rotation.x = Math.PI / 2 * (a.dir[2] > 0 ? -1 : 1)
    }
    group.add(cone)
  })
  return group
}

export function getScene()    { return scene }
export function getCamera()   { return camera }
export function getRenderer() { return renderer }
export function getControls() { return controls }
export function getMainMesh() { return mainMesh }
