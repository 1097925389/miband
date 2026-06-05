# Mi Band - 小米手环实时心率监控系统

Mi Band 是一款基于 Web Bluetooth API 开发的轻量级心率监控工具，专为支持“心率广播”的小米手环（如小米手环 10 Pro）设计。无需安装任何软件，直接在浏览器中即可实时查看你的脉搏。

![Mi Band](https://img.shields.io/badge/Status-Live-success)
![Technology](https://img.shields.io/badge/Tech-Web_Bluetooth-blue)

## 🌐 在线预览
**[https://1097925389.github.io/miband/](https://1097925389.github.io/miband/)**

## ✨ 功能特性
- **实时同步**：毫秒级心率数据接收。
- **动态动画**：界面中心的心脏图标随你的真实脉搏跳动，频率自动同步。
- **历史曲线**：实时生成心率波动图表。
- **数据统计**：自动计算单次监测的最高、最低及平均心率。
- **极简设计**：深色模式配以霓虹红视觉设计，高端大气。

## 🚀 快速开始
1. **准备手环**：
   - 打开手环设置 -> 心率 -> 开启 **“心率广播”**。
   - 或者在手环上启动任意一项运动。
2. **访问网页**：
   - 使用最新版的 Chrome 或 Edge 浏览器访问上面的 [预览地址](https://1097925389.github.io/miband/)。
3. **连接设备**：
   - 点击页面下方的 **“连接小米手环”**。
   - 在弹出的窗口中选择你的手环，点击“配对”。
4. **享受监控**：
   - 连接成功后，你将看到心率数据开始实时更新。

## 🛠️ 技术实现
- **Web Bluetooth API**：通过标准的 GATT 心率服务 (UUID `0x180D`) 建立通信。
- **Chart.js**：用于实时渲染平滑的心率波动曲线。
- **CSS3 Animations**：根据实时计算的 BPM 值动态调整心脏跳动速度。

## ⚠️ 注意事项
- **安全要求**：Web Bluetooth API 强制要求在 **HTTPS** 环境或 **localhost** 下运行（GitHub Pages 默认支持 HTTPS）。
- **设备兼容性**：需要电脑硬件支持蓝牙 4.0 (BLE) 或更高版本。

## 📜 开源协议
本项目采用 [MIT License](LICENSE) 许可协议。
