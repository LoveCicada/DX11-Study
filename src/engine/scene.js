// ===== Three.js 场景核心 =====

import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { state, on, emit } from '../state/store.js'
import { buildWorldMatrix, buildProjectionMatrix, getCameraPosition } from './transforms.js'

let renderer, scene, camera, controls
let mainMesh, localAxesHelper, worldAxesHelper, gridHelper, wireframe
let mainBundle
let companionBundles = []
let frameCount = 0, lastTime = performance.now()
let checkerTexture

const DEG2RAD = Math.PI / 180

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
  worldAxesHelper = buildAxesHelper(3, 0.05, 'WORLD', 0x6bdcff, {
    lineOpacity: 1,
    coneOpacity: 1,
    labelOpacity: 1,
    noteText: '固定在世界原点'
  })
  scene.add(worldAxesHelper)

  // ---- Main Object ----
  mainBundle = createModelBundle({
    color: 0x4a90d9,
    emissive: 0x1a3a5c,
    wireColor: 0x88ccff,
    opacity: 0.9
  })
  ;({ mesh: mainMesh, wireframe } = mainBundle)
  scene.add(mainMesh)

  companionBundles = [
    createModelBundle({ color: 0x38b889, emissive: 0x173c31, wireColor: 0x72f2c6, opacity: 0.82 }),
    createModelBundle({ color: 0xd98c3f, emissive: 0x4f2e12, wireColor: 0xffc178, opacity: 0.82 })
  ]
  companionBundles.forEach(({ mesh }) => scene.add(mesh))

  // ---- 模型自身坐标系（Local Axes，跟随模型变换） ----
  localAxesHelper = buildAxesHelper(1.2, 0.02, 'LOCAL', 0xffc178, {
    lineOpacity: 0.62,
    coneOpacity: 0.7,
    labelOpacity: 0.86,
    noteText: '随模型移动'
  })
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
  on('scene-changed', () => applySceneSettings())
  on('reset-world', () => applyWorldTransform())

  // ---- 首次应用 ----
  applySceneLayout()
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
  applyMeshMatrix(mainMesh, M)

  const companionWorlds = buildCompanionWorldMatrices(M)
  companionBundles.forEach((bundle, index) => {
    applyMeshMatrix(bundle.mesh, companionWorlds[index])
  })
}

function applySceneSettings() {
  applyModelType()
  applyMaterialMode()
  applySceneLayout()
}

function applyModelType() {
  const nextGeometry = buildModelGeometry(state.scene.modelType)

  replaceBundleGeometry(mainBundle, nextGeometry, mainBundle.wireColor)
  companionBundles.forEach((bundle) => {
    replaceBundleGeometry(bundle, buildModelGeometry(state.scene.modelType), bundle.wireColor)
  })

  mainMesh = mainBundle.mesh
  wireframe = mainBundle.wireframe
  applyWorldTransform()
}

function applyMaterialMode() {
  ;[mainBundle, ...companionBundles].forEach((bundle) => {
    if (!bundle) return

    if (bundle.mesh.material) bundle.mesh.material.dispose()
    bundle.mesh.material = buildDisplayMaterial(bundle.appearance)

    if (bundle.wireframe) {
      bundle.wireframe.visible = state.scene.materialMode !== 'wire'
    }
  })
}

function applySceneLayout() {
  const multi = state.scene.layoutMode === 'multi'
  companionBundles.forEach(({ mesh }) => {
    mesh.visible = multi
  })
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

function buildModelGeometry(modelType) {
  switch (modelType) {
    case 'sphere':
      return new THREE.SphereGeometry(0.75, 32, 24)
    case 'cylinder':
      return new THREE.CylinderGeometry(0.65, 0.65, 1.6, 32, 1)
    case 'box':
    default:
      return new THREE.BoxGeometry(1, 1, 1)
  }
}

function createModelBundle({ color, emissive, wireColor, opacity }) {
  const appearance = { color, emissive, opacity }
  const material = buildDisplayMaterial(appearance)
  const mesh = new THREE.Mesh(buildModelGeometry(state.scene.modelType), material)
  mesh.castShadow = true

  const nextWireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(mesh.geometry),
    new THREE.LineBasicMaterial({ color: wireColor })
  )
  mesh.add(nextWireframe)

  return { mesh, wireframe: nextWireframe, wireColor, appearance }
}

