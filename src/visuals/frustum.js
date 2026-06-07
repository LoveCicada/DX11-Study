// ===== 视锥体可视化 =====
// 根据投影参数绘制 Frustum 线框

import * as THREE from 'three'
import { state, on } from '../state/store.js'
import { getCameraPosition } from '../engine/transforms.js'

let frustumGroup = null

export function initFrustum(scene) {
  frustumGroup = new THREE.Group()
  frustumGroup.name = 'frustumHelper'
  scene.add(frustumGroup)

  on('projection-changed', () => updateFrustum())
  on('view-changed', () => updateFrustum())
  on('any-changed', () => {
    frustumGroup.visible = state.ui.showFrustum
  })

  updateFrustum()
}

export function setFrustumVisible(v) {
  if (frustumGroup) frustumGroup.visible = v
  state.ui.showFrustum = v
}

function updateFrustum() {
  if (!frustumGroup) return
  // 清空旧几何
  frustumGroup.clear()

  const { type, fov, aspect, near, far } = state.projection
  const DEG2RAD = Math.PI / 180

  // 视锥体不跟随相机姿态旋转（固定在世界原点仅做示意）
  const color = 0xf7b731

  if (type === 'perspective') {
    const hNear = Math.tan(fov * DEG2RAD / 2) * near
    const wNear = hNear * aspect
    const hFar = Math.tan(fov * DEG2RAD / 2) * far
    const wFar = hFar * aspect

    // 远/近平面角点（相机空间 -Z 方向）
    const pts = {
      n: [
        new THREE.Vector3(-wNear,  hNear, -near),
        new THREE.Vector3( wNear,  hNear, -near),
        new THREE.Vector3( wNear, -hNear, -near),
        new THREE.Vector3(-wNear, -hNear, -near),
      ],
      f: [
        new THREE.Vector3(-wFar,  hFar, -far),
        new THREE.Vector3( wFar,  hFar, -far),
        new THREE.Vector3( wFar, -hFar, -far),
        new THREE.Vector3(-wFar, -hFar, -far),
      ]
    }
    frustumGroup.add(buildFrustumLines(pts.n, pts.f, color))
  } else {
    const dist = state.view.distance
    const halfH = Math.tan(fov * DEG2RAD / 2) * dist
    const halfW = halfH * aspect

    const pts = {
      n: [
        new THREE.Vector3(-halfW,  halfH, -near),
        new THREE.Vector3( halfW,  halfH, -near),
        new THREE.Vector3( halfW, -halfH, -near),
        new THREE.Vector3(-halfW, -halfH, -near),
      ],
      f: [
        new THREE.Vector3(-halfW,  halfH, -far),
        new THREE.Vector3( halfW,  halfH, -far),
        new THREE.Vector3( halfW, -halfH, -far),
        new THREE.Vector3(-halfW, -halfH, -far),
      ]
    }
    frustumGroup.add(buildFrustumLines(pts.n, pts.f, color))
  }

  // 视锥体跟随相机位置和朝向
  const eye = getCameraPosition()
  const target = new THREE.Vector3(0, 0, 0)
  const up = new THREE.Vector3(0, 1, 0)
  const lookMat = new THREE.Matrix4()
  lookMat.lookAt(eye, target, up)
  frustumGroup.position.copy(eye)
  frustumGroup.quaternion.setFromRotationMatrix(lookMat)
}

function buildFrustumLines(nearPts, farPts, color) {
  const points = []
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7 })

  // 近平面矩形
  for (let i = 0; i < 4; i++) {
    points.push(nearPts[i], nearPts[(i + 1) % 4])
  }
  // 远平面矩形
  for (let i = 0; i < 4; i++) {
    points.push(farPts[i], farPts[(i + 1) % 4])
  }
  // 近-远连线
  for (let i = 0; i < 4; i++) {
    points.push(nearPts[i], farPts[i])
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points)
  return new THREE.LineSegments(geo, mat)
}
