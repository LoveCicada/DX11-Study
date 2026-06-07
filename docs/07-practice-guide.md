# 07 — 实操指南：配合网页动手学

## 一句话总结

**先跑起来，再跟着 8 步教学脚本走一遍**，配合坐标追踪和矩阵看板，把文档里的概念变成「看得见、摸得着」的体验。

---

## 启动项目

在项目根目录：

```bash
npm install
npm run dev
```

浏览器打开 http://localhost:5173/

更完整的运行说明见根目录 [README.md](../README.md)。

---

## 网页布局速览

```mermaid
flowchart TB
  subgraph left [左侧面板]
    worldP[World 世界矩阵]
    viewP[View 视图矩阵]
    projP[Projection 投影矩阵]
    trackP[坐标追踪]
  end
  subgraph center [中间]
    viewport[3D 视口 + 视锥体]
  end
  subgraph right [右侧面板]
    matrixB[矩阵数值看板]
    scriptB[教学脚本]
    formulaB[公式说明]
  end
  left --> center
  right --> center
```

---

## 推荐学习路线（约 60 分钟）

| 阶段 | 时间 | 做什么 |
|------|------|--------|
| 1 | 10 min | 读 [00-introduction](./00-introduction.md) + [01-coordinate-spaces](./01-coordinate-spaces.md) |
| 2 | 15 min | 教学脚本 8 步（见下表） |
| 3 | 15 min | 自由调节 + 坐标追踪验证 |
| 4 | 10 min | 读 [05-mvp-pipeline](./05-mvp-pipeline.md)，对照 MVP 矩阵 |
| 5 | 10 min | 切换 DX11 对照模式，读 [06-dx11-vs-webgl](./06-dx11-vs-webgl.md) |

---

## 教学脚本 8 步详解

右侧 **「教学脚本」** → 点 **「开始脚本」**，用「上一步 / 下一步」逐步推进。

| 步骤 | 脚本内容 | 对应文档 | 观察重点 |
|------|----------|----------|----------|
| 1/8 | 模型空间到世界空间，全部重置 | [01](./01-coordinate-spaces.md) [02](./02-world-matrix.md) | 四个矩阵接近单位矩阵，模型在原点 |
| 2/8 | World 平移 tx=3, ty=1, tz=-2 | [02](./02-world-matrix.md) | 世界矩阵**第四列**变化，模型位移 |
| 3/8 | Yaw=45°, Pitch=20°, Scale=1.5 | [02](./02-world-matrix.md) | 3×3 **旋转块**和对角线缩放 |
| 4/8 | 侧视预设 | [03](./03-view-matrix.md) | View 变、World 不变，理解「观察系变换」 |
| 5/8 | pitch=40, distance=16 | [03](./03-view-matrix.md) | 俯视角度、相机距离与 View 矩阵 |
| 6/8 | 透视 FOV=95° | [04](./04-projection-matrix.md) | 广角效果，投影矩阵 f 项 |
| 7/8 | near=2, far=40 | [04](./04-projection-matrix.md) | 近处裁切、视锥体变短 |
| 8/8 | 等轴测 + MVP 总结 | [05](./05-mvp-pipeline.md) | 公式说明切到 MVP 标签 |

每步完成后，看右侧 **公式说明** 对应标签，对照文字描述。

---

## 坐标追踪练习

1. 左侧 **坐标追踪** 输入 `(1, 1, 1)`
2. 点 **「追踪」**
3. 记录五行的数值
4. 只改 World 的 tx → 追踪，确认只有「世界空间」及之后的行变化
5. 只改 View 的 yaw → 确认「相机空间」及之后变化
6. 只改 FOV → 确认「裁剪空间」和 NDC 变化

这是验证 MVP 链最直观的方式。

---

## 矩阵看板技巧

| 按钮 | 用途 |
|------|------|
| **行主序** | 对照数学课本、中文教程公式 |
| **列主序** | 对照 GPU 内存、Three.js elements |
| **2位 / 4位 / 全** | 控制显示精度 |
| **MVP 块** | 验证是否等于 P×V×W |

练习：在 Step 3 完成后，手动心算 M_W 第四列是否约为 (3, 1, -2, 1)（考虑旋转后平移列会更复杂）。

---

## 其他功能

### 演示模式

- 顶栏 **「演示」** 或按 **空格**
- 自动播放预设参数动画，适合复习整体效果

### 视角预设快捷键

| 键 | 视角 |
|----|------|
| 1 | 正视 |
| 2 | 侧视 |
| 3 | 俯视 |
| 4 | 等轴测 |

### 导入 / 导出

- 顶栏 **「导出」**：保存当前全部参数为 JSON
- **「导入」**：恢复之前保存的状态，方便分享实验配置

### 全部重置

- 按 **R** 或顶栏 **「重置」**

---

## 自测清单

学完一遍后，试着不看文档回答：

- [ ] 模型空间和世界空间有什么区别？
- [ ] 世界矩阵由哪三种变换组成？顺序是什么？
- [ ] 为什么说 View 矩阵是相机矩阵的逆？
- [ ] FOV、Near、Far 各自影响什么？
- [ ] MVP 乘法从右到左作用顺序是什么？
- [ ] DX11 和 WebGL 的 NDC 深度范围有什么不同？
- [ ] 行主序和列主序显示的是同一个矩阵吗？

---

## 进一步学习 DX11

文档建立直觉后，建议继续：

1. **DirectXMath** — `XMMatrixTranslation`、`XMMatrixLookAtLH`、`XMMatrixPerspectiveFovLH`
2. **HLSL 顶点着色器** — 常量缓冲上传 WorldViewProjection
3. **MSDN 文档** — 坐标系、视口、深度缓冲

本项目的矩阵数值可作为「手算 / API 输出」的参照基准。

---

## 文档索引

返回 [docs/README.md](./README.md) 查看完整文档目录。
