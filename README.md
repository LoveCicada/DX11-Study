# DX11 渲染矩阵可视化教学网页

一个基于 Three.js + 原生 HTML/CSS/JS 的教学网页，用于可视化讲解三维渲染中的三类核心矩阵：
- World（世界矩阵）
- View（视图矩阵）
- Projection（投影矩阵）

## 学习文档

配套通俗图文教程见 [`docs/`](docs/README.md) 目录，推荐学习路径：

1. 阅读 [导读](docs/00-introduction.md) 与 [坐标空间](docs/01-coordinate-spaces.md) 建立整体概念
2. 运行 `npm run dev` 打开交互网页，对照操作
3. 依次阅读 [世界矩阵](docs/02-world-matrix.md) → [视图矩阵](docs/03-view-matrix.md) → [投影矩阵](docs/04-projection-matrix.md) → [MVP 管线](docs/05-mvp-pipeline.md)
4. 按 [实操指南](docs/07-practice-guide.md) 完成 8 步教学脚本
5. 学习 [DX11 与 WebGL 差异](docs/06-dx11-vs-webgl.md)，使用网页「坐标系」开关对照

功能迭代记录见 [模型切换开发记录](docs/08-feature-development-log.md)。

## 功能
- 模型切换：支持立方体、球体、圆柱三种教学模型
- 场景布局：支持单物体 / 三物体对照，演示各自 World 与共享 View/Projection
- 材质模式：支持纯色、法线、棋盘格、线框四种教学视图
- World 参数调节：平移、旋转（Pitch/Yaw/Roll）、缩放
- View 参数调节：相机距离、俯仰、方位、预设视角
- Projection 参数调节：透视/正交、FOV、宽高比、Near/Far
- 矩阵看板：World / View / Projection / MVP 实时数值
- 行/列主序切换：可在矩阵看板中切换 row-major / column-major 展示
- 坐标系对照开关：Web RH 与 DX11 LH 对照展示（教学模式）
- 视锥体可视化：Near/Far 与视锥联动
- 坐标追踪：输入模型空间点，查看到 NDC 的逐步变换，并支持按模型切换多个预置采样点
- 演示模式：自动播放参数脚本
- 教学脚本：按 World -> View -> Projection -> MVP 分步骤讲解，并兼容当前模型类型
- 导入/导出：将当前参数保存为 JSON 并恢复

## 运行
```bash
npm install
npm run dev
```

默认访问：
- http://localhost:5173/

## 构建
```bash
npm run build
npm run preview
```

## 键盘快捷键
- R：全部重置
- Space：开始/停止演示
- 1/2/3/4：切换正视/侧视/俯视/等轴测

## 说明
- 本网页使用 Three.js/WebGL 右手坐标系（Y-up）。
- DX11 常见资料为左手坐标系，数值与深度范围可能不同，但变换链路原理一致。
