# DX11 渲染矩阵可视化教学网页

一个基于 Three.js + 原生 HTML/CSS/JS 的教学网页，用于可视化讲解三维渲染中的三类核心矩阵：
- World（世界矩阵）
- View（视图矩阵）
- Projection（投影矩阵）

## 功能
- World 参数调节：平移、旋转（Pitch/Yaw/Roll）、缩放
- View 参数调节：相机距离、俯仰、方位、预设视角
- Projection 参数调节：透视/正交、FOV、宽高比、Near/Far
- 矩阵看板：World / View / Projection / MVP 实时数值
- 行/列主序切换：可在矩阵看板中切换 row-major / column-major 展示
- 坐标系对照开关：Web RH 与 DX11 LH 对照展示（教学模式）
- 视锥体可视化：Near/Far 与视锥联动
- 坐标追踪：输入模型空间点，查看到 NDC 的逐步变换
- 演示模式：自动播放参数脚本
- 教学脚本：按 World -> View -> Projection -> MVP 分步骤讲解
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