function replaceBundleGeometry(bundle, nextGeometry, wireColor) {
  const prevGeometry = bundle.mesh.geometry
  bundle.mesh.geometry = nextGeometry
  prevGeometry.dispose()

  if (bundle.wireframe) {
    bundle.mesh.remove(bundle.wireframe)
    bundle.wireframe.geometry.dispose()
    bundle.wireframe.material.dispose()
  }

  bundle.wireframe = new THREE.LineSegments(
    new THREE.EdgesGeometry(nextGeometry),
    new THREE.LineBasicMaterial({ color: wireColor })
  )
  bundle.wireframe.visible = state.scene.materialMode !== 'wire'
  bundle.mesh.add(bundle.wireframe)
}

function applyMeshMatrix(mesh, matrix) {
  mesh.matrixAutoUpdate = false
  mesh.matrix.copy(matrix)
  mesh.matrixWorldNeedsUpdate = true
}

function buildCompanionWorldMatrices(baseWorld) {
  const leftOffset = new THREE.Matrix4().makeTranslation(-3.4, 0.3, 1.3)
  const leftRotate = new THREE.Matrix4().makeRotationY(-35 * DEG2RAD)
  const leftScale = new THREE.Matrix4().makeScale(0.8, 0.8, 0.8)

  const rightOffset = new THREE.Matrix4().makeTranslation(2.9, 0.9, -1.4)
  const rightRotate = new THREE.Matrix4().makeRotationX(18 * DEG2RAD)
  const rightTilt = new THREE.Matrix4().makeRotationZ(26 * DEG2RAD)
  const rightScale = new THREE.Matrix4().makeScale(0.65, 0.65, 0.65)

  const leftWorld = leftOffset.clone().multiply(leftRotate).multiply(baseWorld).multiply(leftScale)
  const rightWorld = rightOffset.clone().multiply(rightRotate).multiply(rightTilt).multiply(baseWorld).multiply(rightScale)

  return [leftWorld, rightWorld]
}

function buildDisplayMaterial({ color, emissive, opacity }) {
  switch (state.scene.materialMode) {
    case 'normal':
      return new THREE.MeshNormalMaterial({ transparent: true, opacity })
    case 'checker':
      return new THREE.MeshLambertMaterial({
        color: 0xffffff,
        emissive: 0x111111,
        map: getCheckerTexture(),
        transparent: true,
        opacity,
      })
    case 'wire':
      return new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: Math.max(opacity, 0.95) })
    case 'solid':
    default:
      return new THREE.MeshLambertMaterial({ color, emissive, transparent: true, opacity })
  }
}

function getCheckerTexture() {
  if (checkerTexture) return checkerTexture

  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 128

  const ctx = canvas.getContext('2d')
  const size = 16
  for (let y = 0; y < canvas.height; y += size) {
    for (let x = 0; x < canvas.width; x += size) {
      const even = ((x + y) / size) % 2 === 0
      ctx.fillStyle = even ? '#f2f2f2' : '#2c5f96'
      ctx.fillRect(x, y, size, size)
    }
  }

  checkerTexture = new THREE.CanvasTexture(canvas)
  checkerTexture.wrapS = THREE.RepeatWrapping
  checkerTexture.wrapT = THREE.RepeatWrapping
  checkerTexture.repeat.set(2, 2)
  return checkerTexture
}

// ---- 辅助：构建带颜色的坐标轴（自定义，比 AxesHelper 更粗） ----
function buildAxesHelper(size, lineWidth, scopeLabel, scopeColor, options = {}) {
  const group = new THREE.Group()
  const lineOpacity = options.lineOpacity ?? 1
  const coneOpacity = options.coneOpacity ?? 1
  const labelOpacity = options.labelOpacity ?? 1
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
    const mat = new THREE.LineBasicMaterial({ color: a.color, transparent: true, opacity: lineOpacity })
    const line = new THREE.Line(geo, mat)
    group.add(line)

    // 锥形箭头
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(lineWidth * 3, size * 0.12, 8),
      new THREE.MeshBasicMaterial({ color: a.color, transparent: true, opacity: coneOpacity })
    )
    const end = new THREE.Vector3(...a.dir).multiplyScalar(size)
    cone.position.copy(end)
    // 让锥尖朝向轴方向
    if (a.dir[1] === 0) {
      cone.rotation.z = a.dir[0] !== 0 ? Math.PI / 2 * (a.dir[0] > 0 ? 1 : -1) : 0
      if (a.dir[2] !== 0) cone.rotation.x = Math.PI / 2 * (a.dir[2] > 0 ? -1 : 1)
    }
    group.add(cone)

    const labelSprite = createAxisLabelSprite(a.label, a.color, labelOpacity)
    labelSprite.position.copy(end).add(new THREE.Vector3(...a.dir).multiplyScalar(size * 0.28))
    group.add(labelSprite)
  })

  if (scopeLabel) {
    const scopeBadge = createScopeBadgeSprite(scopeLabel, scopeColor)
    scopeBadge.position.set(size * 0.28, size * 0.28, size * 0.28)
    group.add(scopeBadge)

    if (options.noteText) {
      const noteBadge = createNoteBadgeSprite(options.noteText, scopeColor, labelOpacity)
      noteBadge.position.set(size * 0.42, -size * 0.12, size * 0.15)
      group.add(noteBadge)
    }
  }
  return group
}

function createAxisLabelSprite(text, color, opacity = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 128
  const ctx = canvas.getContext('2d')

  const radius = 18
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.92)`
  roundRect(ctx, 14, 20, 228, 88, radius)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.65)'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 46px Segoe UI, Microsoft YaHei, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 64)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.75, 0.38, 1)
  return sprite
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2)
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + width, y, x + width, y + height, r)
  ctx.arcTo(x + width, y + height, x, y + height, r)
  ctx.arcTo(x, y + height, x, y, r)
  ctx.arcTo(x, y, x + width, y, r)
  ctx.closePath()
}

function createScopeBadgeSprite(text, color) {
  const canvas = document.createElement('canvas')
  canvas.width = 220
  canvas.height = 92
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.88)`
  roundRect(ctx, 10, 12, 200, 68, 16)
  ctx.fill()

  ctx.strokeStyle = 'rgba(255,255,255,0.45)'
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = 'bold 34px Segoe UI, Microsoft YaHei, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 110, 46)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(0.95, 0.4, 1)
  return sprite
}

function createNoteBadgeSprite(text, color, opacity = 1) {
  const canvas = document.createElement('canvas')
  canvas.width = 280
  canvas.height = 100
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.18)`
  roundRect(ctx, 14, 18, 252, 64, 14)
  ctx.fill()

  ctx.strokeStyle = `rgba(${(color >> 16) & 255}, ${(color >> 8) & 255}, ${color & 255}, 0.55)`
  ctx.lineWidth = 2
  ctx.stroke()

  ctx.fillStyle = '#ffffff'
  ctx.font = '600 28px Segoe UI, Microsoft YaHei, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 140, 50)

  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    opacity,
    depthTest: false,
    depthWrite: false,
  })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(1.15, 0.42, 1)
  return sprite
}

export function getScene()    { return scene }
export function getCamera()   { return camera }
export function getRenderer() { return renderer }
export function getControls() { return controls }
export function getMainMesh() { return mainMesh }
